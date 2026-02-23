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
        this.fadeEnd   = 6300;

        this.stars     = [];
        this.startTime = null;

        // Wait for full paint + layout stabilisation on all mobile browsers.
        // 300ms covers slow Android Webviews and iOS with URL bar transitions.
        setTimeout(() => {
            requestAnimationFrame(() => {
                this.resizeCanvas();
                this.initStars();
                this.startTime = performance.now();
                this.animate();
            });
        }, 300);

        window.addEventListener('resize', () => {
            // Only resize if animation is still running
            if (!this.startTime) return;
            this.resizeCanvas();
        });
    }

    getDimensions() {
        // Pick the most reliable source per browser
        // Math.min guards against landscape/portrait swap giving wrong axis
        const w = Math.max(
            document.documentElement.clientWidth  || 0,
            window.innerWidth || 0
        );
        const h = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0
        );
        return { w, h };
    }

    resizeCanvas() {
        const { w, h } = this.getDimensions();
        this.canvas.width  = w;
        this.canvas.height = h;
        this.centerX       = w / 2;
        this.centerY       = h / 2;
        this.maxScreenDist = Math.sqrt(w * w + h * h) / 2;
        // 8% of shorter screen side — round number, scales cleanly on all sizes
        this.portalMaxRadius = Math.min(w, h) * 0.08;
    }

    initStars() {
        this.stars = [];
        const minDist = this.portalMaxRadius * 1.6;

        for (let i = 0; i < 400; i++) {
            let x, y, dx, dy, dist, attempts = 0;
            do {
                x    = Math.random() * this.canvas.width;
                y    = Math.random() * this.canvas.height;
                dx   = x - this.centerX;
                dy   = y - this.centerY;
                dist = Math.sqrt(dx * dx + dy * dy);
            } while (dist < minDist && ++attempts < 50);

            this.stars.push({
                x, y,
                angle:          Math.atan2(dy, dx),
                distFromCenter: dist,
                speed:          0,
                opacity:        Math.random() * 0.6 + 0.4,
                radius:         Math.random() * 0.5 + 1,
            });
        }
    }

    drawPortal(r) {
        if (r <= 0) return;
        const { ctx, centerX: cx, centerY: cy } = this;
        ctx.save();

        // Soft glow halo
        const g = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.5);
        g.addColorStop(0,   'rgba(0,0,0,0)');
        g.addColorStop(0.4, 'rgba(140,200,255,0.07)');
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Solid black hole
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    animate() {
        if (!this.startTime) return;
        const elapsed = performance.now() - this.startTime;
        const ctx     = this.ctx;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (elapsed < this.phase2End) {
            // Slow drift
            const p     = elapsed / this.phase2End;
            const eased = p < 0.5 ? 4 * p ** 3 : 1 - Math.pow(-2 * p + 2, 3) / 2;
            for (const s of this.stars) {
                s.x += Math.cos(s.angle) * 0.4 * eased;
                s.y += Math.sin(s.angle) * 0.4 * eased;
                ctx.globalAlpha = s.opacity;
                ctx.fillStyle   = '#e8f4ff';
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            this.drawPortal(this.portalMaxRadius);

        } else if (elapsed < this.phase3End) {
            // Warp
            const p = (elapsed - this.phase2End) / (this.phase3End - this.phase2End);
            this.drawWarpStars(p);
            this.drawPortal(this.portalMaxRadius * (1 - p));

        } else if (elapsed < this.fadeEnd) {
            // Flash + fade
            this.drawWarpStars(1);

            if (elapsed < this.phase3End + 80) {
                const fa = 1 - (elapsed - this.phase3End) / 80;
                ctx.globalAlpha = fa * 0.9;
                ctx.fillStyle   = '#fff';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.globalAlpha = 1;
            }

            const fp = (elapsed - this.phase3End) / (this.fadeEnd - this.phase3End);
            this.canvas.style.opacity = String(1 - fp);

            if (fp > 0.4) {
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
        const ctx    = this.ctx;
        const accel  = Math.pow(progress, 4);
        const pR     = this.portalMaxRadius * (1 - progress);

        for (const s of this.stars) {
            const speed = (0.3 + accel * 45) *
                Math.max(0.3, Math.min(1.6, this.maxScreenDist / Math.max(s.distFromCenter, 50)));
            s.x += Math.cos(s.angle) * speed;
            s.y += Math.sin(s.angle) * speed;

            const dx = s.x - this.centerX, dy = s.y - this.centerY;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < pR || d > this.maxScreenDist * 2) continue;

            const len  = Math.max(speed * (1 + progress * 80), speed * 3);
            ctx.strokeStyle = '#e8f4ff';
            ctx.lineWidth   = Math.max(0.8, 1.2 + accel * 1.2);
            ctx.lineCap     = 'round';
            ctx.globalAlpha = Math.min(s.opacity * (0.9 + accel * 0.3), 1);
            ctx.beginPath();
            ctx.moveTo(s.x - Math.cos(s.angle) * len, s.y - Math.sin(s.angle) * len);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    cleanup() {
        if (this.canvas.parentNode) this.canvas.remove();
        if (typeof initEntranceAnimations === 'function') initEntranceAnimations();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HyperspaceIntro());
} else {
    new HyperspaceIntro();
}