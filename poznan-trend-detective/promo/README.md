# Promo videos: Poznań Trend Detective

Two 16:9 videos in the app's own look (warm map background, white cards, Archivo, the app's colours), built from
real footage of the running app, an ElevenLabs voice-over and numbers read from the app's data.

| File | Length | Use |
|---|---|---|
| `out/reklama_pl_16x9.mp4` | 84.6 s | live presentation in Poznań, Polish voice, Polish subtitles burned in |
| `out/submission_30s_en.mp4` | 29.3 s | NASA Space Apps submission (max 30 s), English voice, English subtitles burned in |
| `out/reklama_en_16x9.mp4` | 88.6 s | the long cut in English (same scenes, English app footage), if an English long version is needed |
| `out/*.srt` | | the same subtitles as separate files, if an upload form asks for captions |

Both are H.264, 1920×1080, 30 fps, AAC stereo, loudness normalised to −16 LUFS.

## Voice-over

- Model: **`eleven_v4`** (Eleven v4). On 14 Nov 2026 `GET /v1/models` on this account listed `eleven_v4`, `eleven_v4_turbo`
  and `eleven_v3`; `eleven_v4` is the newest full-quality text-to-speech model, so both cuts use it.
- Polish voice: **"Piotr - lektor PASUJE"** (`o2xdfKUpc1Bwq7RchZuW`), a Polish narrator voice already saved on the account.
- English voice: **"George - Warm, Captivating Storyteller"** (`JBFqnCBsd6RMkjVDRZzb`), an ElevenLabs premade voice.
  Daniel and Brian were tried too; all three read the 66-word script in about 30 s.
- Settings: stability 0.5, similarity 0.8, style 0, speaker boost on; speed 1.0 (PL, EN long) and 1.1 (EN 30 s).
- Credits: the account’s character counter went from 21,958 to 23,562 of 40,775 for all takes and voice tests.
- To fit the 30 s limit, `build.py` shortens the pauses between English sentences to 0.24 s and plays the English take
  at 1.07× (ffmpeg `atempo`, pitch kept). The Polish take is used as recorded, with short pauses added between scenes.
- Narration text: `script_pl.md` (long cut), `script_en.md` (30 s cut, follows `docs/VIDEO_30S.md`) and
  `script_en_long.md` (English long cut, a translation of the Polish one). The Polish hook is the team's own words.
- The music bed is a quiet chord pad generated in `build.py` (no samples, no third-party audio). `--no-music` leaves it out.

## Rebuild

```bash
cd promo
python3 -m venv .venv && .venv/bin/pip install playwright imageio-ffmpeg python-dotenv requests pillow numpy
```

The app must be served at <http://localhost:8742> (or set `APP_URL`). Google Chrome must be installed (Playwright drives
it headless). ffmpeg comes from the `imageio-ffmpeg` package inside the venv; nothing is installed system-wide.

```bash
.venv/bin/python capture.py                 # Polish footage: capture/{clean,timeline,search,draw,layers}_pl
```

```bash
.venv/bin/python capture.py timeline search layers --en    # English footage for the 30 s cut
```

```bash
.venv/bin/python tts.py pl en en_long       # voice-over; reuses the saved take unless the script text changed
```

```bash
.venv/bin/python build.py pl_long           # -> out/reklama_pl_16x9.mp4 (about 15 min)
```

```bash
.venv/bin/python build.py en_30s            # -> out/submission_30s_en.mp4 (stops if it would be over 29.9 s)
```

```bash
.venv/bin/python build.py en_long           # -> out/reklama_en_16x9.mp4
```

`build.py <cut> --stills 3,12.5` renders single frames to `build/<cut>/` for a quick check.
`tts.py` reads `ELEVENLABS_API_KEY` from `promo/.env` and never prints or stores it.

How it fits together: `capture.py` drives the real app in headless Chrome and saves 3840×2160 screenshots.
`build.py` lays the voice-over on a timeline using ElevenLabs' character timestamps, so every scene, highlight and
subtitle starts on the word it belongs to. Then it draws each frame with `stage/index.html` and encodes with ffmpeg.

## Where every number comes from

`build.py` reads these at build time and stops (CHECKS) if the data no longer supports a sentence the voice says.

| Shown | Value | Source |
|---|---|---|
| Built-up share of the 18 municipalities, 1990 / 2020 / 2035 (forecast) | 5.49% / 11.82% / 15.69% | `web/data/land/land.json` `study_built_share_pct` |
| "more than doubled" (voice) | 11.82 / 5.49 = 2.15 | same |
| Model test on 2015–2020 | 56.4% (voice: "56 procent") | `land.json` `model.top_n_hit_rate` = 0.564, `model.tested_on` |
| Summer nights warmed significantly | 94.5% of 2,517 one-km squares, 0% cooled | `web/data/study.json` `pixel_summary.night_sig_warming_share`, `lst_pixels`, `night_sig_cooling_share` |
| Population growth vs summer-day warming | r = 0.68, p = 0.0018, 18 municipalities | `study.json` `growth_correlation.day_lst` (Spearman; growth = population change 2000–2024, `pipeline/analyze.py`) |
| MODIS years | 2000–2024 | `study.json` `years` minus `missing_years.night_lst` |
| Tree-cover loss per year, Theil-Sen, Mann-Kendall | +99.8 ha per decade, p = 0.0008 | `land.json` `forest_loss_trend` (slope recomputed in `build.py` and checked) |
| NISAR pass dates | 38 since June 2026 | `land.json` `nisar_dates` (first 2026-06-18) |
| 30,000 zł car, 1,000,000 zł house | | the team's illustrative hook, not data |
| Everything inside the app's own screens (card, risk score 44/100, checklist, legend, timeline) | | the app itself, captured on 14 Nov 2026 |

The demo address is Armii Poznań 49c, Luboń. Its card says the spot lies in an official PIG-PIB groundwater-flood
area and in a hollow. The video presents this as the official map and the terrain, not as a flood forecast. The
building-risk score is called "a ranking, not a verdict", as in the app.

## Notes and limits

- Captures were made from the app as it was on 14 Nov 2026 around 15:00. If the app or data change, run
  `capture.py` and `build.py` again. `tts.py` is only needed if the script text changes.
- The app geocodes with the public Nominatim service. Early capture runs sent it one request per typed letter and
  were briefly rate-limited (HTTP 429). `capture.py` now answers the geocoder from a fixed copy of the real result
  for the demo address, so captures send no geocoding requests.
- NISAR: the GIBS mosaics mix tile products at zoom 11, so the radar shots use zoom 10 and the 2026-10-28 pass,
  which covers the area most cleanly.
- Generated or downloaded working files (`.venv/`, `capture/`, `build/`) are git-ignored. `out/` holds the deliverables.
