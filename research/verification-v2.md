# V2 verification notes

During development, the local HTTP preview was checked for the WebGL portrait renderer, hero reveal/lock/contraction, horizontal collage, opposing image transition, helmet hover gallery, image viewer with Escape, menu anchors and motion toggle. No browser console errors were observed in those exercised flows.

A phone-sized CSS viewport was checked for the mobile hero, touch reveal label, image loading and photo-fan bounds; no document-level horizontal overflow was observed. These were targeted desktop-browser and simulated-viewport checks, not all-browser or physical-device certification.

Before public source staging, local HTML references and hash targets were checked, asset manifests were parsed and JavaScript syntax was checked. Repeat the browser checks after changes. Run `npm run check` for the application/server syntax checks.

The hero is an original 2D WebGL texture compositor, not an exact 3D reconstruction. The portrait and frontal helmet alpha textures are AI-assisted adaptations; exact prompts and image-source rights are documented separately.
