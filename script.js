/* ========================================
   Navbar
   ======================================== */
class Navbar {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.toggle = document.getElementById('nav-toggle');
        this.menu = document.getElementById('nav-menu');
        this.isOpen = false;

        const logo = this.navbar.querySelector('.nav-logo');
        const row = document.createElement('div');
        row.classList.add('nav-top-row');
        this.navbar.insertBefore(row, logo);
        row.appendChild(logo);
        row.appendChild(this.toggle);

        this.toggle.addEventListener('click', () => this.toggleMenu());
        this.menu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });
    }

    toggleMenu() { this.isOpen ? this.closeMenu() : this.openMenu(); }

    openMenu() {
        this.isOpen = true;
        this.toggle.classList.add('open');
        this.menu.classList.add('open');
        this.navbar.classList.add('menu-open');
        gsap.fromTo(this.menu.querySelectorAll('.nav-link'),
            { opacity: 0, x: -12 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.07, ease: 'power3.out' }
        );
    }

    closeMenu() {
        this.isOpen = false;
        this.toggle.classList.remove('open');
        this.menu.classList.remove('open');
        this.navbar.classList.remove('menu-open');
    }

    show() {
        gsap.to(this.navbar, { opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.3 });
    }
}

/* ========================================
   Helper
   ======================================== */
function isPortraitMobile() {
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
}

/* ========================================
   Smooth Glitchy Distortion Reveal
   ======================================== */
class PortraitReveal {
    constructor() {
        this.container = document.querySelector('.portrait-container');
        if (!this.container) return;

        // Canvas sits on top of both images
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('portrait-canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Base image (already in DOM as .portrait-base)
        this.baseImg = document.querySelector('.portrait-base');

        // Overlay image — drawn via canvas
        this.overlayImg = new Image();
        this.overlayImg.src = 'sec_col_potrait.png';
        this.overlayLoaded = false;
        this.overlayImg.onload = () => { this.overlayLoaded = true; };

        this.mouseX = -9999;
        this.mouseY = -9999;
        this.revealStrength = 0;
        this.targetStrength = 0;
        this.time = 0;

        // Resize after fonts/layout settle
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.resize();
            });
        });

        window.addEventListener('resize', () => {
            setTimeout(() => this.resize(), 100);
        });

        this.container.addEventListener('mouseenter', () => { this.targetStrength = 1; });
        this.container.addEventListener('mousemove', (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        this.container.addEventListener('mouseleave', () => {
            this.targetStrength = 0;
            this.mouseX = -9999;
            this.mouseY = -9999;
        });

        // Touch support for mobile reveal
        this.container.addEventListener('touchstart', (e) => {
            this.targetStrength = 1;
            const touch = e.touches[0];
            const rect = this.container.getBoundingClientRect();
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const rect = this.container.getBoundingClientRect();
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            this.targetStrength = 0;
            this.mouseX = -9999;
            this.mouseY = -9999;
        });

        this.update();
    }

    resize() {
        // Use getBoundingClientRect for true rendered size
        const rect = this.container.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (w > 0 && h > 0) {
            this.canvas.width = w;
            this.canvas.height = h;
            // Also set canvas CSS size to match
            this.canvas.style.width = w + 'px';
            this.canvas.style.height = h + 'px';
        }
    }

    update() {
        this.time += 0.025;
        this.revealStrength += (this.targetStrength - this.revealStrength) * 0.06;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.overlayLoaded && this.revealStrength > 0.01) this.drawDistorted();
        requestAnimationFrame(() => this.update());
    }

    drawDistorted() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const strength = this.revealStrength;

        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const off = offscreen.getContext('2d');
        off.drawImage(this.overlayImg, 0, 0, w, h);
        const pixels = off.getImageData(0, 0, w, h).data;

        const output = this.ctx.createImageData(w, h);
        const out = output.data;
        const influenceRadius = Math.min(w, h) * 0.45 * strength;
        const maxDisplace = 4 * strength;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = x - this.mouseX;
                const dy = y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > influenceRadius) continue;
                const falloff = (1 + Math.cos(Math.PI * dist / influenceRadius)) / 2;
                const wave = Math.sin(dist * 0.08 - this.time * 2) * falloff * 0.8;
                const dispX = Math.round(wave * maxDisplace);
                const dispY = Math.round(Math.cos(dist * 0.07 - this.time * 1.8) * maxDisplace * falloff * 0.1);
                const srcX = Math.min(w - 1, Math.max(0, x + dispX));
                const srcY = Math.min(h - 1, Math.max(0, y + dispY));
                const si = (srcY * w + srcX) * 4;
                const di = (y * w + x) * 4;
                const alpha = falloff * strength;
                out[di]   = pixels[si];
                out[di+1] = pixels[si+1];
                out[di+2] = pixels[si+2];
                out[di+3] = Math.round(pixels[si+3] * alpha);
            }
        }
        this.ctx.putImageData(output, 0, 0);
    }
}

