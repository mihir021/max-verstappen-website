# Lando Norris reference: motion audit

Inspected 5 November 2026. This is an implementation reference, not a copy of the original design or source. Main-page HTTP fetching was unavailable, but the browser supplied its linked assets and the public JS/CSS downloaded successfully. The study combined browser observation with the publicly available reference assets.

## Source evidence

- [Live reference](https://landonorris.com/)
- [OFF+BRAND case study](https://www.itsoffbrand.com/our-work/lando-norris): the originating studio identifies Webflow, WebGL, 3D, Rive and motion as project services. It describes cinematic scrolling, transitions, responsive interactions and lazy asset loading.
- [Main public animation bundle](https://lando.itsoffbrand.io/dev-js/lando-by-OFF+BRAND.05.js): Inspected for interaction research only; the reference bundle is not included in this repository.
- [Main public stylesheet](https://cdn.prod.website-files.com/67b5a02dc5d338960b17a7e9/css/lando-offbrand.shared.6e09a725a.css): Inspected for interaction research only; the reference stylesheet is not included in this repository.

## Effects and implementation mapping

| Reference behavior | Direct evidence | Suggested original implementation for Max |
| --- | --- | --- |
| Inertial scrolling synchronized with animation | `createLenisInstance`: interpolation 0.1, wheel smoothing, touch synchronization and 1.25 touch multiplier. GSAP ticker drives Lenis; scroll events update ScrollTrigger. | Use a single animation clock. Native touch scrolling is a sensible mobile fallback. |
| Hero portrait shrinks into a page composition | `data-gl-track` head scene drives viewport-sized plane bounds toward target-element dimensions across one viewport of scrolling. Camera depth and image filtering change simultaneously. | Sticky hero with one normalized scroll progress driving scale, inset, border radius, contrast and typography movement. |
| Cursor reveals another visual layer organically | `fluidCursor` uses advection, external force, divergence, Poisson and pressure passes. Its texture mixes portrait diffuse layers. Simulation resolution is 10% viewport, dissipation 0.96. | A lightweight canvas trail or WebGL mask can reveal an orange-tinted secondary portrait; this should be described as inspired, not the identical fluid simulation. |
| Portrait and helmet follow the pointer | Normalized eased pointer values rotate the portrait/helmet. Head and helmet render to dedicated targets. Cursor influence and helmet opacity fade partway through hero scroll. | Keep the Max image, typography and foreground detail on separate layers with subtle pointer parallax. Do not claim a genuine 3D helmet unless a licensed model is supplied. |
| Menu opens as a full-screen curved wipe | `data-nav-m` starts with a collapsed ellipse clip. Links and images each have their own clip and vertical offset. Two image columns respond to pointer Y in opposite directions with a two-second ease. | Full-screen overlay, ellipse clip transition, staggered links, photo preview and Escape/focus handling. |
| Large headings bloom into view | SplitText 3.13.0 and `data-oval-scroll` split lines/characters. Ellipse masks expand over 1.5 seconds, with 0.15-second line staggering and center-out character offsets. | Overflow-hidden heading lines with translate/clip reveal; stagger by line. Maintain one accessible unsplit heading. |
| Text and image highlights wipe away | `data-anim-high` and `data-img-highlight` generate accent overlays. Text uses a horizontal reveal; images use an elliptical reveal. | Brief burnt-orange mask followed by image scale settling; avoid applying the same reveal to every element. |
| Navigation text rolls on hover | `data-anim='text-hover'` shifts characters upward over 0.6 seconds, 0.02-second stagger, power3 easing. | Duplicate visual text lines and animate one line height; keep duplicate hidden from assistive technology. |
| Horizontal storytelling on desktop | `data-horizontal-section` animates horizontal travel based on total content width, scrub 1. Individual photos add smaller translation within the scrolling container. Enabled from 992px. CSS uses sticky wrappers. | A sticky horizontal milestone/gallery section on desktop, normal vertical cards on mobile. |
| Marquees respond to scrolling | `data-marquee-scroll-direction-target` loops collections and changes direction with scroll; extra position shift follows section progress. | A restrained moving championship/year ribbon with direction response and reduced-motion pause. |
| Helmet grid columns converge while scrolling | `data-helmet-grid` distributes items into four columns with initial offsets of 0/5/10/15rem, scrubbing all back to zero. | Use varied-speed photo columns or a staggered racing-image gallery. |
| Social cards fan out and react to hover | `data-social-callout` uses seven rotation positions from -21 to 21 degrees. Hover lifts/enlarges one card and moves its neighbors with elastic easing. | A smaller, original three-image fan for off-track racing interests. |

## Design observations

Browser inspection showed a giant central portrait, cream field with contour-line pattern, helmet elements moving over the face, a transition to a dark quotation section, and loose editorial photo placement. Reuse the principles of scale, contrast, layered imagery and paced transitions. Give Max a distinct navy/cream/orange identity and original typography/content.

## Guardrails for the build

Support `prefers-reduced-motion`, touch navigation, keyboard focus, and a persistent visible menu control. Keep gallery reading order intact without JavaScript. Avoid brittle replicated 3D assets: the reference relies on custom portrait depth maps, helmet geometry, Rive files and shaders. Use source assets solely for study; do not ship the reference bundle, branding or imagery.

## V2: supplied recording study

A private screen recording was used to study the animation sequence. The recording is not included in this repository or served as website content. The following observations refine the earlier live-site inspection.

| Approximate recording time | Observed motion | V2 interpretation |
|---|---|---|
| 0–1 s and 6.5–11 s | Close portrait fills the opening; pointer movement produces organic transitions between face and helmet. | Two transparent textures mixed through a flowing brush mask, with restrained pointer displacement. |
| 11–17 s | Portrait contracts strongly into a small central card; surrounding field becomes dark; large type and a drawn stroke appear. | A pinned hero timeline coordinates scale, card positioning, background contrast, type and SVG stroke drawing. The stroke is decorative, not an autograph. |
| 18–21 s | Manifesto typography arrives through masks. | Large line-based reveals, preserving a readable document heading. |
| 22–28 s | Unequal photographs and text travel horizontally as one editorial composition. | A wide collage with differing image sizes and local parallax on desktop, with an accessible smaller-screen reading flow. |
| 30–33 s | Large opposing profile objects move across the transition. | Portrait and helmet elements separate as the racing section arrives. |
| 34–44 s | Four helmet columns carry different offsets and move toward a shared composition. | A staggered wall using six official photographs of the same 2025 helmet; labels do not imply six seasons or six distinct designs. |
| 46–49 s | A curved reveal opens into the shop section. | V2 uses a layered off-track photo composition at this point; it does not recreate the merchandise scene. |
| 54–58 s | Seven photographs form a fan and respond individually. | A seven-photo fan with hover/focus emphasis and a simpler touch presentation. |
| 60–65 s | Oversized dark footer closes the sequence. | A dark, large-type finale with clear navigation and credits. |

The supplied recording does not demonstrate an open navigation menu. Menu observations above come from the earlier live-site/source inspection, not this video.

## V2 rendering and source boundaries

`portrait-engine.js` is an original 2D WebGL image compositor. It combines portrait and helmet textures using an advected, decaying low-resolution canvas mask and restrained texture displacement. This creates a fluid-looking reveal and depth-like parallax. It is not the reference site's full fluid solver, a reconstructed 3D model, or a source-code copy. It has a normal-image fallback when WebGL is unavailable. Rendering is driven externally so it can share the application's animation clock.

The portrait and helmet alpha textures were created by AI-assisted background extraction from the supplied local photographs. The portrait request also removed the translucent foreground obstruction across the lower suit. Requested preservation does not establish pixel-for-pixel identity. The untouched sources, per-file credits and exact prompts are retained in `assets/assets-manifest.json`, `assets/helmets/manifest.json` and `research/image-edit-prompts.md`.

Local pinned libraries are GSAP / ScrollTrigger 3.15.1 and Lenis 1.3.27, with distribution notices and source links in `assets/vendor/`. The intended integration uses one GSAP ticker for Lenis and the WebGL renderer, while Lenis scroll events update ScrollTrigger. Native scrolling and reduced motion must remain usable independently of the cinematic desktop timelines.
