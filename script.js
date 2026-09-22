const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];

document.getElementById('year').textContent = new Date().getFullYear();

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasHover = matchMedia('(hover:hover)').matches;

/* ---------------------------------------------------------------
   Specular highlight on every glass panel — tracks the pointer via
   --mx/--my, consumed by the ::before spotlight in styles.css.
   This is the one signature "liquid glass" interaction.
--------------------------------------------------------------- */
if (hasHover) {
  $$('.glass').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

/* Soft trailing glow that drifts behind the glass, echoing depth */
const glow = $('#cursorGlow');
if (glow && !reduceMotion) {
  let mx = innerWidth/2, my = innerHeight*.3, gx = mx, gy = my;
  window.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
  (function raf(){
    gx += (mx-gx)*.07; gy += (my-gy)*.07;
    glow.style.transform = `translate(${gx-260}px, ${gy-260}px)`;
    requestAnimationFrame(raf);
  })();
}

/* ---------------------------------------------------------------
   Hero photo — subtle pointer-tracked tilt, depth to match the
   glass specular highlight already happening on hover.
--------------------------------------------------------------- */
const heroPhotoWrap = $('.hero-photo-wrap');
if (heroPhotoWrap && hasHover && !reduceMotion) {
  heroPhotoWrap.addEventListener('pointermove', e => {
    const r = heroPhotoWrap.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    heroPhotoWrap.style.transform = `perspective(900px) rotateY(${px*7}deg) rotateX(${py*-7}deg)`;
  });
  heroPhotoWrap.addEventListener('pointerleave', () => {
    heroPhotoWrap.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
  });
}

/* ---------------------------------------------------------------
   Animated stat counters — the hero readout and the About section
   highlight numbers count up once, the first time they're seen.
--------------------------------------------------------------- */
function animateCounter(el){
  const raw = el.textContent.trim();
  const match = raw.match(/^(\d+)/);
  if (!match) return; // non-numeric values (e.g. "CCNA", "Zero") stay as-is
  const end = parseInt(match[1], 10);
  const suffix = raw.slice(match[1].length);
  if (reduceMotion || end === 0) return;
  const dur = 1000;
  let start = null;
  function step(ts){
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * end) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = raw;
  }
  el.textContent = '0' + suffix;
  requestAnimationFrame(step);
}
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: .4 });
$$('.status-item .val, .highlight-card .val').forEach(el => counterObserver.observe(el));

/* ---------------------------------------------------------------
   Timeline progress line — fills as you scroll through Experience,
   echoing an uptime meter rather than a generic scrollbar.
--------------------------------------------------------------- */
const tlProgress = $('#tlProgress');
const timelineEl = $('#timeline');
if (tlProgress && timelineEl && !reduceMotion) {
  function updateTlProgress(){
    const rect = timelineEl.getBoundingClientRect();
    const raw = (innerHeight * .8 - rect.top) / (rect.height + innerHeight * .3);
    const pct = Math.max(0, Math.min(1, raw));
    tlProgress.style.height = `${pct * 100}%`;
  }
  window.addEventListener('scroll', updateTlProgress, { passive: true });
  window.addEventListener('resize', updateTlProgress);
  updateTlProgress();
}

/* ---------------------------------------------------------------
   Contact section — live Doha time readout
--------------------------------------------------------------- */
const dohaClock = $('#dohaClock');
if (dohaClock) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Qatar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  function tickClock(){ dohaClock.textContent = fmt.format(new Date()); }
  tickClock();
  setInterval(tickClock, 1000);
}

/* ---------------------------------------------------------------
   Scroll-scrubbed hero photo — as you scroll through the hero,
   the portrait turns (via a CSS var, composited with the existing
   pointer-tilt) and the role tag cycles through titles, echoing
   an Apple-style scroll-scrub sequence without needing frame assets.
--------------------------------------------------------------- */
const heroSection = $('.hero');
const heroPhoto = $('.hero-photo');
const roleCycleEl = $('#heroRoleCycle');
const roleCycle = [
  'Infrastructure & Networking',
  'Enterprise IT Support',
  'CCNA Certified Engineer',
  'Zero-Downtime Systems'
];
let lastRoleIdx = 0;

if (heroSection && heroPhoto && !reduceMotion) {
  function updateHeroScrub(){
    const rect = heroSection.getBoundingClientRect();
    const range = rect.height * .8;
    const scrolled = Math.min(Math.max(-rect.top, 0), range);
    const frac = range > 0 ? scrolled / range : 0;

    const rotY = (frac - .5) * 22;   // -11deg .. 11deg
    const rotX = (frac - .5) * -6;   // slight vertical counter-turn
    heroPhoto.style.setProperty('--scrollRotY', `${rotY.toFixed(2)}deg`);
    heroPhoto.style.setProperty('--scrollRotX', `${rotX.toFixed(2)}deg`);

    if (roleCycleEl) {
      const idx = Math.min(roleCycle.length - 1, Math.floor(frac * roleCycle.length));
      if (idx !== lastRoleIdx) {
        lastRoleIdx = idx;
        roleCycleEl.classList.add('swap');
        setTimeout(() => {
          roleCycleEl.textContent = roleCycle[idx];
          roleCycleEl.classList.remove('swap');
        }, 140);
      }
    }
  }
  window.addEventListener('scroll', updateHeroScrub, { passive: true });
  window.addEventListener('resize', updateHeroScrub);
  updateHeroScrub();
}

/* ---------------------------------------------------------------
   Mirrored / reflected section headers with a one-time glitch
   flicker as each heading scrolls into view.
--------------------------------------------------------------- */
$$('.section h2, .contact-panel h2').forEach(h2 => {
  h2.setAttribute('data-mirror', h2.textContent.trim());
});
if (!reduceMotion) {
  const glitchObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('glitch-in');
        glitchObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .5 });
  $$('.section h2, .contact-panel h2').forEach(h2 => glitchObserver.observe(h2));
}

/* ---------------------------------------------------------------
   Scroll reveal — single fade, no slide (kept restrained)
--------------------------------------------------------------- */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .15 });
$$('.reveal').forEach(el => observer.observe(el));

/* ---------------------------------------------------------------
   Nav: active link + mobile drawer + smooth scroll
--------------------------------------------------------------- */
const navLinks = $$('.nav-links a, .mob-drawer a');
const sections = $$('main section[id]');
const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => navObserver.observe(s));

$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#mobDrawer')?.classList.remove('open');
  });
});

const navToggle = $('#navToggle');
const mobDrawer = $('#mobDrawer');
navToggle?.addEventListener('click', () => mobDrawer.classList.toggle('open'));

/* ---------------------------------------------------------------
   Scroll progress bar
--------------------------------------------------------------- */
const progress = $('#scrollProgress');
function updateProgress(){
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  progress.style.width = max > 0 ? `${(h.scrollTop/max)*100}%` : '0%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* ---------------------------------------------------------------
   Case study accordion
--------------------------------------------------------------- */
$$('[data-case]').forEach(card => {
  const head = card.querySelector('[data-case-toggle]');
  head.addEventListener('click', () => {
    const wasOpen = card.classList.contains('open');
    $$('[data-case]').forEach(c => c.classList.remove('open'));
    if (!wasOpen) card.classList.add('open');
  });
});