/* ========================================
   GSAP Entrance Animations — Page 1
   ======================================== */
function initEntranceAnimations() {
    const starsCanvas = document.getElementById('stars-canvas');
    const portraitBase = document.querySelector('.portrait-base');
    const heroName = document.querySelector('.hero-name');
    const heroTitle = document.querySelector('.hero-title');

    const tl = gsap.timeline();
    tl.to(starsCanvas, { opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0);
    tl.to(portraitBase, { opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 1.2, ease: 'power3.out' }, 0);
    tl.to(heroName, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.4);
    tl.to(heroTitle, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.6);
    tl.call(() => {
        window._navbar.show();
        initScrollAnimations();
    }, [], 1.0);
}

/* ========================================
   All Scroll Animations
   ======================================== */
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    /* Page 2 */
    gsap.to('.about-divider', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.about-divider', start: 'top 85%' } });
    gsap.to('.about-bio', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.about-bio', start: 'top 80%' } });
    gsap.to('.about-stats', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.about-stats', start: 'top 80%' } });
    gsap.to('.about-skills', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.about-skills', start: 'top 85%' } });
    gsap.to('.skill-tag', { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07, scrollTrigger: { trigger: '.skills-list', start: 'top 85%' } });

    /* Page 3 — horizontal only on non-portrait */
    const track = document.getElementById('work-track');
    const workSection = document.querySelector('.work');

    if (track && workSection) {
        if (!isPortraitMobile()) {
            const totalScroll = track.scrollWidth - window.innerWidth;
            workSection.style.height = `${totalScroll + window.innerHeight}px`;
            gsap.to(track, {
                x: () => -(track.scrollWidth - window.innerWidth),
                ease: 'none',
                scrollTrigger: {
                    trigger: workSection,
                    start: 'top top',
                    end: () => `+=${totalScroll}`,
                    pin: '.work-sticky',
                    scrub: 1,
                    invalidateOnRefresh: true,
                }
            });
        } else {
            workSection.style.height = 'auto';
            track.style.transform = 'none';
        }
    }

    /* Page 4 */
    gsap.to('.contact-divider', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.contact-divider', start: 'top 85%' } });
    gsap.to('.contact-main', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.contact-main', start: 'top 80%' } });
    gsap.to('.contact-footer', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.contact-footer', start: 'top 90%' } });
    gsap.fromTo('.t-link',
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: '.terminal', start: 'top 80%' } }
    );
}

/* ========================================
   Lenis Smooth Scroll
   ======================================== */
function initLenisScroll() {
    if (typeof Lenis === 'undefined') { console.warn('Lenis not loaded'); return; }
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        smoothTouch: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
}

/* ========================================
   Initialize
   ======================================== */
document.addEventListener('DOMContentLoaded', () => {
    window._navbar = new Navbar();
    new PortraitReveal();
    initLenisScroll();
});