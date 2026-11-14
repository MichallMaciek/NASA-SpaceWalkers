# English narration: long 16:9 cut (about 85 s), translation of script_pl.md

Voice: ElevenLabs, model `eleven_v4`, voice "George - Warm, Captivating Storyteller" (details in `README.md`).
The hook translates the team's own Polish words. 30,000 zł and 1,000,000 zł are illustrative, not data.

Format, read by `tts.py` and `build.py`:
each `## <scene>` section is one scene of the film, each `- ` line is one subtitle and one piece of the voice-over.
After `||` comes the text the voice reads when it differs from the subtitle.
`build.py` re-checks every number against the data (CHECKS section) on each build.

## hook_car
- When you buy a used car for 30,000 złoty, you take it to a diagnostic station: || When you buy a used car for thirty thousand złoty, you take it to a diagnostic station:
- you measure the paint thickness, check the frame geometry and look for oil leaks.

## hook_house
- When you buy a house or a plot for 1,000,000 złoty… || When you buy a house or a plot for a million złoty...
- you look at nice photos on Otodom and take the developer's word for it!
- Nobody does a technical X-ray of the land!

## title
- We built one from satellite data: Poznań Trend Detective.

## search
- Type an address or draw an area, and you get a technical inspection of the land:

## card
- building history and forecast, a building-risk score, trees cut, heat,
- groundwater-flood areas (PIG-PIB), terrain hollows, radar and the price per square metre. || groundwater-flood areas, terrain hollows, radar and the price per square metre.

## timeline
- Around Poznań, built-up land more than doubled in 30 years. || Around Poznań, built-up land more than doubled in thirty years.
- The model shows where the city grows next.
- Tested on years it never saw, it found 56% of new building. || Tested on years it never saw, it found fifty-six percent of new building.
- A ranking, not a verdict.

## heat
- Summer nights warmed significantly almost everywhere, and not one square cooled.
- And the faster a municipality grew, the faster its summer days warmed.

## data
- Data: NASA MODIS, NISAR, Landsat, Sentinel-1, Copernicus DEM, GUS and IMGW. || Data: NASA MODIS, NISAR, Landsat, Sentinel-1, Copernicus DEM, GUS and I-M-G-W.
- Every trend is tested with Mann-Kendall and Theil-Sen.

## close
- Poznań Trend Detective. Check the land before you sign.
