// collision_autoclean_emit_fastfade_impact.js — Fale zawsze emitowane + uderzenie fali uderzeniowej (okrąg z obserwatora)
(function () {
    const container = document.querySelector(".container");
    const canvas = document.getElementById("waveCanvas");
    const ctx = canvas.getContext("2d");
    const SPEED_OF_SOUND = 343;

    function pxPerMeter() {
        return canvas.width / 343;
    }

    const observer = {x: canvas.width * 0.5, y: canvas.height * 0.5, radius: 50};

    class Wave {
        constructor(x, y, speed_pxps, amplitude, sourceSpeed_mps, color = "rgba(193, 0, 161, 0.45)", width = 5) {
            this.x = x;
            this.y = y;
            this.speed = speed_pxps;
            this.radius = 0;
            this.amplitude = amplitude;
            this.age = 0;
            this.sourceSpeed_mps = sourceSpeed_mps;
            this.color = color;
            this.lineWidth = width;
            const diag = Math.hypot(canvas.width, canvas.height);
            const baseLifetime = this.speed < 10 ? 0.5 : diag / Math.max(1, this.speed);
            let fade = 1;
            if (this.sourceSpeed_mps >= SPEED_OF_SOUND - 20) fade = 1;
            if (this.sourceSpeed_mps >= SPEED_OF_SOUND - 5) fade = 1;
            if (this.sourceSpeed_mps >= SPEED_OF_SOUND) fade = 1;
            this.lifetime = baseLifetime * fade;
            this.alive = true;
        }
        update(dt) {
            this.age += dt;
            if (this.age >= this.lifetime) this.alive = false;
            this.radius += this.speed * dt * 5;
        }
        draw(ctx) {
            const t = this.age / this.lifetime;
            const alpha = this.amplitude * (1 - t);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.lineWidth;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
    }

    function reflect(dirX, dirY, nX, nY) {
        const dot = dirX * nX + dirY * nY;
        return {x: dirX - 2 * dot * nX, y: dirY - 2 * dot * nY};
    }

    function checkCollision(w, obs, dt) {
        const dx = w.x - obs.x;
        const dy = w.y - obs.y;
        const d = Math.hypot(dx, dy);
        return Math.abs(d - w.radius) < w.speed * dt;
    }

    // ---- Mach Cone SHOCKWAVE logic ----
    let machImpactLast = 0;
    function emitShockwaveFromObserver() {
        // Emit okrągłej fali uderzeniowej z punktu obserwatora, w kolorze czerwonym
        const speed_pxps = SPEED_OF_SOUND * pxPerMeter();
        waves.push(new Wave(observer.x, observer.y, speed_pxps, 3.0, SPEED_OF_SOUND + 1, "rgba(255, 0, 0, 0.85)", 10));
    }
    // ---- END Mach Cone logic ----

    let waves = [];
    let reflections = [];
    let lastTime = performance.now();

    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        // czyścisz stare fale (bo inaczej zostaną w złych współrzędnych)
        waves = [];
        reflections = [];
        observer.x = canvas.width * 0.5;
        observer.y = canvas.height * 0.5;
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    function animate(t) {
        const dt = (t - lastTime) / 1000;
        lastTime = t;
        const obsElem = document.getElementById("observer1");
        const contRect = container.getBoundingClientRect();
        const obsRect = obsElem.getBoundingClientRect();
        observer.x = obsRect.left + obsRect.width / 2 - contRect.left;
        observer.y = obsRect.top + obsRect.height / 2 - contRect.top;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pozycje źródła i obserwatora (ustawiaj globalnie w swoim kodzie, np. po każdej klatce animacji)
        const currentSpeed = window.lastSourceSpeedMps || 0;
        const sourceX = window.lastSourceX || 0;
        const observerX = window.lastObserverX || 0;

        // SYMULACJA UDERZENIA FALI UDERZENIOWEJ
        simulateMachImpactIfNeeded(currentSpeed, sourceX, observerX, t / 1000);

        for (let w of waves) {
            if (!w.alive) continue;
            w.update(dt);
            w.draw(ctx);
            if (checkCollision(w, observer, dt)) {
                w.alive = false;

                // 1) Wyświetl graficzny efekt fali uderzeniowej:
                const cont = document.querySelector(".container");
                const obsElem = document.getElementById("observer1");
                const obsRect = obsElem.getBoundingClientRect();
                const contRect = cont.getBoundingClientRect();

                const impact = document.createElement("div");
                impact.className = "mach-impact";
                impact.style.position = "absolute";
                impact.style.left = obsRect.left + obsRect.width / 2 - contRect.left + "px";
                impact.style.top = obsRect.top + obsRect.height / 2 - contRect.top + "px";
                impact.style.zIndex = "10000"; // nad wszystkim
                cont.appendChild(impact);
                impact.addEventListener("animationend", () => impact.remove());

                // 2) Twoje odbicie fali:
                const dx = w.x - observer.x;
                const dy = w.y - observer.y;
                const d = Math.hypot(dx, dy) || 1;
                const nX = dx / d,
                    nY = dy / d;
                reflections.push(
                    new Wave(
                        observer.x + nX * (observer.radius + 1),
                        observer.y + nY * (observer.radius + 1),
                        w.speed,
                        w.amplitude * 0.6,
                        w.sourceSpeed_mps
                    )
                );
            }
        }
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        for (let w of reflections) {
            if (!w.alive) continue;
            w.update(dt);
            w.draw(ctx);
        }
        waves = waves.filter((w) => w.alive);
        reflections = reflections.filter((w) => w.alive);
        requestAnimationFrame(animate);
    }

    // Emituje fale dla KAŻDEJ prędkości, fade dla wysokich v
    window.emitWave = function (xPercent, yPercent = 50, sourceSpeed_mps = speed, amplitude = 1, isShockwave = false) {
        const pxpm = canvas.width / (SPEED_OF_SOUND * METERS_PER_PERCENT);
        const effectiveSpeed_mps = Math.abs(SPEED_OF_SOUND - sourceSpeed_mps) || 1;
        const effective_pxps = effectiveSpeed_mps * pxpm;
        const x = canvas.width * (xPercent / 100);
        const y = canvas.height * (yPercent / 100);
        waves.push(
            new Wave(x, y, effective_pxps, amplitude, sourceSpeed_mps, isShockwave ? "rgba(255,0,0,0.35)" : undefined)
        );
    };

    window.emitWaveAccurate = function (speed, timestamp, lastEmitTime) {
        const deltaT = timestamp / 1000 - lastEmitTime; // sekundy
        const SCALE_FACTOR = 5;
        const movedPct = (speed / 343) * deltaT * SCALE_FACTOR;
        const realEmitX = sourceX + movedPct;

        // Zabezpieczenie żeby nie wyleciał poza ekran
        const clampedX = Math.max(0, Math.min(realEmitX, 100));
        window.emitWave(clampedX, 50, speed, 1);
    };

    // Dodaj pozycje w px w swoim kodzie głównym przy każdej klatce!
    window.setMachImpactPositions = function (sourceX, observerX) {
        window.lastSourceX = sourceX;
        window.lastObserverX = observerX;
    };

    window.Wave = Wave;
    window.reflect = reflect;
    window.checkCollision = checkCollision;
    requestAnimationFrame(animate);

    function simulateMachImpactIfNeeded(sourceSpeed, sourceX, observerX, timestamp) {
        if (sourceSpeed < SPEED_OF_SOUND) return;

        const IMPACT_THRESHOLD_PX = observer.radius; // 40px

        if (Math.abs(sourceX - observerX) < IMPACT_THRESHOLD_PX) {
            if (timestamp - machImpactLast > 0.7) {
                machImpactLast = timestamp;

                // ef czyt graficzny
                const obsElem = document.getElementById("observer1");
                const cont = document.querySelector(".container");
                const obsRect = obsElem.getBoundingClientRect();
                const contRect = cont.getBoundingClientRect();

                const impact = document.createElement("div");
                impact.className = "mach-impact";
                impact.style.left = obsRect.left + obsRect.width / 2 - contRect.left + "px";
                impact.style.top = obsRect.top + obsRect.height / 2 - contRect.top + "px";
                cont.appendChild(impact);
                impact.addEventListener("animationend", () => impact.remove());

                // oryginalne emitowanie shockwave
                emitShockwaveFromObserver();
            }
        }
    }
})();
