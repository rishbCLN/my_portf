class HyperspaceIntro {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.background = '#000';
        this.canvas.style.opacity = '1';
        document.body.appendChild(this.canvas);

        this.phase2End = 1200;
        this.phase3End = 5500;
        this.flashEnd  = 5580;
        this.fadeEnd   = 6300;

        this.stars = [];
        this.startTime = null; // set after first resize settles

        // Do a proper resize AFTER browser has painted,
        // then init stars and start — prevents mobile dimension bug
        const ready = () => {
            this.resizeCanvas();
            this.initStars();
            this.startTime = performance.now();
            this.animate();
        };

        // Double rAF ensures layout/viewport is stable on mobile
        requestAnimationFrame(() => requestAnimationFrame(ready));

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        // Use clientWidth/clientHeight on documentElement —
        // more reliable than window.innerWidth on mobile browsers
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;

        this.canvas.width  = w;
        this.canvas.height = h;
        this.centerX       = w / 2;
        this.centerY       = h / 2;
        this.maxScreenDist = Math.sqrt(w * w + h * h) / 2;

        // Portal = 9% of shorter dimension — looks proportional on all screens
        this.portalMaxRadius = Math.min(w, h) * 0.09;
    }

    initStars() {
        this.stars = [];
        const minDist = this.portalMaxRadius * 1.5;

        for (let i = 0; i < 400; i++) {
            let x, y, dx, dy, dist;
            let attempts = 0;
            do {
                x  = Math.random() * this.canvas.width;
                y  = Math.random() * this.canvas.height;
                dx = x - this.centerX;
                dy = y - this.centerY;
                dist = Math.sqrt(dx * dx + dy * dy);
                attempts++;
            } while (dist < minDist && attempts < 100);

            this.stars.push({
                x, y,
                prevX: x, prevY: y,
                angle: Math.atan2(dy, dx),
                distFromCenter: dist,
                speed: 0,
                opacity: Math.random() * 0.6 + 0.4,
                radius:  Math.random() * 0.5 + 1,
            });
        }
    }

    drawPortal(portalRadius) {
        if (portalRadius <= 0) return;
        const ctx = this.ctx;
        const cx  = this.centerX;
        const cy  = this.centerY;

        ctx.save();

        // Glow ring just outside the portal edge
        const grd = ctx.createRadialGradient(cx, cy, portalRadius * 0.75, cx, cy, portalRadius * 1.4);
        grd.addColorStop(0,   'rgba(0,0,0,0)');
        grd.addColorStop(0.5, 'rgba(160,210,255,0.06)');
        grd.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, portalRadius * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Solid black hole — use clip to ensure it's a perfect circle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, portalRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    animate() {
        if (!this.startTime) return;
        const elapsed = performance.now() - this.startTime;

        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Phase 1 — slow drift
        if (elapsed < this.phase2End) {
            const progress = elapsed / this.phase2End;
            const eased = progress < 0.5
                ? 4 * progress ** 3
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            for (const star of this.stars) {
                star.x += Math.cos(star.angle) * 0.4 * eased;
                star.y += Math.sin(star.angle) * 0.4 * eased;
                ctx.globalAlpha = star.opacity;
                ctx.fillStyle   = '#e8f4ff';
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            this.drawPortal(this.portalMaxRadius);

        // Phase 2 — warp acceleration
        } else if (elapsed < this.phase3End) {
            const progress = (elapsed - this.phase2End) / (this.phase3End - this.phase2End);
            this.drawWarpStars(progress);
            this.drawPortal(this.portalMaxRadius * (1 - progress));

        // Phase 3 — flash + fade
        } else if (elapsed < this.fadeEnd) {
            this.drawWarpStars(1);

            if (elapsed < this.phase3End + 80) {
                const flashAlpha = 1 - ((elapsed - this.phase3End) / 80);
                ctx.globalAlpha = flashAlpha * 0.9;
                ctx.fillStyle   = '#fff';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.globalAlpha = 1;
            }

            const fadeProgress = (elapsed - this.phase3End) / (this.fadeEnd - this.phase3End);
            this.canvas.style.opacity = String(1 - fadeProgress);

            if (fadeProgress > 0.4) {
                const hero = document.querySelector('.hero');
                if (hero && hero.style.opacity !== '1') {
                    hero.style.transition = 'opacity 0.8s ease-out';
                    hero.style.opacity    = '1';
                }
            }
        } else {
            this.cleanup();
            return;
        }

        requestAnimationFrame(() => this.animate());
    }

    drawWarpStars(progress) {
        const ctx              = this.ctx;
        const accel            = Math.pow(progress, 4);
        const currentPortalR   = this.portalMaxRadius * (1 - progress);

        for (const star of this.stars) {
            const baseSpeed      = 0.3 + accel * 45;
            const distanceFactor = Math.max(0.3, Math.min(1.6,
                this.maxScreenDist / Math.max(star.distFromCenter, 50)
            ));
            star.speed = baseSpeed * distanceFactor;

            star.prevX = star.x;
            star.prevY = star.y;
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;

            const dx   = star.x - this.centerX;
            const dy   = star.y - this.centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < currentPortalR)        continue;
            if (dist > this.maxScreenDist * 2) continue;

            const streakLength = Math.max(star.speed * (1 + progress * 80), star.speed * 3);
            const startX = star.x - Math.cos(star.angle) * streakLength;
            const startY = star.y - Math.sin(star.angle) * streakLength;

            ctx.strokeStyle = '#e8f4ff';
            ctx.lineWidth   = Math.max(0.8, 1.2 + accel * 1.2);
            ctx.lineCap     = 'round';
            ctx.globalAlpha = Math.min(star.opacity * (0.9 + accel * 0.3), 1);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(star.x, star.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    cleanup() {
        if (this.canvas.parentNode) this.canvas.remove();
        if (typeof initEntranceAnimations === 'function') {
            initEntranceAnimations();
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HyperspaceIntro());
} else {
    new HyperspaceIntro();
}