"""Voice-over with ElevenLabs text-to-speech (with character timestamps for subtitles and scene timing).

Usage:  .venv/bin/python tts.py pl        -> build/tts/pl.mp3 + build/tts/pl.json   (from script_pl.md)
        .venv/bin/python tts.py en        -> build/tts/en.mp3 + build/tts/en.json   (from script_en.md)
        .venv/bin/python tts.py en_long   -> build/tts/en_long.*                    (from script_en_long.md)
        .venv/bin/python tts.py pl --force   regenerate even if the text did not change (costs credits)

The API key is read from promo/.env (ELEVENLABS_API_KEY) and never printed or written anywhere.
A result is reused while the spoken text, voice, model and settings are unchanged, so rebuilding costs nothing.
"""
import base64, hashlib, json, re, sys
from pathlib import Path
import requests
from dotenv import dotenv_values

HERE = Path(__file__).parent
OUT = HERE / "build" / "tts"
MODEL = "eleven_v4"   # newest TTS model on the account (GET /v1/models, 14 Nov 2026); eleven_v3 is the older one
VOICES = {
    "pl": {"id": "o2xdfKUpc1Bwq7RchZuW", "name": "Piotr - lektor PASUJE", "language_code": "pl", "speed": 1.0},
    # the 30 s cut must stay under 30 s, so the English voice reads a little faster
    "en": {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "George - Warm, Captivating Storyteller", "language_code": "en", "speed": 1.1},
    # English version of the long cut (script_en_long.md), same voice at normal speed
    "en_long": {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "George - Warm, Captivating Storyteller", "language_code": "en", "speed": 1.0},
}
BASE_SETTINGS = {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True}


def parse_script(path):
    """## scene / - subtitle || spoken  ->  [{scene, text, spoken}]"""
    cues, scene = [], None
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            scene = line[3:].strip()
        elif line.startswith("- ") and scene:
            text, _, spoken = line[2:].partition("||")
            cues.append({"scene": scene, "text": text.strip(), "spoken": (spoken or text).strip()})
    return cues


def full_text(cues):
    """one request for the whole cut (natural flow); remember where each cue sits in the text"""
    parts, pos = [], 0
    for c in cues:
        if parts:
            parts.append(" ")
            pos += 1
        c["char0"], c["char1"] = pos, pos + len(c["spoken"])
        parts.append(c["spoken"])
        pos += len(c["spoken"])
    return "".join(parts)


def synth(lang, force=False):
    cues = parse_script(HERE / f"script_{lang}.md")
    text = full_text(cues)
    v = VOICES[lang]
    settings = dict(BASE_SETTINGS, speed=v["speed"])
    req = {"text": text, "model_id": MODEL, "language_code": v["language_code"], "voice_settings": settings}
    key = hashlib.sha256(json.dumps([req, v["id"]], sort_keys=True).encode()).hexdigest()[:16]
    OUT.mkdir(parents=True, exist_ok=True)
    meta_p, mp3_p = OUT / f"{lang}.json", OUT / f"{lang}.mp3"
    if not force and meta_p.exists() and mp3_p.exists() and json.loads(meta_p.read_text()).get("key") == key:
        print(f"{lang}: unchanged, reusing {mp3_p.name} ({len(text)} characters)")
        return
    api_key = dotenv_values(HERE / ".env").get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("ELEVENLABS_API_KEY missing in promo/.env")
    print(f"{lang}: requesting {len(text)} characters from {MODEL}, voice {v['name']}")
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{v['id']}/with-timestamps",
                      params={"output_format": "mp3_44100_128"},
                      headers={"xi-api-key": api_key, "Content-Type": "application/json"}, json=req, timeout=300)
    if r.status_code != 200:
        sys.exit(f"ElevenLabs error {r.status_code}: {r.text[:500]}")
    d = r.json()
    mp3_p.write_bytes(base64.b64decode(d["audio_base64"]))
    al = d.get("alignment") or d.get("normalized_alignment")
    meta = {"key": key, "model": MODEL, "voice_id": v["id"], "voice_name": v["name"], "settings": settings,
            "language_code": v["language_code"], "text": text, "cues": cues, "alignment": al,
            "characters_billed": len(text)}
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    end = al["character_end_times_seconds"][-1] if al else None
    print(f"{lang}: saved {mp3_p.name}, speech ends at {end:.2f} s")


if __name__ == "__main__":
    langs = [a for a in sys.argv[1:] if not a.startswith("--")] or ["pl", "en"]
    for lang in langs:
        synth(lang, force="--force" in sys.argv)
