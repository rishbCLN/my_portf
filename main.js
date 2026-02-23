/* ========================================
   Hyperspace Intro Animation - Fixed
   ======================================== */
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

        // No static phase — animation starts immediately
        this.phase2End = 1200;     // Slow drift
        this.phase3End = 5500;     // Acceleration into hyperspace
        this.flashEnd = 5580;      // White flash
        this.fadeEnd = 6300;       // Fade out

        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.portalMaxRadius = 130;  // starts at this size
        this.stars = [];
        this.startTime = performance.now();
        this.maxScreenDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;

        this.initStars();
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.maxScreenDist = Math.sqrt(this.canvas.width ** 2 + this.canvas.height ** 2) / 2;
    }

    initStars() {
        this.stars = [];
        const minDist = 150;

        for (let i = 0; i < 400; i++) {
            let x, y, dx, dy, dist;

            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                dx = x - this.centerX;
                dy = y - this.centerY;
                dist = Math.sqrt(dx * dx + dy * dy);
            } while (dist < minDist);

            const angle = Math.atan2(dy, dx);

            this.stars.push({
                x, y,
                prevX: x,
                prevY: y,
                angle,
                distFromCenter: dist,
                speed: 0,
                opacity: Math.random() * 0.6 + 0.4,
                radius: Math.random() * 0.5 + 1,
            });
        }
    }

    drawPortal(portalRadius) {
        const ctx = this.ctx;
        if (portalRadius <= 0) return;
        ctx.save();
        ctx.shadowBlur = 40;
        ctx.shadowColor = '#000';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, portalRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    animate() {
        const now = performance.now();
        const elapsed = now - this.startTime;

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Phase 2: Slow Drift — starts immediately
        if (elapsed < this.phase2End) {
            const progress = elapsed / this.phase2End;
            const eased = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            for (let star of this.stars) {
                const driftSpeed = 0.4 * eased;
                star.prevX = star.x;
                star.prevY = star.y;
                star.x += Math.cos(star.angle) * driftSpeed;
                star.y += Math.sin(star.angle) * driftSpeed;

                this.ctx.globalAlpha = star.opacity;
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;

            // Portal starts full size during drift
            this.drawPortal(this.portalMaxRadius);

        // Phase 3: Hyperspace acceleration — portal shrinks as we speed in
        } else if (elapsed < this.phase3End) {
            const progress = (elapsed - this.phase2End) / (this.phase3End - this.phase2End);
            this.updateAndDrawWarpStars(progress);

            // Portal shrinks from full size to 0 as progress goes 0 -> 1
            const portalRadius = this.portalMaxRadius * (1 - progress);
            this.drawPortal(portalRadius);

        // Phase 4 & 5: Flash + Fade — no portal
        } else if (elapsed < this.fadeEnd) {
            this.updateAndDrawWarpStars(1);

            const flashDuration = 80;
            if (elapsed < this.phase3End + flashDuration) {
                const flashAlpha = 1 - ((elapsed - this.phase3End) / flashDuration);
                this.ctx.globalAlpha = flashAlpha * 0.9;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.globalAlpha = 1;
            }

            const fadeProgress = (elapsed - this.phase3End) / (this.fadeEnd - this.phase3End);
            this.canvas.style.opacity = 1 - fadeProgress;

            if (fadeProgress > 0.4) {
                const hero = document.querySelector('.hero');
                if (hero && hero.style.opacity !== '1') {
                    hero.style.transition = 'opacity 0.8s ease-out';
                    hero.style.opacity = '1';
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

        for (let star of this.stars) {
            // FIX: minimum base speed of 0.3 so stars are never invisible at phase transition
            const baseSpeed = 0.3 + accelerationCurve * 45;
            const distanceFactor = Math.max(0.3, Math.min(1.6, this.maxScreenDist / Math.max(star.distFromCenter, 50)));
            star.speed = baseSpeed * distanceFactor;

            star.prevX = star.x;
            star.prevY = star.y;
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;

            const dx = star.x - this.centerX;
            const dy = star.y - this.centerY;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);

            // Skip stars inside the shrinking portal radius
            const currentPortalRadius = this.portalMaxRadius * (1 - progress);
            if (distFromCenter < currentPortalRadius) continue;
            if (distFromCenter > this.maxScreenDist * 2) continue;

            const stretchFactor = 1 + (progress * 80);
            const streakLength = Math.max(star.speed * stretchFactor, star.speed * 3);

            const startX = star.x - Math.cos(star.angle) * streakLength;
            const startY = star.y - Math.sin(star.angle) * streakLength;

            const streakOpacity = Math.min(star.opacity * (0.9 + accelerationCurve * 0.3), 1);
            this.ctx.strokeStyle = '#e8f4ff';
            this.ctx.lineWidth = Math.max(0.8, 1.2 + accelerationCurve * 1.2);
            this.ctx.lineCap = 'round';
            this.ctx.globalAlpha = streakOpacity;
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