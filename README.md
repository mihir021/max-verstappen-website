# Max Verstappen — Pure Racing Instinct

A responsive, editorial fan website inspired by the scale and animation pacing of [Lando Norris’s website](https://landonorris.com/). Built with HTML, CSS, JavaScript, an original 2D WebGL compositor, and locally hosted GSAP, ScrollTrigger, Lenis and fonts.

## Run locally

Install [Node.js](https://nodejs.org/), open a terminal in the project folder, and run:

```sh
node serve.mjs
```

Open **http://localhost:4173/**. The preview server listens on localhost only. Stop it with `Ctrl+C`. No package installation or build step is needed. `npm start` and `npm run dev` start the same preview. On Windows, `start.cmd` also launches the browser.

Use the HTTP preview for WebGL textures; opening the HTML directly with `file://` can trigger browser texture restrictions. Images, fonts and animation libraries are stored locally. Links to official websites require an internet connection.

## Motion and interaction

- Pointer-driven portrait/helmet reveal, click-to-lock behavior and scroll-driven hero contraction.
- Masked typography, uneven horizontal photo collage and opposing portrait/helmet movement.
- A helmet gallery showing six views of one 2025 design, an off-track photo composition and a seven-photo fan.
- Navigation overlay, image viewer, keyboard focus handling, touch layouts and a persistent motion preference.

The hero uses a **2D WebGL texture compositor** with an advected brush mask and restrained displacement. It approximates the reference interaction; it is not a reconstructed 3D head or helmet and does not include the reference site's models, shaders or animation bundle. The drawn flourish is decorative, not an autograph. Reduced-motion and ordinary-image fallbacks are provided.

## Project files

| Path | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | Content, responsive layout and interaction timelines |
| `portrait-engine.js` | Original WebGL image compositor |
| `assets/` | Images, fonts, animation libraries and attribution manifests |
| `research/` | Source research, motion study, exact image-edit prompts and verification notes |
| `serve.mjs`, `start.cmd` | Local preview server and Windows launcher |

Run `npm run check` to check application/server JavaScript syntax. Use the browser preview to verify visual behavior after changes. Displayed record statistics refer to the **2023 season**, and the championship timeline covers **2021–2024**; this is not a live results feed.

## Images, libraries and attribution

This independent fan concept is unaffiliated with Max Verstappen, Red Bull Racing and Formula 1. The visible **Sources & image credits** dialog and `assets/assets-manifest.json` identify image authors, source pages, licenses and modifications.

The portrait and frontal helmet cutouts are **AI-assisted adaptations** of existing photographs. Background extraction was requested for both; the portrait edit also requested removal of a translucent obstruction across the lower suit. Original image inputs and exact prompts are retained. These are edited textures, not untouched photographs.

Creative Commons images and adaptations retain their stated author, source and license credits. The portrait by Steffen Prößdorf and its cutout adaptation are CC BY-SA 4.0. Some official Honda and Verstappen.com photos have **no open reuse license identified**; their inclusion and attribution do not grant permission to redistribute them. Obtain appropriate permission or replace them before further public or commercial reuse. Individual asset terms apply; this repository does not grant a blanket license over third-party media.

GSAP / ScrollTrigger 3.15.1 use the Standard No Charge GSAP License. Lenis 1.3.27 uses the MIT License. Manrope and Anton use the SIL Open Font License. Original notices and source links are retained with the local distributions.
