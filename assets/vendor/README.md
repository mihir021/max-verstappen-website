# Animation libraries

Downloaded 5 November 2026 from the official npm packages through jsDelivr. Browser-ready UMD distributions are used so this local site does not require a build tool.

| File | Package/version | Source |
|---|---|---|
| `gsap.min.js` | GSAP 3.15.1 | https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/gsap.min.js |
| `ScrollTrigger.min.js` | GSAP 3.15.1 | https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/ScrollTrigger.min.js |
| `lenis.min.js` | Lenis 1.3.27 | https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js |
| `lenis.css` | Lenis 1.3.27 | https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.css |

GSAP and ScrollTrigger retain their original copyright/license comments. GSAP uses the Standard No Charge License, not the MIT license: https://gsap.com/community/standard-license/ . See `GSAP-LICENSE-NOTICE.txt`. Lenis is MIT licensed; its complete license is included in `LENIS-LICENSE.txt`.

## Integration

Load the Lenis stylesheet, GSAP core, ScrollTrigger, and Lenis before the application script. Register ScrollTrigger before configuring animations. Use one rendering clock:

```js
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(time => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Keep nested native carousels and modal scrolling outside Lenis handling with a `prevent` callback or the documented `data-lenis-prevent` attribute. Lenis does not support native CSS scroll-snap on its controlled scroller. Stop/destroy smooth scrolling when the site's effective motion preference is off; do not run a second RAF loop for Lenis itself. Use `lenis.scrollTo()` for navigation while it is active. Refresh ScrollTrigger after relevant assets/fonts change measured layout. Cleanup triggers and ticker callbacks when rebuilding a motion setup.

Primary documentation:
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- https://gsap.com/docs/v3/GSAP/gsap.registerPlugin()/
- https://github.com/darkroomengineering/lenis

Verified package metadata: https://registry.npmjs.org/gsap/latest and https://registry.npmjs.org/lenis/latest . Versions here remain pinned even when a newer release becomes available.
