class HyperspaceIntro {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.background = '#000';
        this.canvas.style.opacity = '1';
        document.body.appendChild(this.canvas);

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.phase2End = 1200;
        this.phase3End = 5500;
        this.flashEnd  = 5580;
        this.fadeEnd   = 6300;

        this.stars = [];
        this.startTime = performance.now();

        this.initStars();
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX       = this.canvas.width  / 2;
        this.centerY       = this.canvas.height / 2;
        this.maxScreenDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;

        // Portal scales proportionally — 9% of the shorter screen dimension
        // Looks correct on both desktop and small phone screens
        this.portalMaxRadius = Math.min(this.canvas.width, this.canvas.height) * 0.09;
    }

    initStars() {
        this.stars = [];

        // minDist scales with portal so stars never overlap it
        const minDist = this.portalMaxRadius * 1.4;

        for (let i = 0; i < 400; i++) {
            let x, y, dx, dy, dist;
            do {
                x  = Math.random() * this.canvas.width;
                y  = Math.random() * this.canvas.height;
                dx = x - this.centerX;
                dy = y - this.centerY;
                dist = Math.sqrt(dx * dx + dy * dy);
            } while (dist < minDist);

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
        const ctx = this.ctx;
        if (portalRadius <= 0) return;

        // Soft glowing ring around the portal edge
        const grd = ctx.createRadialGradient(
            this.centerX, this.centerY, portalRadius * 0.7,
            this.centerX, this.centerY, portalRadius * 1.3
        );
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.5, 'rgba(180,220,255,0.07)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.save();
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, portalRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Solid black centre — the "hole" we're flying into
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, portalRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    animate() {
        const now     = performance.now();
        const elapsed = now - this.startTime;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Phase 1 — slow drift
        if (elapsed < this.phase2End) {
            const progress = elapsed / this.phase2End;
            const eased = progress < 0.5
                ? 4 * progress ** 3
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            for (const star of this.stars) {
                const driftSpeed = 0.4 * eased;
                star.prevX = star.x;
                star.prevY = star.y;
                star.x += Math.cos(star.angle) * driftSpeed;
                star.y += Math.sin(star.angle) * driftSpeed;

                this.ctx.globalAlpha = star.opacity;
                this.ctx.fillStyle   = '#e8f4ff';
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;
            this.drawPortal(this.portalMaxRadius);

        // Phase 2 — hyperspace acceleration
        } else if (elapsed < this.phase3End) {
            const progress = (elapsed - this.phase2End) / (this.phase3End - this.phase2End);
            this.updateAndDrawWarpStars(progress);
            this.drawPortal(this.portalMaxRadius * (1 - progress));

        // Phase 3 — flash + fade out
        } else if (elapsed < this.fadeEnd) {
            this.updateAndDrawWarpStars(1);

            const flashDuration = 80;
            if (elapsed < this.phase3End + flashDuration) {
                const flashAlpha = 1 - ((elapsed - this.phase3End) / flashDuration);
                this.ctx.globalAlpha = flashAlpha * 0.9;
                this.ctx.fillStyle   = '#fff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.globalAlpha = 1;
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

    updateAndDrawWarpStars(progress) {
        const accelerationCurve = Math.pow(progress, 4);
        const currentPortalRadius = this.portalMaxRadius * (1 - progress);

        for (const star of this.stars) {
            const baseSpeed     = 0.3 + accelerationCurve * 45;
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

            if (dist < currentPortalRadius)      continue;
            if (dist > this.maxScreenDist * 2)   continue;

            const stretchFactor = 1 + (progress * 80);
            const streakLength  = Math.max(star.speed * stretchFactor, star.speed * 3);

            const startX = star.x - Math.cos(star.angle) * streakLength;
            const startY = star.y - Math.sin(star.angle) * streakLength;

            this.ctx.strokeStyle = '#e8f4ff';
            this.ctx.lineWidth   = Math.max(0.8, 1.2 + accelerationCurve * 1.2);
            this.ctx.lineCap     = 'round';
            this.ctx.globalAlpha = Math.min(star.opacity * (0.9 + accelerationCurve * 0.3), 1);
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(star.x, star.y);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
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