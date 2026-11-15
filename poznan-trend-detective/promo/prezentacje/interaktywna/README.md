# SARnik: interaktywny pitch na 3 minuty

Prezentacja w przeglądarce: **Spacja** to kolejny krok, kamera przybliża prawdziwe zrzuty aplikacji (karta adresu,
werdykt, punkty przeglądu, mapy radaru). 20 kroków (challenge, problem, liczby, demo), ok. 9 s każdy.

**Publiczny link: na razie brak (decyzja zespołu).** Hosting czeka na **MichallMaciek**, właściciela repo: tylko on może
włączyć GitHub Pages (Settings → Pages → Source: „GitHub Actions”). Wtedy pitch będzie pod
https://michallmaciek.github.io/NASA-SpaceWalkers/pitch/. Do tego czasu uruchamiamy go lokalnie:

```bash
cd poznan-trend-detective/promo/prezentacje/interaktywna && python3 -m http.server 8000
```

potem http://localhost:8000 (link do konkretnego kroku: `http://localhost:8000/#8`). Nie publikuj pitchu pod innymi
publicznymi adresami (raw.githack, htmlpreview, Firebase itp.), dopóki MichallMaciek się nie odezwie.

## Sterowanie

| Klawisz | Co robi |
|---|---|
| Spacja, →, ↓, Enter, PageDown, klik | dalej (pilot do prezentacji też działa) |
| ←, ↑, Backspace, PageUp, klik w lewą ćwiartkę | wstecz |
| Home / End | początek / koniec |
| F | pełny ekran |
| N | notatki prelegenta (co powiedzieć w tym kroku) |
| T | licznik czasu do 3:00 (żółty od 2:30, czerwony po 3:00) |
| ? | pomoc |

## Dla agentów: jak zmienić prezentację

Wystarczy zmienić pliki w tym folderze i zrobić push do `main`. Workflow `.github/workflows/pitch-pages.yml` opublikuje
je na GitHub Pages w ok. minutę, gdy MichallMaciek włączy Pages (do tego czasu kończy się na zielono i nic nie wdraża). Nie trzeba logowania do
Firebase ani żadnych kluczy: wystarczy prawo do pusha w repo (albo pull request zmergowany do `main`).

1. **Treść:** `steps.js`. Każdy krok to jeden obiekt w `STEPS`; opis pól jest na górze pliku. Najczęstsze zmiany:
   - tekst: `title`, `sub`, `kicker`, `lines`, a notatka prelegenta w `note`;
   - kadr kamery: `view: [x, y, szer, wys]` w pikselach CSS aplikacji (zrzut 1920 × 1080) albo karty (szerokość 380);
   - podświetlenie: `focus: [x, y, szer, wys]`, `round: true` dla koła;
   - układ: `layout: "full" | "side" | "cover"`.
2. **Obrazy:** `img/`, wpisane w `IMAGES` w `steps.js` razem z `base` (szerokość układu współrzędnych: 1920 dla
   zrzutu aplikacji, 380 dla karty). Nowe zrzuty robi `promo/capture_hires.py` (aplikacja musi działać lokalnie;
   skrypt nie wysyła zapytań do wyszukiwarki adresów). Trzymaj JPG, szerokość do ok. 5800 px, plik do 2 MB.
3. **Silnik:** `index.html` (kamera, klawisze, licznik). Bez bibliotek i bez kroku budowania.
4. **Sprawdzenie przed pushem:** w tym folderze `python3 -m http.server 8000`, otwórz `http://localhost:8000`
   i przejdź wszystkie kroki spacją. Konsola przeglądarki ma być pusta. Workflow sprawdza też składnię `steps.js`.
5. **Push do `main`**, potem zakładka Actions → „Pitch na GitHub Pages” → zielony znaczek = strona zaktualizowana.

## Zasady treści

- Liczby tylko z aplikacji i z sekcji „Dowody” w głównym `README.md` repo (testy 1–4) albo z `web/data`.
  Nic nie zaokrąglaj w górę i nie dopisuj liczb bez źródła.
- 3 minuty: ok. 20 kroków. Dodajesz krok, to inny usuń.
- Wygląd aplikacji: Archivo, papier mapy `#F1F0EB`, dwa odcienie tekstu, kolor tylko tam, gdzie znaczy dane.
  Bez wersalików, bez monospace, bez kart z cieniem, bez „kostiumów” (patrz `poznan-trend-detective/docs/DESIGN.md`).
- Nie wpisuj tu żadnych haseł, tokenów ani kluczy: repo jest publiczne.

## Gdy coś nie działa

- GitHub Pages 404: właściciel repo (MichallMaciek) włącza je raz w Settings → Pages → Source: „GitHub Actions”,
  potem Actions → „Pitch na GitHub Pages” → Run workflow. Do tego czasu tylko lokalnie.
- Workflow czerwony: kliknij go w zakładce Actions; najczęściej błąd składni w `steps.js` (brak przecinka).
- Obraz się nie wczytuje: ścieżka w `IMAGES` musi zgadzać się z nazwą pliku w `img/` (wielkość liter ma znaczenie).
