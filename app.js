/* Original motion composition. GSAP, Lenis and WebGL share one animation clock. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const body = document.body, header = $('.site-header'), menu = $('.menu-overlay');
  const menuButton = $('.menu-toggle'), motionButton = $('.motion-toggle');
  const frame = $('.portrait-frame'), cursor = $('.cursor');
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('mv-motion'); } catch (_) {}
  let reduced = savedMotion ? savedMotion === 'off' : systemMotion.matches;
  let lenis, scenes, engine, menuTween, storyTrigger, menuOpen = false, activeDialog = null;
  let previousFocus, loaded = false, heroVisible = true, heroProgress = 0;
  const pointer = { x: -100, y: -100, sx: -100, sy: -100 };
  const flowNodes = [$('main'), $('.site-footer'), header, $('.skip-link')];
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  function motionLabel() {
    body.classList.toggle('reduced-motion', reduced);
    motionButton.textContent = `MOTION: ${reduced ? 'OFF' : 'ON'}`;
    motionButton.setAttribute('aria-pressed', String(!reduced));
  }
  motionLabel();
  if (window.MVPortraitEngine) engine = window.MVPortraitEngine($('.hero-canvas'), {
    reducedMotion: reduced, idleReveal: false,
    onReady: ({ success }) => body.classList.toggle('portrait-ready', success)
  });
  frame.addEventListener('pointermove', e => { if (!reduced && e.pointerType !== 'touch') engine?.setPointer(e.clientX, e.clientY); });
  frame.addEventListener('pointerleave', () => engine?.pointerLeave());
  function revealLabel(lock) {
    $('span:last-child', $('.hero-reveal')).textContent = lock ? (innerWidth <= 760 ? 'TAP TO RELEASE HELMET' : 'HELMET LOCKED · CLICK TO RELEASE') : (innerWidth <= 760 ? 'TAP TO REVEAL HELMET' : 'MOVE TO REVEAL · CLICK TO LOCK');
  }
  $('.hero-reveal').addEventListener('click', e => {
    const button = e.currentTarget, lock = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(lock));
    revealLabel(lock);
    engine?.setHelmetReveal(lock ? 1 : 0);
  });
  function lockPage(lock) { body.classList.toggle('locked', lock); if (lock) lenis?.stop(); else lenis?.start(); }
  function setHeader(dark) { header.classList.toggle('dark', dark); }
  function goTo(hash, immediate = false) {
    const target = hash === '#home' ? 0 : $(hash);
    if (target === null) return;
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -65, immediate, duration: 1.35 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'instant' });
    else target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function openMenu() {
    if (menuOpen) return;
    previousFocus = document.activeElement; menuOpen = true; menu.inert = false; menu.style.visibility = 'visible';
    flowNodes.forEach(node => { node.inert = true; });
    body.classList.add('menu-open'); menuButton.setAttribute('aria-expanded', 'true'); lockPage(true);
    menuTween?.kill();
    if (hasGSAP && !reduced) {
      menuTween = gsap.timeline().set(menu, { visibility: 'visible', clipPath: 'ellipse(0% 0% at 98% 3%)' })
        .to(menu, { clipPath: 'ellipse(150% 150% at 98% 3%)', duration: .85, ease: 'power3.inOut' })
        .fromTo('.menu-content nav a', { y: 65, opacity: 0, rotate: 4 }, { y: 0, opacity: 1, rotate: 0, stagger: .065, duration: .8, ease: 'power4.out' }, .3)
        .fromTo('.menu-mosaic', { scale: 1.15, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power3.out' }, .2);
    } else { menu.style.visibility = 'visible'; menu.style.clipPath = 'none'; }
    $('.menu-close').focus({ preventScroll: true });
  }
  function closeMenu(after) {
    if (!menuOpen) { after?.(); return; }
    menuOpen = false; menuButton.setAttribute('aria-expanded', 'false'); menuTween?.kill();
    const finish = () => {
      menu.inert = true; menu.style.visibility = 'hidden';
      flowNodes.forEach(node => { node.inert = false; });
      body.classList.remove('menu-open'); lockPage(false); previousFocus?.focus({ preventScroll: true }); after?.();
    };
    if (hasGSAP && !reduced) menuTween = gsap.to(menu, { clipPath: 'ellipse(0% 0% at 98% 3%)', duration: .65, ease: 'power3.inOut', onComplete: finish });
    else finish();
  }
  menuButton.addEventListener('click', openMenu);
  $('.menu-close').addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', e => {
    if (!menuOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    if (e.key === 'Tab') {
      const items = $$('button,a[href]', menu);
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
    }
  });
  menu.addEventListener('pointermove', e => {
    if (!hasGSAP || reduced || !finePointer.matches) return;
    const shift = (e.clientY / innerHeight - .5) * 55;
    gsap.to('.menu-mosaic>div:first-child', { y: shift, duration: 1.2, overwrite: true });
    gsap.to('.menu-mosaic>div:last-child', { y: -shift, duration: 1.2, overwrite: true });
  });
  $$('a[href^="#"]').forEach(link => link.addEventListener('click', e => {
    const hash = link.getAttribute('href'); if (!hash || hash === '#' || !$(hash)) return;
    e.preventDefault();
    const visit = () => {
      goTo(hash, reduced || hash === '#home'); history.replaceState(null, '', hash);
      if (link.classList.contains('skip-link')) { $(hash).setAttribute('tabindex', '-1'); $(hash).focus({ preventScroll: true }); }
    };
    if (menuOpen) closeMenu(visit); else visit();
  }));
  function openDialog(dialog, trigger) {
    previousFocus = trigger; activeDialog = dialog; dialog.showModal(); lockPage(true);
    $('.dialog-close', dialog).focus({ preventScroll: true });
  }
  $$('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
    const dialog = $('.lightbox'); $('img', dialog).src = button.dataset.lightbox;
    $('img', dialog).alt = button.dataset.caption; $('p', dialog).textContent = button.dataset.caption;
    openDialog(dialog, button);
  }));
  $('[data-open-credits]').addEventListener('click', e => openDialog($('.credits-dialog'), e.currentTarget));
  $$('dialog').forEach(dialog => {
    $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      const b = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => { activeDialog = null; lockPage(false); previousFocus?.focus({ preventScroll: true }); });
  });
  document.addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (reduced || !finePointer.matches || e.pointerType === 'touch') return;
    cursor.classList.add('visible'); const target = e.target.closest('[data-cursor]');
    cursor.classList.toggle('label', Boolean(target)); $('span', cursor).textContent = target?.dataset.cursor || '';
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('visible'));
  $$('a,button').forEach(node => node.addEventListener('focus', () => cursor.classList.remove('visible')));
  if (hasGSAP) $$('.magnetic').forEach(button => {
    button.addEventListener('pointermove', e => {
      if (reduced || !finePointer.matches) return;
      const b = button.getBoundingClientRect();
      gsap.to(button, { x: (e.clientX - b.left - b.width / 2) * .2, y: (e.clientY - b.top - b.height / 2) * .2, duration: .45, ease: 'power3.out', overwrite: true });
    });
    button.addEventListener('pointerleave', () => gsap.to(button, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,.4)' }));
  });
  const cards = $$('.fan-card');
  function lift(card, active) {
    if (reduced || !finePointer.matches) return;
    cards.forEach((item, index) => {
      const selected = item === card;
      item.style.zIndex = active && selected ? '30' : String(10 - Math.abs(index - 3));
      item.style.translate = active ? selected ? '0 -42px' : `${(index - cards.indexOf(card)) * 3}px 0` : '0 0';
      item.style.scale = active && selected ? '1.09' : '1';
    });
  }
  cards.forEach(card => {
    card.addEventListener('pointerenter', () => lift(card, true)); card.addEventListener('pointerleave', () => lift(card, false));
    card.addEventListener('focus', () => lift(card, true)); card.addEventListener('blur', () => lift(card, false));
  });
  $$('.floating-photo button').forEach(button => button.addEventListener('focus', () => {
    if (reduced || innerWidth <= 760 || !storyTrigger) return;
    const photo = button.closest('.floating-photo'), bounds = photo.getBoundingClientRect();
    if (bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight) return;
    const distance = $('.story-track').scrollWidth - innerWidth;
    const progress = Math.max(0, Math.min(1, (photo.offsetLeft + photo.offsetWidth / 2 - innerWidth / 2) / distance));
    const y = storyTrigger.start + progress * (storyTrigger.end - storyTrigger.start);
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }));
  function smoothScroll() {
    lenis?.destroy(); lenis = null;
    if (!reduced && hasGSAP && window.Lenis) {
      lenis = new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false, autoRaf: false, wheelMultiplier: .9,
        prevent: node => Boolean(node.closest('dialog,[data-lenis-prevent]')) || (innerWidth <= 760 && Boolean(node.closest('.story-track'))) });
      lenis.on('scroll', ScrollTrigger.update); if (menuOpen || activeDialog) lenis.stop();
    }
  }
  function buildScenes() {
    if (!hasGSAP) return;
    scenes?.revert(); scenes = gsap.matchMedia(); storyTrigger = null; heroProgress = 0; engine?.setProgress(0);
    $$('[data-count]').forEach(node => { node.textContent = node.dataset.count; });
    scenes.add({ desktop: '(min-width: 761px)', mobile: '(max-width: 760px)', wide: '(min-width: 1101px)' }, context => {
      const desktop = context.conditions.desktop;
      revealLabel($('.hero-reveal').getAttribute('aria-pressed') === 'true');
      gsap.set(frame, { clearProps: 'top,left,opacity,transform' });
      if (!reduced) {
        gsap.set(frame, { top: desktop ? (innerWidth <= 1100 ? '65%' : '64%') : 'auto', left: desktop && innerWidth <= 1100 ? '54%' : '50%', xPercent: -50, yPercent: desktop ? -50 : 0, x: 0, y: 0, scale: 1 });
        const path = $('.hero-flourish path'), length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        const state = { value: 0 };
        const hero = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
          trigger: '.hero-scene', pin: '.hero-stage', start: 'top top', end: () => `+=${innerHeight * (desktop ? 2.15 : 1.35)}`,
          scrub: 1.05, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => { heroProgress = self.progress; if (self.isActive || self.scroll() < self.start) setHeader(self.progress > .2); }
        } });
        hero.to('.hero-intro', { y: -55, opacity: 0, duration: .18 }, 0)
          .to('.hero-meta', { opacity: 0, y: 20, duration: .15, stagger: .012 }, 0)
          .to('.hero-watermark', { opacity: 0, scale: 1.1, duration: .4 }, 0)
          .to('.hero-stage', { backgroundColor: '#162421', duration: .34 }, .12)
          .to('.hero-contours', { color: '#f0f0e9', opacity: .07, rotate: 0, duration: .7 }, .1)
          .to(frame, { scale: desktop ? .41 : .65, ...(desktop ? { top: '49%' } : {}), y: () => desktop ? 0 : -innerHeight * .16, duration: .6, ease: 'power2.inOut' }, .04)
          .to('.hero-marquee', { opacity: 1, duration: .16 }, .25)
          .fromTo('.hero-line.serif', { xPercent: 5 }, { xPercent: -35, duration: .85 }, .15)
          .fromTo('.hero-line.sans', { xPercent: -18 }, { xPercent: 8, duration: .85 }, .15)
          .to(state, { value: 1, duration: .7, onUpdate: () => engine?.setProgress(state.value) }, 0)
          .to('.hero-flourish', { opacity: 1, duration: .1 }, .48)
          .to(path, { strokeDashoffset: 0, duration: .33, ease: 'power1.inOut' }, .48)
          .to('.hero-chapter', { opacity: 1, duration: .1 }, .6)
          .to(frame, { opacity: .78, duration: .2 }, .72).to({}, { duration: .08 }, .92);
        $$('.manifesto-copy>span').forEach((line, index) => gsap.fromTo(line,
          { opacity: .12, y: 55, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', ease: 'none', scrollTrigger: { trigger: '.manifesto', start: `top ${80 - index * 6}%`, end: `top ${40 - index * 6}%`, scrub: .65 } }));
        if (desktop) {
          const track = $('.story-track'), distance = () => Math.max(0, track.scrollWidth - innerWidth);
          const story = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.story-scene', pin: '.story-stage', start: 'top top', end: () => `+=${distance() * 1.1}`, scrub: 1.1, anticipatePin: 1, invalidateOnRefresh: true } });
          storyTrigger = story.scrollTrigger;
          story.to(track, { x: () => -distance(), duration: 1 }, 0).to('.story-progress>span', { width: '100%', duration: 1 }, 0).to('.story-stage', { backgroundColor: '#f0f0e9', duration: 1 }, 0);
          $$('.floating-photo').forEach((photo, index) => {
            story.fromTo(photo, { y: index % 2 ? 55 : -30, rotation: index % 2 ? 2 : -2 }, { y: index % 2 ? -70 : 55, rotation: index % 2 ? -2 : 1, duration: 1 }, 0);
            story.fromTo($('img', photo), { scale: 1.12, yPercent: index % 2 ? -3 : 3 }, { scale: 1.02, yPercent: index % 2 ? 3 : -3, duration: 1 }, 0);
          });
        } else $$('.floating-photo').forEach((photo, index) => gsap.from(photo, { y: index % 2 ? 35 : 65, opacity: .5, duration: .9, scrollTrigger: { trigger: '.story-stage', start: 'top 80%', once: true } }));
        gsap.from('.split-helmet', { xPercent: -55, rotation: -35, ease: 'none', scrollTrigger: { trigger: '.split-scene', start: 'top bottom', end: 'top 12%', scrub: 1 } });
        gsap.from('.split-portrait', { xPercent: 50, rotation: 12, ease: 'none', scrollTrigger: { trigger: '.split-scene', start: 'top bottom', end: 'top 12%', scrub: 1 } });
        gsap.from('.split-links', { y: 100, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.split-scene', start: 'top 70%', end: 'top 15%', scrub: .8 } });
        gsap.fromTo('.race-cover', { clipPath: 'inset(12% 15% 0%)' }, { clipPath: 'inset(0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '.race-scene', start: 'top bottom', end: 'top 10%', scrub: 1 } });
        gsap.to('.race-cover>img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.race-cover', start: 'top bottom', end: 'bottom top', scrub: 1 } });
        $$('[data-count]').forEach(node => {
          const count = { value: 0 };
          gsap.to(count, { value: Number(node.dataset.count), duration: 1.6, ease: 'power3.out', onUpdate: () => { node.textContent = Math.round(count.value); }, scrollTrigger: { trigger: node, start: 'top 90%', once: true } });
        });
        gsap.from('.career-strip article', { y: 35, opacity: 0, duration: .85, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.career-strip', start: 'top 88%', once: true } });
        $$('.helmet-card').forEach((card, index) => {
          const column = index % (desktop ? 3 : 2);
          gsap.from(card, { y: 50 + column * (desktop ? 100 : 35), opacity: .25, rotation: column === 1 ? 3 : -2, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 35%', scrub: .85, invalidateOnRefresh: true } });
        });
        gsap.fromTo('.off-main', { y: 90, rotation: 5 }, { y: -35, rotation: -3, ease: 'none', scrollTrigger: { trigger: '.off-track', start: 'top bottom', end: 'bottom top', scrub: 1.1 } });
        gsap.fromTo('.off-small', { y: 120, rotation: -10 }, { y: -40, rotation: 4, ease: 'none', scrollTrigger: { trigger: '.off-track', start: 'top 75%', end: 'bottom top', scrub: 1.1 } });
        gsap.fromTo('.off-script', { x: -50, y: 100, rotation: -16 }, { x: 35, y: -50, rotation: -8, ease: 'none', scrollTrigger: { trigger: '.off-track', start: 'top bottom', end: 'bottom top', scrub: 1 } });
        const spread = () => desktop ? Math.min(105, innerWidth * .068) : Math.min(15, innerWidth * .038);
        cards.forEach((card, index) => {
          gsap.set(card, { xPercent: -50, zIndex: 10 - Math.abs(index - 3) });
          gsap.fromTo(card, { x: (index - 3) * 3, y: 70, rotation: (index - 3) * .8 }, { x: () => (index - 3) * spread(), y: () => Math.abs(index - 3) * (desktop ? 12 : 9), rotation: (index - 3) * (desktop ? 8 : 5), ease: 'power2.out', scrollTrigger: { trigger: '.fan-deck', start: 'top 90%', end: 'top 35%', scrub: .9, invalidateOnRefresh: true } });
        });
        gsap.from('.footer-portrait img', { yPercent: 35, rotate: -8, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'top 15%', scrub: 1 } });
        gsap.from('.footer-halo', { opacity: 0, scaleX: .3, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top 90%', end: 'top 35%', scrub: 1 } });
        $$('.masked-title').forEach(title => gsap.fromTo($$('span', title), { yPercent: 40, clipPath: 'inset(100% 0 0 0)' }, { yPercent: 0, clipPath: 'inset(0% 0 0 0)', duration: 1.05, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: title, start: 'top 90%', once: true } }));
      } else {
        gsap.set('.race-cover', { clipPath: 'none' });
        cards.forEach((card, index) => gsap.set(card, { xPercent: -50, x: (index - 3) * (desktop ? Math.min(90, innerWidth * .065) : Math.min(15, innerWidth * .038)), y: Math.abs(index - 3) * 10, rotation: (index - 3) * (desktop ? 8 : 5), zIndex: 10 - Math.abs(index - 3) }));
      }
      $$('[data-header-theme]').forEach(section => ScrollTrigger.create({ trigger: section, start: 'top 80px', end: 'bottom 80px', onEnter: () => setHeader(section.dataset.headerTheme === 'dark'), onEnterBack: () => setHeader(section.classList.contains('hero-stage') ? heroProgress > .2 : section.dataset.headerTheme === 'dark') }));
      ScrollTrigger.create({ trigger: '.hero-scene', start: 'top bottom', end: 'bottom top', onToggle: self => { heroVisible = self.isActive; } });
      gsap.to('.reading-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .1 } });
      requestAnimationFrame(() => engine?.resize());
    });
    ScrollTrigger.refresh();
  }
  function setMotion(value, persist = true) {
    const footerVisible = $('.site-footer').getBoundingClientRect().top < innerHeight;
    const remaining = document.documentElement.scrollHeight - scrollY - innerHeight;
    reduced = value; motionLabel(); engine?.setReducedMotion(reduced);
    if (persist) { savedMotion = reduced ? 'off' : 'on'; try { localStorage.setItem('mv-motion', savedMotion); } catch (_) {} }
    smoothScroll(); buildScenes();
    if (footerVisible) { const y = document.documentElement.scrollHeight - innerHeight - remaining; if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }
  }
  motionButton.addEventListener('click', () => setMotion(!reduced));
  systemMotion.addEventListener('change', e => { if (!savedMotion) setMotion(e.matches, false); });
  function tick(time, delta = 16.7) {
    lenis?.raf(time * 1000);
    if (heroVisible && !document.hidden) engine?.render(time);
    if (!reduced && finePointer.matches && cursor.classList.contains('visible')) {
      const blend = 1 - Math.exp(-Math.min(delta, 50) / 55);
      pointer.sx += (pointer.x - pointer.sx) * blend; pointer.sy += (pointer.y - pointer.sy) * blend;
      cursor.style.transform = `translate3d(${pointer.sx - 5}px,${pointer.sy - 4}px,0)`;
    }
  }
  if (hasGSAP) { gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0); }
  else { reduced = true; motionLabel(); engine?.setReducedMotion(true); const loop = t => { tick(t / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { engine?.resize(); window.ScrollTrigger?.refresh(); }, 160); }, { passive: true });
  $('.story-track').addEventListener('scroll', e => {
    if (innerWidth > 760) return;
    const node = e.currentTarget, progress = node.scrollLeft / Math.max(1, node.scrollWidth - node.clientWidth);
    $('.story-progress>span').style.width = `${20 + progress * 80}%`;
  }, { passive: true });
  const counter = { value: 0 };
  if (hasGSAP && !reduced) gsap.to(counter, { value: 90, duration: 1.25, ease: 'power2.out', onUpdate: () => { $('.loader-count').textContent = String(Math.floor(counter.value)).padStart(2, '0'); $('.loader-progress').style.width = `${counter.value}%`; } });
  const assetsReady = Promise.allSettled([document.fonts.ready, $('.portrait-fallback').decode(), ...$$('.helmet-card-image>img').map(img => img.decode())]);
  Promise.race([assetsReady, new Promise(resolve => setTimeout(resolve, 2400))]).then(() => {
    if (loaded) return;
    loaded = true; smoothScroll(); buildScenes(); body.classList.add('loaded');
    $('.loader-count').textContent = '100'; $('.loader-progress').style.width = '100%';
    if (hasGSAP && !reduced) {
      gsap.killTweensOf(counter);
      gsap.timeline({ onComplete: () => { $('.loader').hidden = true; } })
        .to('.loader-mark', { y: -50, opacity: 0, duration: .45, ease: 'power3.in' })
        .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' }, .15);
    } else $('.loader').hidden = true;
    if (location.hash && $(location.hash)) requestAnimationFrame(() => goTo(location.hash, true));
  });
  window.addEventListener('load', () => { if (loaded && hasGSAP) ScrollTrigger.refresh(); }, { once: true });
})();
