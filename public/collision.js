/*
    Bartłomiej Barszczewski
    Fizyka
    Efekt Dopplera i zjawisko stożka Macha
    
    Ten moduł symuluje rozchodzenie się fal dźwiękowych, efekt Dopplera
    oraz wizualizuje stożek Macha przy prędkościach ponaddźwiękowych.

    Wzory wykorzystane w symulacji:
        1. Promień fali: r(t) = v_wave * t,
        gdzie v_wave = |c - v_source| (prędkość propagacji fali względem źródła).
        2. Przeliczenie prędkości na piksele: speed_pxps = v_effective * (canvas.width / (c * METERS_PER_PERCENT)).
        3. Kąt stożka Mach (podstawowy): sin(θ) = c / v_source dla v_source > c (użytkowo nieobliczany, ale wizualizacja uderzenia oparta na warunku supersonicznym).
        4. Odbicie wektora: R = D - 2 (D·N) N,
        gdzie D to wektor padający, N normalna powierzchni.
        5. Odległość od obserwatora: d = √(dx² + dy²).
        6. Warunek kolizji front fal: |d - r| < v_wave * dt,
        zapewnia detekcję, gdy fala dociera do obserwatora w kroku czasowym dt.
*/

(function () {
    const container = document.querySelector(".container");
    const canvas = document.getElementById("waveCanvas");
    const ctx = canvas.getContext("2d");
    const SPEED_OF_SOUND = 343;
    const METERS_PER_PERCENT = 3.43; // Skalowanie: metry na procent wymiaru kanwy

    // Obiekt obserwatora: pozycja i promień wykorzystywany do detekcji kolizji

    const observer = {x: canvas.width * METERS_PER_PERCENT, y: canvas.height * METERS_PER_PERCENT, radius: 50};
    let objectPositionX = 0; // Śledzi poziomą pozycję źródła dźwięku

    /**
     * Klasa reprezentująca pojedynczą falę dźwiękową.
     * Odpowiada za jej rozszerzanie, zanikanie i czas życia,
     * uwzględniając prędkość źródła względem prędkości dźwięku.
     * Mniejszy lifetime (×0.25) sprawia, że fale szybciej znikają,
     * co ułatwia obserwację efektu stożka Mach.
     */
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

            // Obliczamy czas życia fali: dłuższy przy wolnych prędkościach,
            // standardowy przy supersonicznych (Mach cone).
            const diag = Math.hypot(canvas.width, canvas.height);
            const baseLifetime = this.speed < 20 ? METERS_PER_PERCENT : diag / Math.max(1, this.speed);

            this.lifetime = baseLifetime * 0.25;
            this.alive = true;
        }

        /**
         * Aktualizuje promień i wiek fali; oznacza martwą przy przekroczeniu czasu życia.
         */
        update(dt) {
            this.age += dt;
            if (this.age >= this.lifetime) this.alive = false;
            this.radius += this.speed * dt * METERS_PER_PERCENT;
        }
        /**
         * Rysuje falę jako okrąg z zanikaną przezroczystością.
         * Przesuwa punkt wyjścia na osi X o promień emitującego elementu #movingDot,
         * aby odzwierciedlić przesunięcie źródła (efekt Dopplera dla prędkości poniżej 343 m/s).
         */
        draw(ctx) {
            const t = this.age / this.lifetime;
            const alpha = this.amplitude * (1 - t);
            const movingDotHTML = document.getElementById("movingDot");
            const compStyle = window.getComputedStyle(movingDotHTML);
            const widthPx = parseFloat(compStyle.width);
            const movingDotRadius = widthPx / 2;
            // obliczam promień
            // obiektu który emituje falę
            // tak aby przesunąć na osi X falę do przodu dla
            // odzwierciedlenia efektu Dopplera
            // dla prędkości poniżej 343 m/s
            //
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.lineWidth;
            ctx.beginPath();
            ctx.arc(this.x + movingDotRadius, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * Odbija wektor kierunku (dirX, dirY) względem normalnej (nX, nY).
     * Używane do symulacji odbicia fali od obserwatora.
     */
    function reflect(dirX, dirY, nX, nY) {
        const dot = dirX * nX + dirY * nY;
        return {x: dirX - 2 * dot * nX, y: dirY - 2 * dot * nY};
    }

    /**
     * Sprawdza, czy front fali koliduje z obserwatorem w danym kroku czasowym.
     * Kolizja inicjuje efekt stożka Macha, jeśli źródło ma prędkość supersoniczną.
     */
    function checkCollision(w, obs, dt) {
        const dx = w.x - obs.x;
        const dy = w.y - obs.y;
        const d = Math.hypot(dx, dy);
        return Math.abs(d - w.radius) < w.speed * dt;
    }

    let waves = [];
    let reflections = [];
    let lastTime = performance.now();

    /**
     * Dostosowuje rozmiar kanwy do wymiarów kontenera i resetuje symulację.
     */
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        waves = [];
        reflections = [];
        observer.x = canvas.width * 0.5;
        observer.y = canvas.height * 0.5;
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    /**
     * Główna pętla animacji: aktualizuje i rysuje fale,
     * sprawdza kolizje i generuje wizualizację uderzenia Mach Cone.
     */
    function animate(t) {
        const dt = (t - lastTime) / 1000;
        lastTime = t;
        const obsElem = document.getElementById("observer1");
        const contRect = container.getBoundingClientRect();
        const obsRect = obsElem.getBoundingClientRect();
        observer.x = obsRect.left + obsRect.width / 2 - contRect.left;
        observer.y = obsRect.top + obsRect.height / 2 - contRect.top;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let w of waves) {
            if (!w.alive) continue;
            w.update(dt);
            w.draw(ctx);
            if (checkCollision(w, observer, dt)) {
                w.alive = false;

                // Sprawdzamy, czy obiekt jest za obserwatorem i czy przekracza prędkość dźwięku
                const isBehindObserver = objectPositionX < observer.x;
                const isSupersonic = w.sourceSpeed_mps > SPEED_OF_SOUND;

                if (isBehindObserver && isSupersonic) {
                    // Wyświetl efekt wizualny tylko w tych warunkach
                    const cont = document.querySelector(".container");
                    const obsElem = document.getElementById("observer1");
                    const obsRect = obsElem.getBoundingClientRect();
                    const contRect = cont.getBoundingClientRect();

                    const impact = document.createElement("div");
                    impact.className = "mach-impact";
                    impact.style.position = "absolute";
                    impact.style.left = obsRect.left + obsRect.width / 2 - contRect.left + "px";
                    impact.style.top = obsRect.top + obsRect.height / 2 - contRect.top + "px";
                    impact.style.zIndex = "10000";
                    cont.appendChild(impact);
                    impact.addEventListener("animationend", () => impact.remove());
                }

                // Odbicie fali (niezależnie od warunków wizualizacji)
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

    // Funkcja emitująca pojedynczą falę na podstawie procentowej pozycji źródła
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

    /**
     * Aktualizuje położenie źródła i obserwatora w poziomie,
     * kluczowe dla detekcji kolizji i generacji stożka Macha.
     */
    window.setMachImpactPositions = function (sourceX, observerX) {
        window.lastSourceX = sourceX;
        window.lastObserverX = observerX;
        objectPositionX = sourceX; // Śledzenie pozycji obiektu względem obserwatora
    };

    window.Wave = Wave;
    window.reflect = reflect;
    window.checkCollision = checkCollision;
    requestAnimationFrame(animate);
})();
