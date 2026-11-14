# Design plan

## Subject, audience, job
A trend investigation of Poznań and the 17 municipalities around it, built on 25 summers
of NASA MODIS data. Audience: students and curious residents (the challenge's audience),
judged by NASA scientists. Primary job: let someone follow one investigation from question
to verdict, then run their own trend test on any place or 1 km square.

## Concept: the evidence is the picture
The memorable element is the map itself, drawn from the real MODIS pixels. Every square is
one satellite footprint, drawn in its true sinusoidal shape (slightly sheared, not a tidy
web-map grid). No basemap tiles: only the pixels and the municipal borders, so nothing on
screen is decoration. Squares without a statistically significant trend are drawn in grey,
so colour on the map always means "proven".

Everything else stays quiet: one type family, two inks, plain sentences.

## Tokens
Colour (light / dark)
- paper `#F2F3F0` / `#15191C`: cool mineral grey, not cream
- ink `#1E2428` / `#E4E8E9`: slate, not pure black
- ink-2 `#586168` / `#A3ADB3`: secondary text, axes
- line `#CDD2D3` / `#323A3F`: borders, grid
- warm arm (warming) `#F3D3C0 #E4875F #C4442A #8C2416`
- cool arm (cooling) `#C9DCF2 #6AA0DC #2A78D6 #184F95`
- green arm (greening) `#CFE6D3 #7DBB8A #2F8A4F #1D5C33`
- brown arm (browning) `#EADBC6 #C49A62 #8F6230 #5E3D1A`
- not significant `#D9DBD6` / `#3A4246`
- categorical (scatter groups): `#2a78d6` city, `#eb6834` boom suburbs, `#1baf7a` steady suburbs
  (first three slots of the validated reference palette, valid all-pairs)

Type: Archivo (variable width 62–125, weight 100–900), the only family.
- Headlines: width 112, weight 760, tight tracking. Width expresses the subject: the city spreading out.
- Body: width 100, weight 400, 1.05rem/1.6, measure under 68 characters.
- Numbers in charts and stats: width 80, tabular figures.
Scale (1.25): 0.8 / 1 / 1.25 / 1.56 / 1.95 / 2.44 / 3.05 rem.

## Layout
Desktop: a text column (left, ~38rem) scrolls through the investigation while the map stays
pinned on the right. Each step owns one map state; reaching a step swaps the layer. This is
the single orchestrated motion. Below the case: "Run your own test" as a full-width tool.

```
| headline + answer          |                         |
| step: ground truth  chart  |   MAP (sticky)          |
| step: nights        chart  |   layer follows step    |
| step: heat island   chart  |   legend under map      |
| step: days + growth chart  |                         |
| step: green         list   |                         |
| verdict + caveats          |                         |
|------------- run your own test (full width) ---------|
| sources, method, SI statement                         |
```
Mobile: the map sits on top (sticky, 42vh) and steps scroll beneath it.
Left-aligned throughout; no centred blocks.

## Rules for this page
- Colour on the map means a significant trend; grey means "not proven". Same scale for
  night and day so they can be compared.
- Steps are a real sequence, so they are numbered; nothing else is.
- No eyebrow labels, no all-caps, no monospace, no arrows in buttons, no cards with shadows.
- Every number on the page is read from the analysis output, never typed by hand.

## Review against the generic default
A first instinct was a "detective" theme: manila folders, typewriter type, red string on a
cork board. That is a costume that would fit any detective brief, so it was dropped. The
investigation shows up in the structure instead: question, evidence, test, verdict.
A second instinct was a tiled web map with a heat overlay; replaced by drawing raw MODIS
footprints, which is specific to this data and more honest about resolution.
