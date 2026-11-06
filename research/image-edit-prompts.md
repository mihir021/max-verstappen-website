# V2 image edit provenance

The two transparent textures below were created with `image_gen`, using `transparent_background: true`. Each was edited from an existing photograph. The original source images remain unchanged in the project. Generated PNGs were copied into the assets directory with no post-generation crop, resize or other pixel edits.

These are AI-assisted adaptations, not untouched photographs. The prompts describe the requested preservation; they do not establish pixel-for-pixel identity with the source. Original-source rights and credits still apply.

## Portrait cutout

- Input: `assets/max-portrait.jpg` — Steffen Prößdorf’s portrait from the 2024 Dutch Grand Prix, CC BY-SA 4.0.
- Output: `assets/max-portrait-cutout.png` — 1209 × 1301, RGBA.
- [Original source](https://commons.wikimedia.org/wiki/File:2024-08-25_Motorsport,_Formel_1,_Großer_Preis_der_Niederlande_2024_STP_3973_by_Stepro_(portrait_cropped).jpg) · [License](https://creativecommons.org/licenses/by-sa/4.0/)
- Requested changes: background extraction and removal of the translucent foreground obstruction on the lower suit.

Exact prompt:

```text
Use case: background-extraction. Edit target: the supplied existing photograph of Max Verstappen. Create a precise transparent-background cutout of the SAME photographed person for a website hero. Remove only the colored backdrop and the translucent diagonal foreground obstruction across the lower suit. Preserve the face, gaze, hair, skin texture, head angle, natural lighting, body pose, racing suit and all original logos as exactly as possible; no beautification, no new features, no stylization, no invented text. Keep the same portrait framing, with complete hair at top and shoulders/suit to the lower image edge. Maintain realistic fine hair edges. Actual alpha transparency around the person, no white background, no shadow, no outline. This is a cutout/edit, not a new portrait.
```

## Frontal helmet cutout

- Input: `assets/helmets/front.jpg` — official Verstappen.com 2025 season helmet photograph, 640 × 425. No open reuse license was identified.
- Output: `assets/helmets/front-cutout.png` — 1539 × 1022, RGBA.
- [Official gallery](https://news.verstappen.com/en/gallerydetail/615) · [Source photograph](https://news.verstappen.com/img/2025/Seizoenshelm_2025/18DK241393-Edit-newv2-19a.jpg)
- Requested changes: removal of the grey studio backdrop and cast shadow.

Exact prompt:

```text
Use case: background-extraction. Asset type: transparent texture for a racing website's helmet reveal. EDIT the supplied exact frontal Max Verstappen helmet photograph. Remove the grey studio background and cast shadow only; preserve this helmet exactly: same frontal angle, shape, closed visor, red-white-blue paint scheme and all existing logos/text. Do not redesign it, do not invent details, do not change sponsor logos. Make a crisp high quality alpha cutout of just the helmet, centered and tightly framed with about 5% transparent padding on all four sides. Preserve highlights and realistic material. Actual transparent background, no pedestal, no outline, no added shadows. Maintain width-to-height of the actual helmet.
```

## Rendering distinction

The hero is an original 2D WebGL compositor that mixes image textures through a procedural fluid-like mask. Pointer motion and scroll animate its layers. It does not contain a reconstructed 3D head or helmet model, and it does not ship the reference site's custom model or shaders.
