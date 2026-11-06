/*
 * Original portrait compositor for the MV editorial concept.
 * WebGL image displacement + a small, advected canvas brush field.
 * Rendering is externally clocked: this module never schedules its own RAF.
 */
(function () {
  'use strict';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const VERTEX = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * .5 + .5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  const FRAGMENT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPortrait;
    uniform sampler2D uHelmet;
    uniform sampler2D uMask;
    uniform vec2 uSurface;
    uniform vec2 uMaskSize;
    uniform vec2 uCover;
    uniform vec2 uPortraitCenter;
    uniform vec2 uPointer;
    uniform vec4 uHelmetRect;
    uniform vec3 uBackground;
    uniform float uTime;
    uniform float uProgress;
    uniform float uHasHelmet;
    uniform float uWhiteKey;
    uniform float uMotion;
    uniform float uHelmetOpacity;
    uniform float uRevealLock;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float softNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(noise(i), noise(i + vec2(1.0, 0.0)), f.x),
                 mix(noise(i + vec2(0.0, 1.0)), noise(i + 1.0), f.x), f.y);
    }
    void main() {
      float activity = (1.0 - smoothstep(.22, .68, uProgress)) * uMotion;
      vec2 pixel = 1.0 / max(uSurface, vec2(1.0));
      vec2 maskPixel = 1.0 / uMaskSize;
      float field = texture2D(uMask, vUv).r;
      vec2 gradient = vec2(
        texture2D(uMask, vUv + vec2(maskPixel.x, 0.0)).r - texture2D(uMask, vUv - vec2(maskPixel.x, 0.0)).r,
        texture2D(uMask, vUv + vec2(0.0, maskPixel.y)).r - texture2D(uMask, vUv - vec2(0.0, maskPixel.y)).r
      );
      float turbulence = softNoise(vUv * 35.0 + vec2(uTime * .19, -uTime * .13));
      float reveal = max(smoothstep(.11, .48, field + (turbulence - .5) * .13 * field) * activity,
                         uRevealLock * (1.0 - smoothstep(.22, .68, uProgress)));
      float edge = 4.0 * reveal * (1.0 - reveal);
      float faceDepth = exp(-dot((vUv - vec2(.5, .59)) * vec2(1.8, 1.3), (vUv - vec2(.5, .59)) * vec2(1.8, 1.3)));
      vec2 gaze = uPointer * pixel * (1.0 + faceDepth * 2.0) * activity;
      vec2 flow = gradient * pixel * 2.5 * activity;
      flow += vec2(sin(vUv.y * 52.0 + uTime * .7), cos(vUv.x * 47.0 - uTime * .5)) * pixel * edge * .7;
      vec2 sceneUv = vUv + gaze + flow;
      vec2 portraitUv = (sceneUv - .5) * uCover + uPortraitCenter;
      vec4 source = texture2D(uPortrait, clamp(portraitUv, .001, .999));
      vec3 original = source.rgb;
      float luminance = dot(original, vec3(.2126, .7152, .0722));
      vec3 monochrome = vec3(luminance) * vec3(.95, 1.0, 1.015);
      float desaturation = mix(.86 * (1.0 - reveal), .12, uHasHelmet) * (1.0 - uProgress * .65);
      vec3 portrait = mix(original, monochrome, desaturation);
      // The fallback reveal returns natural colour, rather than inventing another face.
      portrait += vec3(.035, .012, -.007) * reveal * (1.0 - uHasHelmet);

      vec2 helmetUv = (sceneUv - uHelmetRect.xy) / uHelmetRect.zw;
      float inHelmet = step(0.0, helmetUv.x) * step(helmetUv.x, 1.0) * step(0.0, helmetUv.y) * step(helmetUv.y, 1.0);
      vec4 helmet = texture2D(uHelmet, clamp(helmetUv, .001, .999));
      float white = min(helmet.r, min(helmet.g, helmet.b));
      float key = 1.0 - smoothstep(.945, .995, white) * uWhiteKey;
      float helmetAlpha = helmet.a * key * inHelmet * reveal * uHasHelmet * uHelmetOpacity;
      float outputAlpha = source.a * (1.0 - helmetAlpha) + helmetAlpha;
      // Image uploads are straight-alpha. Composite in premultiplied space for
      // the transparent WebGL drawing buffer, preserving soft hair/helmet edges.
      vec3 colour = portrait * source.a * (1.0 - helmetAlpha) + helmet.rgb * helmetAlpha;
      // A restrained wet-edge highlight keeps the reveal dimensional at 1–3px displacement.
      colour += vec3(.025, .021, .015) * edge * activity * outputAlpha;
      gl_FragColor = vec4(clamp(colour, 0.0, outputAlpha), outputAlpha);
    }
  `;

  window.MVPortraitEngine = function MVPortraitEngine(canvas, options = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('MVPortraitEngine requires a canvas.');
    let gl = null, program = null, buffer = null, uniforms = {}, textures = [];
    let portraitImage = null, helmetImage = null;
    let ready = false, destroyed = false, contextLost = false, notified = false;
    let reducedMotion = Boolean(options.reducedMotion), progress = 0, lastTime = null, maskDirty = true;
    let helmetRevealTarget = 0, helmetRevealCurrent = 0;
    let surface = { width: 1, height: 1 };
    let bounds = null;
    const pointer = { x: .5, y: .43, sx: .5, sy: .43, px: .5, py: .43, active: false };
    const mask = document.createElement('canvas');
    const feedback = document.createElement('canvas');
    const maskCtx = mask.getContext('2d', { alpha: false });
    const feedbackCtx = feedback.getContext('2d', { alpha: false });
    const helmetRect = { x: .08, y: -.015, w: .95, h: .65, ...(options.helmetRect || {}) };
    const portraitPosition = { x: .5, y: .5, ...(options.portraitPosition || {}) };
    const portraitScale = Math.max(.5, Number(options.portraitScale) || 1);
    const colour = options.backgroundColor || '#eeece5';
    const rgb = /^#[a-f\d]{6}$/i.test(colour) ? [1, 3, 5].map(i => parseInt(colour.slice(i, i + 2), 16) / 255) : [.933, .925, .898];

    function notify(success, error) {
      if (notified || destroyed) return;
      notified = true;
      if (typeof options.onReady === 'function') options.onReady({ success, renderer: success ? 'webgl' : 'fallback', engine: api, error });
    }
    function fallback(error) {
      ready = false;
      canvas.classList.remove('ready');
      canvas.dataset.renderer = 'fallback';
      notify(false, error && error.message ? error.message : String(error || 'WebGL unavailable'));
    }
    function shader(type, source) {
      const compiled = gl.createShader(type);
      gl.shaderSource(compiled, source);
      gl.compileShader(compiled);
      if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(compiled);
        gl.deleteShader(compiled);
        throw new Error(error || 'Portrait shader compilation failed.');
      }
      return compiled;
    }
    function createTexture(unit) {
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      return texture;
    }
    function uploadImage(image, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    function buildGL() {
      const vertex = shader(gl.VERTEX_SHADER, VERTEX);
      const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Portrait program linking failed.');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      textures = [0, 1, 2].map(createTexture);
      ['Portrait', 'Helmet', 'Mask', 'Surface', 'MaskSize', 'Cover', 'PortraitCenter', 'Pointer', 'HelmetRect', 'Background', 'Time', 'Progress', 'HasHelmet', 'WhiteKey', 'Motion', 'HelmetOpacity', 'RevealLock'].forEach(name => uniforms[name] = gl.getUniformLocation(program, 'u' + name));
      gl.uniform1i(uniforms.Portrait, 0);
      gl.uniform1i(uniforms.Helmet, 1);
      gl.uniform1i(uniforms.Mask, 2);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      if (portraitImage) uploadImage(portraitImage, 0);
      if (helmetImage) uploadImage(helmetImage, 1);
      maskDirty = true;
    }
    function resetMask() {
      if (!maskCtx || !feedbackCtx) return;
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.globalAlpha = 1;
      maskCtx.fillStyle = '#000';
      maskCtx.fillRect(0, 0, mask.width, mask.height);
      feedbackCtx.fillStyle = '#000';
      feedbackCtx.fillRect(0, 0, feedback.width, feedback.height);
      maskDirty = true;
    }
    function resize() {
      if (destroyed) return;
      bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, canvas.clientWidth || bounds.width);
      const height = Math.max(1, canvas.clientHeight || bounds.height);
      surface = { width, height };
      const dpr = Math.min(window.devicePixelRatio || 1, 2, 1600 / width);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const maskWidth = Math.round(Math.min(320, 320 * width / height));
      const maskHeight = Math.round(Math.min(320, 320 * height / width));
      if (mask.width !== maskWidth || mask.height !== maskHeight) {
        mask.width = feedback.width = Math.max(96, maskWidth);
        mask.height = feedback.height = Math.max(96, maskHeight);
        resetMask();
      }
      if (gl && !contextLost) gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function setPointer(clientX, clientY) {
      if (destroyed || reducedMotion) return;
      // Refreshing the rect here also handles a scroll-scaled outer frame.
      bounds = canvas.getBoundingClientRect();
      pointer.x = clamp((clientX - bounds.left) / Math.max(1, bounds.width));
      pointer.y = clamp((clientY - bounds.top) / Math.max(1, bounds.height));
      pointer.active = true;
    }
    function pointerLeave() { pointer.active = false; }
    function setProgress(value) { progress = clamp(Number(value) || 0); }
    function setHelmetReveal(value = 0) { helmetRevealTarget = clamp(Number(value) || 0); }
    function setReducedMotion(value) {
      reducedMotion = Boolean(value);
      if (reducedMotion) { pointer.active = false; pointer.sx = .5; pointer.sy = .5; resetMask(); }
      lastTime = null;
    }
    function brush(x, y, radius, alpha) {
      if (!maskCtx) return;
      const gradient = maskCtx.createRadialGradient(x, y, radius * .05, x, y, radius);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(.36, `rgba(255,255,255,${alpha * .88})`);
      gradient.addColorStop(.75, `rgba(255,255,255,${alpha * .35})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    function updateMask(time, dt) {
      const frames = clamp(dt * 60, .1, 3);
      const w = mask.width, h = mask.height;
      const dx = (Math.sin(time * .44) * .12 + (pointer.sx - pointer.px) * w * .12) * frames;
      const dy = (-.13 + Math.cos(time * .33) * .06) * frames;
      feedbackCtx.globalAlpha = 1;
      feedbackCtx.fillStyle = '#000';
      feedbackCtx.fillRect(0, 0, w, h);
      feedbackCtx.globalAlpha = Math.pow(.968, frames);
      feedbackCtx.filter = 'blur(0.45px)';
      feedbackCtx.drawImage(mask, dx, dy);
      feedbackCtx.filter = 'none';
      maskCtx.globalCompositeOperation = 'copy';
      maskCtx.globalAlpha = 1;
      maskCtx.drawImage(feedback, 0, 0);
      maskCtx.globalCompositeOperation = 'source-over';
      if (pointer.active) {
        const distance = Math.hypot((pointer.sx - pointer.px) * w, (pointer.sy - pointer.py) * h);
        const steps = Math.min(12, Math.max(1, Math.ceil(distance / 3)));
        const radius = Math.min(w, h) * (.105 + Math.min(distance / 160, .09));
        for (let i = 1; i <= steps; i++) {
          const mix = i / steps;
          brush((pointer.px + (pointer.sx - pointer.px) * mix) * w, (pointer.py + (pointer.sy - pointer.py) * mix) * h, radius, .38);
        }
      }
      // An irregular partial reveal demonstrates the interaction before the first pointer move.
      if (options.idleReveal !== false && progress < .5) {
        const centerX = helmetRect.x + helmetRect.w * .5;
        const centerY = helmetRect.y + helmetRect.h * .43;
        for (let i = 0; i < 3; i++) {
          const phase = time * (.21 + i * .035) + i * 2.1;
          const x = centerX + Math.sin(phase) * helmetRect.w * .29;
          const y = centerY + Math.cos(phase * 1.17) * helmetRect.h * .29;
          const radius = Math.min(w, h) * (.085 + .018 * Math.sin(time * .6 + i));
          brush(x * w, y * h, radius, .12 * frames * (pointer.active ? .32 : 1));
        }
      }
      pointer.px = pointer.sx; pointer.py = pointer.sy;
      maskDirty = true;
    }
    function render(seconds = 0) {
      if (!ready || destroyed || contextLost || !gl) return;
      const time = Number.isFinite(seconds) ? seconds : 0;
      const dt = lastTime === null ? 1 / 60 : clamp(time - lastTime, 0, .05);
      lastTime = time;
      helmetRevealCurrent = reducedMotion ? helmetRevealTarget : helmetRevealCurrent + (helmetRevealTarget - helmetRevealCurrent) * (1 - Math.exp(-dt * 9));
      if (!reducedMotion) {
        const response = 1 - Math.exp(-dt * 10);
        pointer.sx += ((pointer.active ? pointer.x : .5) - pointer.sx) * response;
        pointer.sy += ((pointer.active ? pointer.y : .43) - pointer.sy) * response;
        if (progress < .75) updateMask(time, dt);
      }
      gl.useProgram(program);
      if (maskDirty) { uploadImage(mask, 2); maskDirty = false; }
      const imageAspect = portraitImage.naturalWidth / portraitImage.naturalHeight;
      const surfaceAspect = surface.width / surface.height;
      const cover = surfaceAspect > imageAspect ? [1, imageAspect / surfaceAspect] : [surfaceAspect / imageAspect, 1];
      gl.uniform2f(uniforms.Surface, surface.width, surface.height);
      gl.uniform2f(uniforms.MaskSize, mask.width, mask.height);
      gl.uniform2f(uniforms.Cover, cover[0] / portraitScale, cover[1] / portraitScale);
      gl.uniform2f(uniforms.PortraitCenter, clamp(portraitPosition.x), 1 - clamp(portraitPosition.y));
      gl.uniform2f(uniforms.Pointer, (pointer.sx - .5) * 2, (.5 - pointer.sy) * 2);
      gl.uniform4f(uniforms.HelmetRect, helmetRect.x, 1 - helmetRect.y - helmetRect.h, Math.max(.01, helmetRect.w), Math.max(.01, helmetRect.h));
      gl.uniform3f(uniforms.Background, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(uniforms.Time, time);
      gl.uniform1f(uniforms.Progress, progress);
      gl.uniform1f(uniforms.HasHelmet, helmetImage ? 1 : 0);
      gl.uniform1f(uniforms.WhiteKey, options.helmetWhiteKey ? 1 : 0);
      gl.uniform1f(uniforms.Motion, reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.HelmetOpacity, clamp(options.helmetOpacity === undefined ? 1 : options.helmetOpacity));
      gl.uniform1f(uniforms.RevealLock, helmetRevealCurrent);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function loadImage(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        if (/^https?:/i.test(url)) image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load portrait texture: ${url}`));
        image.src = url;
      });
    }
    function onContextLost(event) {
      event.preventDefault(); contextLost = true; ready = false;
      canvas.classList.remove('ready'); canvas.dataset.renderer = 'fallback';
    }
    function onContextRestored() {
      if (destroyed || !portraitImage) return;
      try {
        contextLost = false; buildGL(); resize(); ready = true; render(0);
        canvas.classList.add('ready'); canvas.dataset.renderer = 'webgl';
      } catch (error) { fallback(error); }
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true; ready = false;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (gl && !contextLost) {
        textures.forEach(texture => gl.deleteTexture(texture));
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      canvas.classList.remove('ready'); canvas.dataset.renderer = 'destroyed';
      mask.width = feedback.width = 1; mask.height = feedback.height = 1;
    }
    const api = { resize, setPointer, pointerLeave, setProgress, setHelmetReveal, setReducedMotion, render, destroy, get ready() { return ready; } };
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
      if (!gl || !maskCtx || !feedbackCtx) { fallback(new Error('WebGL or canvas drawing unavailable.')); return api; }
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);
      buildGL(); resize();
      const primary = loadImage(options.portraitUrl || 'assets/max-portrait-cutout.png');
      const helmetUrl = options.helmetUrl === null ? null : (options.helmetUrl || 'assets/helmets/front-cutout.png');
      const secondary = helmetUrl ? loadImage(helmetUrl).catch(() => null) : Promise.resolve(null);
      Promise.all([primary, secondary]).then(images => {
        if (destroyed || contextLost) return;
        portraitImage = images[0]; helmetImage = images[1];
        try {
          uploadImage(portraitImage, 0);
          if (helmetImage) uploadImage(helmetImage, 1);
          ready = true; render(0);
          canvas.classList.add('ready'); canvas.dataset.renderer = 'webgl';
          notify(true);
        } catch (error) { fallback(error); }
      }).catch(fallback);
    } catch (error) { fallback(error); }
    return api;
  };
})();
