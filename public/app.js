/*
    Bartłomiej Barszczewski
    Fizyka
    Efekt Dopplera i zjawisko stożka Macha
    Semestr II
    Grupa B
*/
// Pobieramy <canvas> i 2D-kontekst do rysowania fal
const canvas = document.getElementById("waveCanvas");
const ctx = canvas.getContext("2d");

// Łapiemy kropkę (#movingDot), która reprezentuje Twoje „źródło” fali
const movingDot = document.getElementById("movingDot");

// Element, w którym będziemy wyświetlać szczegóły efektu Dopplera
const dopplerDetails = document.getElementById("dopplerDetails");

// Kontener do responsywnego dopasowania wielkości <canvas>
const container = document.querySelector(".container");


// Sterowanie prędkością i częstotliwością – inputy i ich wyświetlacze
const speedControl = document.getElementById("speedControl");
const speedControlInput = document.getElementById("speedControlInput");
const frequencyControl = document.getElementById("frequencyControl");
const frequencyControlInput = document.getElementById("frequencyControlInput");
const speedDisplay = document.getElementById("speedDisplay");
const frequencyDisplay = document.getElementById("frequencyDisplay");
const speedDetails = document.getElementById("speedDetails");

// Elementy wizualizujące stożek Macha (bazowa, górna i dolna część)
const shockwaveBase = document.getElementById("shockwave_base");
const shockwaveUpper = document.getElementById("shockwave_upper");
const shockwaveLower = document.getElementById("shockwave_lower");

// Obserwator w DOM, jego pozycja decyduje o kolizji z frontem fali
const observer = document.getElementById("observer1");

// Domyślne wartości, gdy UI jest puste lub niezaładowane
const DEFAULT_FREQ = 400; // Hz
const DEFAULT_SPEED = 25; // m/s

// Stałe fizyczne i skalujące:
// SPEED_OF_SOUND – prędkość dźwięku (m/s),
// METERS_PER_PERCENT – ile metrów na 1% szerokości kontenera
const SPEED_OF_SOUND = 343;
const METERS_PER_PERCENT = 1;
const waveSpeedPercentPerSecond = (SPEED_OF_SOUND / METERS_PER_PERCENT) * 100;

// Symulowana prędkość dźwięku w Twojej skali
const SPEED_OF_SOUND_SIM = SPEED_OF_SOUND / METERS_PER_PERCENT;

// Dodatkowe współczynniki sterujące przebiegiem symulacji
const SCALE_FACTOR = 3.43; // wpływa na tempo ruchu kropki
const WAVE_LIFETIME = 3.43; // ile sekund żyje fala na ekranie
const CONE_WIDTH_PERCENT = 100; // szerokość stożka w % szerokości canvas
const MIN_SHOCKWAVE_INTERVAL = 1; // sekundy między uderzeniami fali uderzeniowej
const FREQUENCY_SCALE_FACTOR = 1000; // do przeliczeń audio

// Zmienne dynamiczne stanu symulacji:
let observerX = 50; // procentowa pozycja obserwatora
let sourceX = 50; // procentowa pozycja źródła
let speed = parseFloat(speedControl.value) || DEFAULT_SPEED;
let sourceFrequency = parseFloat(frequencyControl.value) || DEFAULT_FREQ;
let lastWaveTime = 0; // timestamp ostatniej emisji fali
let waves = []; // tablica aktywnych obiektów Wave
let isFrequencyManual = false;
let currentType = null;
let lastShockwavePos = null;
let lastShockwaveTime = 0;
let freqObserver = null;
let reflectedWaveTimeouts = [];
let reflection2DTimeouts = [];

// Skrót do prędkości dźwięku w równaniach
const c = SPEED_OF_SOUND;

// Zmienne Web Audio API – inicjalizowane przy pierwszym odtworzeniu dźwięku
let audioContext = null;
let osc = null;
let gain = null;
let lfo = null;
let lfoGain = null;

// Typy dźwięków silnika, pauza itp.
let currentSoundType = null;
let lastEngineSoundType = null;
let isPaused = false;


// Funkcja: przy zmianie rozmiaru okna aktualizuje wielkość <canvas>
// dzięki temu rysunek zawsze pasuje do .container
function resizeWaveCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeWaveCanvas);
resizeWaveCanvas(); // initial setup

let coneStartTime = null;


/**
 * showResultsModal()
 *
 * Wyświetla okno z wynikami symulacji, gdy użytkownik zatrzyma animację:
 * 1. Jeśli symulacja nie jest wstrzymana, przycisk pauzy zabłyśnie na czerwono
 *    kilka razy, by zwrócić uwagę, i funkcja zakończy działanie.
 * 2. Gdy symulacja jest wstrzymana, oblicza i pokazuje w tabeli:
 *    – Prędkość (m/s → km/h i mph)
 *    – Liczbę Macha: M = v / c
 *    – Kąt stożka Mach: θ = arcsin(c / v)   dla v ≥ c
 *    – Długość fali: λ = c / f₀
 *    – Przesunięcie Dopplera:
 *        f′ = f₀ · (c / (c ∓ v))  
 *      gdzie „–” jeśli źródło się zbliża, „+” jeśli oddala
 *    – Δf = f′ – f₀, współczynnik Dopplera: f′ / f₀
 *    – Odległość: Δx = |x_obs – x₀| · METERS_PER_PERCENT
 *    – Czas dotarcia fali: t = d / c
 *    – Przesunięcie fazowe: Δφ = (2π · d) / λ
 *    – Energia względna: E ∝ 1 / d²
 *    – Słyszalność: f₀ ∈ [20, 20000] Hz
 * 
 * Następnie wypełnia tabelę w modalu odpowiednimi wartościami i pokazuje go.
 */
function showResultsModal() {
    const modalResults = document.getElementById("results-modal");

    if (!isPaused) {
        const pauseBtn = document.getElementById("pauseBtn");

        const flashColor = (bg, color, delay) => {
            setTimeout(() => {
                pauseBtn.style.backgroundColor = bg;
                pauseBtn.style.color = color;
            }, delay);
        };

        flashColor("red", "white", 0);
        flashColor("#fff", "black", 300);
        flashColor("red", "white", 600);
        flashColor("#fff", "black", 900);
        flashColor("red", "white", 1500);
        flashColor("#fff", "black", 1800);
        flashColor("red", "white", 2100);
        flashColor("#fff", "black", 2400);
        return;
    }

    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    const mach = speed / SPEED_OF_SOUND;
    const theta = mach >= 1 ? Math.asin(1 / mach) : null;

    const lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    const relativeVelocity = sourceX < observerX ? speed : -speed;
    const freqObserverNum = dopplerFrequencySound(sourceFrequency, SPEED_OF_SOUND, relativeVelocity, 0);
    const deltaF = freqObserverNum - sourceFrequency;
    const dopplerCoeff = freqObserverNum / sourceFrequency;
    const distancePercent = Math.abs(observerX - sourceX);
    const distanceMeters = distancePercent * METERS_PER_PERCENT;
    const distanceText = `${distanceMeters.toFixed(2)} m`; // Dodana definicja distanceText
    const timeToObserver = distanceMeters / SPEED_OF_SOUND;
    const phaseShift = (2 * Math.PI * distanceMeters) / (lambda > 0 ? lambda : 1);
    const energyAtObs = 1 / Math.pow(distanceMeters || 1, 2);
    const isAudible = sourceFrequency >= 20 && sourceFrequency <= 20000;

    const rows = [
        ["Prędkość", `${speed.toFixed(2)} m/s | ${kmh.toFixed(2)} km/h | ${mph.toFixed(2)} mph`, "—"],
        ["Liczba Macha", mach.toFixed(2), "M = v / v_dźw"],
        ["Częstotliwość źródła", `${sourceFrequency.toFixed(1)} Hz`, "Dana"],
        ["Długość fali", `${lambda.toFixed(2)} m`, "λ = v_dźw / f₀"],
        ["Częstotliwość obserwatora", `${freqObserverNum.toFixed(1)} Hz`, "f' = f₀ · v_dźw / (v_dźw - v)"],
        ["Odległość od obserwatora", distanceText, "Δx = x₀ - x_obs"],
        ["Δf (Przesunięcie Dopplera)", `${deltaF.toFixed(2)} Hz`, "Δf = f' - f₀"],
        ["Współczynnik Dopplera", dopplerCoeff.toFixed(3), "f' / f₀"],
        ["Czas dotarcia fali", `${timeToObserver.toFixed(3)} s`, "t = d / v_dźw"],
        ["Przesunięcie fazowe", `${phaseShift.toFixed(2)} rad`, "Δφ = 2π · d / λ"],
        ["Energia względna", energyAtObs.toExponential(2), "E ∝ 1 / d²"],
        [
            "Kąt stożka Macha",
            mach < 1 ? "—" : `${((theta * 180) / Math.PI).toFixed(1)}° / ${theta.toFixed(3)} rad`,
            "sin(θ) = v_dźw / v",
        ],
        ["Słyszalność", isAudible ? "TAK" : "NIE", "f₀ ∈ [20, 20000] Hz"],
    ];
    const tbody = document.getElementById("results-table-body");
    tbody.innerHTML = "";

    rows.forEach(([param, value, formula]) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${param}</td><td>${value}</td><td>${formula}</td>`;
        tbody.appendChild(row);
    });

    modalResults.style.display = "flex";
}

/**
 * startAmbulanceSiren()
 *
 * Uruchamia syrenę ambulansową przy użyciu Web Audio API:
 * 1. Tworzy AudioContext (nowy kontekst dźwiękowy).
 * 2. Generuje dwa oscylatory:
 *    – osc: główny ton syreny (fala kwadratowa, 700 Hz)
 *    – lfo: modulacja tonów (fala trójkątna, 5 Hz)
 * 3. Za pomocą gain (lfoGain o wartości 250 Hz) łączy LFO z częstotliwością głównego oscylatora,
 *    co daje charakterystyczne „migotanie” tonu syreny.
 * 4. Ustawia głośność syreny na 50% i podłącza wyjście do domyślnego urządzenia audio.
 *
 * */
 
function startAmbulanceSiren() {
    stopAmbulanceSiren();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    osc = audioContext.createOscillator();
    osc.type = "square";
    osc.frequency.value = 700;

    lfo = audioContext.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.value = 5;

    lfoGain = audioContext.createGain();
    lfoGain.gain.value = 250;

    lfo.connect(lfoGain);

    lfoGain.connect(osc.frequency);

    gain = audioContext.createGain();
    gain.gain.value = 0.5;

    osc.connect(gain);

    gain.connect(audioContext.destination);

    osc.start();
    lfo.start();
}

/* *
* stopAmbulanceSiren()
*
* Zatrzymuje syrenę i czyści zasoby:
* – Zatrzymuje (stop) i odłącza (_disconnect_) oba oscylatory (osc, lfo).
* – Odłącza obiekty gain (lfoGain, gain).
* – Zamyka AudioContext, aby zwolnić zasoby systemowe.
*/
function stopAmbulanceSiren() {
    if (osc) {
        try {
            osc.stop();
            osc.disconnect();
        } catch (e) {}
        osc = null;
    }

    if (lfo) {
        try {
            lfo.stop();
            lfo.disconnect();
        } catch (e) {}
        lfo = null;
    }

    if (lfoGain) {
        try {
            lfoGain.disconnect();
        } catch (e) {}
        lfoGain = null;
    }

    if (gain) {
        try {
            gain.disconnect();
        } catch (e) {}
        gain = null;
    }

    if (audioContext) {
        try {
            audioContext.close();
        } catch (e) {}
        audioContext = null;
    }
}

/**
 * startEngineSound(type)
 *
 * Włącza dźwięk silnika lub syrenę w zależności od typu:
 * 1. Jeśli typ się nie zmienił, nic nie robi (zapobiega restartowi).
 * 2. Zatrzymuje poprzedni dźwięk (stopEngineSound).
 * 3. Dla typu "ambulance" wywołuje startAmbulanceSiren().
 * 4. W przeciwnym razie tworzy nowy AudioContext, oscylator i gain:
 *    – typ oscylatora: "square" (sport) lub "sine" (inne)
 *    – częstotliwość: 60 Hz (sport) lub 40 Hz (inne)
 *    – poziom głośności: 0.5
 *    – podłącza do wyjścia audio i uruchamia oscylator.
 */
function startEngineSound(type) {
    if (currentSoundType === type) return;
    stopEngineSound();
    currentSoundType = type;

    if (type === "ambulance") {
        startAmbulanceSiren();
        return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    osc = audioContext.createOscillator();
    gain = audioContext.createGain();

    if (type === "sport") {
        osc.type = "square";
        osc.frequency.value = 60;
    } else {
        osc.type = "sine";
        osc.frequency.value = 40;
    }
    gain.gain.value = 0.5;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
}

/**
 * stopEngineSound()
 *
 * Wyłącza wszystkie aktywne dźwięki silnika i syreny:
 * 1. Najpierw wywołuje stopAmbulanceSiren() dla bezpieczeństwa.
 * 2. Zatrzymuje i odłącza oscylator (osc), jeśli istnieje.
 * 3. Odłącza gain, zamyka AudioContext, zwalnia zasoby.
 * 4. Resetuje flagę currentSoundType, aby można było ponownie włączyć ten sam dźwięk.
 */
function stopEngineSound() {
    stopAmbulanceSiren();

    if (osc) {
        try {
            osc.stop();
            osc.disconnect();
        } catch (e) {}
        osc = null;
    }

    if (gain) {
        try {
            gain.disconnect();
        } catch (e) {}
        gain = null;
    }

    if (audioContext) {
        try {
            audioContext.close();
        } catch (e) {}
        audioContext = null;
    }

    currentSoundType = null;
}

const VEHICLE_CONFIG = {
    ambulance: {
        volumeFactor: 0.07,
        silenceThreshold: 40,
    },
    sport: {
        baseFrequency: 30,
        frequencyScale: 0.11,
        minFrequency: 20,
        maxFrequency: 52,
        volumeFactor: 0.3,
        silenceThreshold: 20,
    },
};

/**
 * Oblicza dystans między źródłem a obserwatorem w metrach.
 * Wzór: |xₛ - xₒ| * przelicznik
 * - xₛ: pozycja źródła
 * - xₒ: pozycja obserwatora
 */
function calculateDistance(sourcePositionX, observerPositionX) {
    const percentToMeters = METERS_PER_PERCENT;
    return Math.abs(sourcePositionX - observerPositionX) * percentToMeters;
}

/**
 * Oblicza głośność dźwięku na podstawie dystansu.
 * Wzór:
 *   volume = min(1, 1 / max(d, dₘᵢₙ)²) * vFactor
 *   jeśli d > próg_ciszy → zwraca 0
 * - d: dystans
 * - dₘᵢₙ: minimalny dystans (żeby uniknąć dzielenia przez 0)
 * - vFactor: współczynnik głośności
 * - próg_ciszy: powyżej tej wartości nie słychać dźwięku
 */
function calculateVolume(distance, minDistance, volumeFactor, silenceThreshold) {
    const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * volumeFactor;
    return distance > silenceThreshold ? 0 : volume;
}

/**
 * Aktualizuje dźwięk silnika w zależności od typu pojazdu, pozycji i prędkości.
 * - Jeśli typ się zmienił → uruchamia nowy dźwięk
 * - Jeśli typ nie jest 'ambulance' lub 'sport' → zatrzymuje dźwięk
 * - Sprawdza czy audioContext i gain są gotowe
 * - Dla 'ambulance':
 *     → oblicza głośność przez calculateVolume
 * - Dla 'sport':
 *     → oblicza głośność i częstotliwość podstawową:
 *        freq = baseFrequency + frequencyScale × prędkość
 *     → dopasowuje freq do zakresu min–max
 *     → stosuje efekt Dopplera:
 *        f' = f × (c / (c ± v))
 *        - f: częstotliwość źródła
 *        - c: prędkość dźwięku
 *        - v: prędkość źródła względem obserwatora (ujemna/gdy się oddala)
 *     → ustawia nową głośność i częstotliwość na oscylatorze
 */
function updateEngineSound(type, sourcePositionX, observerPositionX, vehicleSpeed) {
    if (type !== lastEngineSoundType) {
        startEngineSound(type);
        lastEngineSoundType = type;
    }

    if (!["ambulance", "sport"].includes(type)) {
        stopEngineSound();
        return;
    }

    if (!audioContext || !gain) {
        console.warn("Audio context or gain node is not initialized.");
        return;
    }

    const distance = calculateDistance(sourcePositionX, observerPositionX);
    const minDistance = 1;

    if (type === "ambulance") {
        const config = VEHICLE_CONFIG.ambulance;
        const volume = calculateVolume(distance, minDistance, config.volumeFactor, config.silenceThreshold);
        gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.03);
    } else if (type === "sport") {
        const config = VEHICLE_CONFIG[type];
        const volume = calculateVolume(distance, minDistance, config.volumeFactor, config.silenceThreshold);

        let frequency = config.baseFrequency + config.frequencyScale * vehicleSpeed;
        frequency = Math.max(config.minFrequency, Math.min(frequency, config.maxFrequency));

        const relativeVelocity = sourcePositionX < observerPositionX ? vehicleSpeed : -vehicleSpeed;
        const dopplerFreq = dopplerFrequencySound(frequency, SPEED_OF_SOUND, relativeVelocity, 0);

        if (isNaN(dopplerFreq)) {
            console.error("Invalid Doppler frequency calculated.");
            return;
        }

        gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
        if (osc) {
            osc.frequency.linearRampToValueAtTime(dopplerFreq, audioContext.currentTime + 0.02);
        }
    }
}

/**
 * updateMachConeAndLines()
 *
 * Rysuje dynamiczny stożek Macha jako zaokrąglony, wypełniony trójkąt SVG,
 * widoczny tylko gdy obiekt porusza się szybciej niż dźwięk (Mach > 1).
 *
 * Uwzględniane efekty:
 * - Kąt stożka: θ = arcsin(1 / Mach)
 * - Długość ramienia: zależna od liczby Macha (im większa, tym dłuższy stożek)
 * - Zaokrąglone ramiona z wykorzystaniem krzywych Béziera (`<path>`)
 * - Kolor stożka zmienia się w zależności od liczby Macha:
 *     < 1.5 → niebieskawy, < 2 → żółty, ≥ 2 → czerwony
 *
 * Parametry geometryczne:
 * - dx = L × cos(θ) — przesunięcie poziome od źródła
 * - dy = L × sin(θ) — przesunięcie pionowe (góra/dół)
 * - Wypukłość kontrolowana przez `controlOffsetX` (punkt kontrolny Q)
 *
 * Stożek jest rysowany jako:
 * - Krzywa Q do końca górnej linii
 * - Linia prosta w dół
 * - Krzywa Q powrotna do źródła
 * - Zamknięcie ścieżki `Z`
 */
function updateMachConeAndLines() {
    const dotRect = movingDot.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const srcX = dotRect.left + dotRect.width / 2 - contRect.left;
    const srcY = dotRect.top + dotRect.height / 2 - contRect.top;

    const V = parseFloat(speedControl.value);
    const path = document.getElementById("shockwave_path");

    if (V < SPEED_OF_SOUND) {
        path.setAttribute("d", "");
        path.style.display = "none";
        return;
    }

    const mach = V / SPEED_OF_SOUND;
    const theta = Math.asin(1 / mach);

    // dynamiczna długość stożka: im większy Mach, tym dłuższy
    const baseLengthPercent = 0.05; // minimum
    const dynamicFactor = Math.min(mach - 1, 3); // ogranicz do max 3 dla ekstremalnych prędkości
    const maxDx = contRect.width * (baseLengthPercent + dynamicFactor * 0.05); // np. 0.025 → 0.055
    const L = maxDx / Math.cos(theta);

    const dx = L * Math.cos(theta);
    const dy = L * Math.sin(theta);

    const upperEndX = srcX - dx;
    const upperEndY = srcY - dy;
    const lowerEndX = srcX - dx;
    const lowerEndY = srcY + dy;

    // wypukłość ramion
    const controlOffsetX = 20;
    const controlUpperX = upperEndX - controlOffsetX;
    const controlLowerX = lowerEndX - controlOffsetX;

    // kolor dynamiczny: zielony < 1.5M, żółty < 2M, czerwony ≥ 2M
    let color;
    if (mach < 1.25) {
        color = "rgba(36, 208, 255, 0.46)";
    } else if (mach < 1.75) {
        color = "rgba(255, 255, 0, 0.56)";
    } else {
        color = "rgba(255, 0, 0, 0.44)";
    }

    // rysowanie ścieżki
    const d = `
        M ${srcX} ${srcY}
        Q ${controlUpperX} ${upperEndY} ${upperEndX} ${upperEndY}
        L ${lowerEndX} ${lowerEndY}
        Q ${controlLowerX} ${lowerEndY} ${srcX} ${srcY}
        Z
    `;

    path.setAttribute("d", d.trim());
    path.setAttribute("fill", color);
    path.style.display = "block";
}

/**
 * clearReflectedWaves
 * Czyści z ekranu fale odbite, znaczniki debug i czyści związane timeouty.
 * - Usuwa elementy DOM `.wave-reflected`, `.mach-impact`, `.debug-marker`
 * - Czyści listy timeoutów: `reflectedWaveTimeouts`, `reflection2DTimeouts`
 */
function clearReflectedWaves() {
    document.querySelectorAll(".wave-reflected, .mach-impact, .debug-marker").forEach((el) => el.remove());
    reflectedWaveTimeouts.forEach((id) => clearTimeout(id));
    reflection2DTimeouts.forEach((id) => clearTimeout(id));
    reflectedWaveTimeouts = [];
    reflection2DTimeouts = [];
}

/**
 * updateDopplerDetails
 * Aktualizuje panel z parametrami efektu Dopplera i fali.
 *
 * Wzory i obliczenia:
 *   λ = c / fₛ — długość fali
 *   Δf = fₒ - fₛ — przesunięcie Dopplera
 *   Doppler coeff = fₒ / fₛ — współczynnik Dopplera
 *   t = d / c — czas dotarcia fali
 *   przesunięcie fazy = (2π × d) / λ
 *   energia względna = 1 / d²
 *   słyszalność: 20Hz ≤ fₛ ≤ 20000Hz
 */
function updateDopplerDetails() {
    let lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    let freqObserverNum = typeof freqObserver === "number" ? freqObserver : null;
    let deltaF = freqObserverNum !== null ? freqObserverNum - sourceFrequency : null;
    let dopplerCoeff = freqObserverNum !== null ? freqObserverNum / sourceFrequency : null;
    let distancePercent = Math.abs(observerX - sourceX);
    let distanceMeters = distancePercent * METERS_PER_PERCENT;
    let timeToObserver = distanceMeters / SPEED_OF_SOUND;
    let timeToObserverPercent;

    if (speed < SPEED_OF_SOUND) {
        timeToObserverPercent = distancePercent / SPEED_OF_SOUND_SIM;
    } else {
        const speedSim = (speed / SPEED_OF_SOUND) * SPEED_OF_SOUND_SIM;
        timeToObserverPercent = distancePercent / Math.max(speedSim - SPEED_OF_SOUND_SIM, 0.001);
    }

    let phaseShift = (2 * Math.PI * distanceMeters) / (lambda > 0 ? lambda : 1);
    let energyAtObs = 1 / Math.pow(distanceMeters || 1, 2);
    let isAudible = sourceFrequency >= 20 && sourceFrequency <= 20000;
    let wavefrontsPerSecond = sourceFrequency;

    dopplerDetails.innerHTML = `
            <b>Dodatkowe parametry:</b><br>
            Przesunięcie Dopplera Δf: ${deltaF !== null ? deltaF.toFixed(2) + " Hz" : "—"}<br>
            Współczynnik Dopplera: ${dopplerCoeff !== null ? dopplerCoeff.toFixed(3) : "—"}<br>
            Czas dotarcia fali: ${timeToObserver.toFixed(3)} s<br>
            Przesunięcie fazowe: ${phaseShift.toFixed(2)} rad<br>
            Energia względna: ${energyAtObs.toExponential(2)}<br>
            Słyszalność: ${isAudible ? "TAK" : "NIE"}<br>
        `;
}

/**
 * adjustBodyStyle
 * Ustawia styl tła dokumentu (obraz, rozmiar, powtarzanie, pozycję, kolor).
 * - Służy do dynamicznej zmiany wyglądu strony (np. tryb nocny, tryb efektu)
 */
function adjustBodyStyle({url, bgSize, bgRepeat, bgPosition, bgColor}) {
    document.body.style.backgroundImage = url;
    document.body.style.backgroundSize = bgSize;
    document.body.style.backgroundRepeat = bgRepeat;
    document.body.style.backgroundPosition = bgPosition;
    document.body.style.backgroundColor = bgColor;
}

/**
 * updateDisplays
 * Aktualizuje wartości wyświetlane na ekranie (prędkość, częstotliwość) 
 * na podstawie aktualnych wartości inputów.
 */
function updateDisplays() {
    speedDisplay.textContent = speedControl.value;
    frequencyDisplay.textContent = frequencyControl.value;
}

/**
 * updateSpeedDisplay
 * Aktualizuje wyświetlane dane dotyczące prędkości źródła i efektów z nią związanych.
 *
 * Obliczenia:
 * - Prędkość w km/h: v × 3.6
 * - Prędkość w mph: v × 2.23694
 * - Liczba Macha: M = v / c
 * - Długość fali: λ = c / fₛ
 * - Częstotliwość obserwatora: f' = f × (c / (c ± v))
 * - Kąt stożka Macha (jeśli v ≥ c): θ = arcsin(c / v)
 * - Wypisuje też odległość względem obserwatora (przed/za/na)
 *
 * Dodatkowo wywołuje updateDopplerDetails().
 */
function updateSpeedDisplay() {
    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    let lambda, machAngleDeg, machAngleRad;
    try {
        lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
        const mach = speed / SPEED_OF_SOUND;

        freqObserver = dopplerFrequencySound(sourceFrequency, SPEED_OF_SOUND, sourceX < observerX ? speed : -speed, 0);

        if (speed < SPEED_OF_SOUND) {
            machAngleDeg = "-";
            machAngleRad = "-";
        } else {
            const theta = Math.asin(SPEED_OF_SOUND / speed);
            machAngleRad = theta;
            machAngleDeg = theta * (180 / Math.PI);
        }

        const distance = sourceX - observerX;
        let distanceText;
        if (distance < 0) {
            distanceText = `PRZED obserwatorem (${distance.toFixed(2)}%)`;
        } else if (distance > 0) {
            distanceText = `ZA obserwatorem (+${distance.toFixed(2)}%)`;
        } else {
            distanceText = "Na obserwatorze (0%)";
        }

        speedDisplay.textContent = speed.toFixed(2);
        speedDetails.innerHTML = `
                    <b> Główne parametry: </b><br>
                    Prędkość: ${speed.toFixed(2)} m/s | ${kmh.toFixed(2)} km/h | ${mph.toFixed(2)} mph<br>
                    Liczba Macha: ${mach.toFixed(2)}<br>
                    Częstotliwość źródła: ${sourceFrequency.toFixed(1)} Hz<br>
                    Długość fali: ${lambda.toFixed(2)} m<br>
                    Częstotliwość obserwatora (x=${observerX.toFixed(3)}%): ${
            typeof freqObserver === "number" ? freqObserver.toFixed(1) + " Hz" : freqObserver
        }<br>
        Kąt stożka Macha: ${
            machAngleDeg !== "-"
                ? machAngleDeg.toFixed(2) + "° / " + machAngleRad.toFixed(3) + " rad"
                : "— (podświetlenie dla poddźwiękowych)"
        }
        <br>
        <b>Odległość od obserwatora: ${distanceText}</b>
        `;

        updateDopplerDetails();
    } catch (error) {
        console.error("Błąd w updateSpeedDisplay:", error);
    }
}

/**
 * updateFrequencyDisplay
 * Aktualizuje wyświetlaną częstotliwość źródła.
 * Wywołuje również updateSpeedDisplay(), ponieważ częstotliwość wpływa na resztę danych.
 */
function updateFrequencyDisplay() {
    frequencyDisplay.textContent = sourceFrequency.toFixed(2);
    updateSpeedDisplay();
}

/**
 * createDebugMarker
 * Tworzy tymczasowy znacznik (kreskę) na kontenerze w zadanej pozycji X (w % szerokości).
 * - Jeśli istnieje poprzedni znacznik → usuwa go
 * - Dodaje nowy `.debug-marker` i usuwa go po 1 sekundzie
 */
function createDebugMarker(xPosition) {
    const existingMarker = document.querySelector(".debug-marker");
    if (existingMarker) existingMarker.remove();

    const marker = document.createElement("div");
    marker.classList.add("debug-marker");

    marker.style.left = `${xPosition}%`;
    marker.style.top = "50%";
    marker.style.transform = "translate(-50%, -50%)";

    container.appendChild(marker);

    setTimeout(() => {
        marker.remove();
    }, 1000);
}


/**
 * update(timestamp)
 * Główna pętla animacji — aktualizuje pozycję źródła dźwięku, wygląd tła, typ pojazdu,
 * fale dźwiękowe, efekty dźwiękowe oraz wizualizację stożka Macha.
 *
 * Zakres działania:
 * - Przesuwa źródło dźwięku (`sourceX`) na podstawie prędkości i upływu czasu
 * - Resetuje pozycję źródła po wyjściu poza ekran (pętla)
 * - Na podstawie prędkości klasyfikuje pojazd jako:
 *     - `ambulance` (1–50 m/s)
 *     - `sport` (50–117 m/s)
 *     - `jet` (117–664 m/s)
 *     - `missile` (≥ 664 m/s)
 * - Dostosowuje wygląd strony (tło, sprite'y) i częstotliwość źródła
 * - Jeśli prędkość < prędkości dźwięku:
 *     - Emituje fale kuliste z częstotliwością `sourceFrequency`
 * - Jeśli prędkość ≥ prędkości dźwięku i typ to `jet` lub `missile`:
 *     - Oblicza kąt stożka Macha: θ = arcsin(c / v)
 *     - Wyznacza pozycję krawędzi stożka Macha (`edgeX`)
 *     - Sprawdza, czy stożek dotyka obserwatora
 *         - Jeśli tak i minęło wystarczająco dużo czasu:
 *             - Odtwarza dźwięk fali uderzeniowej
 *             - Wyświetla wizualny efekt uderzenia (`.mach-impact`)
 * - Obsługuje dźwięk silnika odrzutowego (startuje w odpowiednim momencie)
 * - Kończy się:
 *     - Wywołaniem `requestAnimationFrame(update)`
 *     - Aktualizacją stożka Macha (`updateMachConeAndLines`)
 *     - Aktualizacją parametrów prędkości (`updateSpeedDisplay`)
 *     - Aktualizacją dźwięku silnika (`updateEngineSound`)
 *     - Przekazaniem pozycji do `setMachImpactPositions`
 */
function update(timestamp) {
    if (isPaused) return;
    const deltaTime = 0.016;
    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * SCALE_FACTOR;
    if (sourceX > 100) {
        sourceX -= 100;
        lastShockwavePos = null;
        lastShockwaveTime = 0;
    }

    if (movingDot) {
        movingDot.style.left = `${sourceX}%`;
    }

    const isAmbulance = speed > 1 && speed <= 50;
    const isCarSport = speed > 50 && speed <= 117;
    const isJet = speed > 117 && speed < 664;
    const isMissile = speed >= 664;

    let newType = null;

    if (isAmbulance) {
        adjustBodyStyle({
            url: "url('./css/img/arizona_road.jpg')",
            bgSize: "cover",
            bgRepeat: "no-repeat",
            bgPosition: "0px -280px",
            bgColor: "#e6a142",
        });
        newType = "ambulance";
        observer.style.top = "45%";
        observer.style.height = "80px";
    } else if (isCarSport) {
        adjustBodyStyle({
            url: "url('./css/img/arizona_road.jpg')",
            bgSize: "cover",
            bgRepeat: "no-repeat",
            bgPosition: "0px -280px",
            bgColor: "#e6a142",
        });
        newType = "sport";
        observer.style.top = "45%";
        observer.style.height = "80px";
    } else if (isJet) {
        adjustBodyStyle({
            url: "url('./css/img/sky.jpg')",
            bgSize: "cover",
            bgRepeat: "no-repeat",
            bgPosition: "0px 180px",
            bgColor: "rgb(193, 255, 244)",
        });
        newType = "jet";
        observer.style.top = "72%";
        observer.style.height = "35px";
    } else if (isMissile) {
        adjustBodyStyle({
            url: "url('./css/img/sky.jpg')",
            bgSize: "cover",
            bgRepeat: "no-repeat",
            bgPosition: "0px 180px",
            bgColor: "rgb(193, 255, 244)",
        });
        newType = "missile";
        observer.style.top = "72%";
        observer.style.height = "35px";
    }

    if (newType !== currentType) {
        currentType = newType;

        if (newType === "ambulance") {
            movingDot.src = "./css/img/ambulance.png";
            observer.src = "./css/img/nurse.png";
            movingDot.style.transform = `translate(-50%, -50%)`;
            if (!isFrequencyManual) {
                sourceFrequency = 2500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "sport") {
            movingDot.src = "./css/img/bugatti_chiron.png";
            observer.src = "./css/img/human.png";
            movingDot.style.transform = `translate(-50%, -50%)`;
            if (!isFrequencyManual) {
                sourceFrequency = 3500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "jet") {
            movingDot.src = "./css/img/jet.png";
            observer.src = "./css/img/human.png";
            movingDot.style.transform = `translate(-50%, -50%)`;
            if (!isFrequencyManual) {
                sourceFrequency = 4500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "missile") {
            observer.src = "./css/img/human.png";
            movingDot.src = "./css/img/missle.png";
            movingDot.style.transform = `translate(-50%, -50%)`;
        }

        updateFrequencyDisplay();
    }

    const scaledFrequency = sourceFrequency / FREQUENCY_SCALE_FACTOR;
    const period = 1 / scaledFrequency;

    if (speed < SPEED_OF_SOUND && timestamp / 1000 - lastWaveTime >= period) {
        const dotRect = movingDot.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const centerXpx = dotRect.left + dotRect.width / 2 - cRect.left;
        const centerPct = (centerXpx / cRect.width) * 100;

        window.emitWave(centerPct, 50, speed, 1);
        lastWaveTime = timestamp / 1000;
    }

    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * SCALE_FACTOR;

    const waveWidthPx = 0.95 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const proximityThreshold = (waveWidthPx / (container.clientWidth || 1000)) * 100 * 5;
    const obsElem = document.getElementById("observer1");
    const contRect = container.getBoundingClientRect();
    const obsRect = obsElem.getBoundingClientRect();
    const observerCenterPx = obsRect.left + obsRect.width / 2 - contRect.left;
    const observerCenterPy = obsRect.top + obsRect.height / 2 - contRect.top;
    const dotRect = movingDot.getBoundingClientRect();
    const sourceCenterPx = dotRect.left + dotRect.width / 2 - contRect.left;

    if (speed >= SPEED_OF_SOUND && (currentType === "jet" || currentType === "missile")) {
        const machAngle = Math.asin(SPEED_OF_SOUND / speed);
        const coneWidthPercent = CONE_WIDTH_PERCENT;
        const edgeX = sourceX - coneWidthPercent * Math.cos(machAngle);
        createDebugMarker(edgeX);

        const shockThreshold = coneWidthPercent / 2;
        const currentTime = timestamp / 1000;
        const isConeEdgeAtObserver =
            Math.abs(observerX - edgeX) < proximityThreshold &&
            (!lastShockwavePos || Math.abs(sourceX - lastShockwavePos) > shockThreshold) &&
            currentTime - lastShockwaveTime > MIN_SHOCKWAVE_INTERVAL;

        window.setMachImpactPositions(sourceCenterPx, observerCenterPx);
        updateMachConeAndLines();

        if (isConeEdgeAtObserver) {
            lastShockwavePos = sourceX;
            lastShockwaveTime = currentTime;
            playSound("./sounds/shockwave.mp3");

            const impact = document.createElement("div");
            impact.className = "mach-impact";
            impact.style.left = `${observerCenterPx}px`;
            impact.style.top = `${observerCenterPy}px`;
            container.appendChild(impact);
            impact.addEventListener("animationend", () => impact.remove());
        }
    }

    if (currentType === "jet" && Math.abs(sourceX - (observerX - 20)) < 0.5 && speed < SPEED_OF_SOUND) {
        if (!window.jetSoundPlayed) {
            playSound("./sounds/jet.mp3");
            window.jetSoundPlayed = true;
        }
    } else if (window.jetSoundPlayed) {
        window.jetSoundPlayed = false;
    }

    if (currentType === "jet" && Math.abs(sourceX - observerX + 50) < 0.5 && speed >= SPEED_OF_SOUND) {
        if (!window.jetSoundPlayed) {
            playSound("./sounds/jet.mp3");

            window.jetSoundPlayed = true;
        }
    } else if (window.jetSoundPlayed) {
        window.jetSoundPlayed = false;
    }

    requestAnimationFrame(update);
    updateMachConeAndLines();
    updateSpeedDisplay();
    updateEngineSound(currentType, sourceX, observerX, speed);

    window.setMachImpactPositions(sourceCenterPx, observerCenterPx);
}

/**
 * makePanelDraggable(panel, handle)
 * Umożliwia przeciąganie elementu `panel` po ekranie za pomocą uchwytu `handle`.
 *
 * Obsługa zdarzeń:
 * - mousedown: zapamiętuje pozycję kursora względem panelu
 * - mousemove: aktualizuje pozycję panelu zgodnie z ruchem kursora
 * - mouseup: kończy operację przeciągania
 */
function makePanelDraggable(panel, handle) {
    let offsetX = 0,
        offsetY = 0,
        isDown = false;

    handle.addEventListener("mousedown", function (e) {
        isDown = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        document.body.style.cursor = "grabbing";
        e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
        if (!isDown) return;
        panel.style.left = e.clientX - offsetX + "px";
        panel.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", function () {
        isDown = false;
        document.body.style.cursor = "";
    });
}


// Przypisanie zdarzeń
// wywoływanie odpowiednich funkcji po załadowaniu dokumentu html
//
window.addEventListener("DOMContentLoaded", () => {
    speedControl.addEventListener("input", () => {
        const v = Math.max(+speedControl.min, Math.min(+speedControl.max, +speedControl.value));
        speedControlInput.value = v;
        speed = v;
        currentType = null;
        updateDisplays();
        updateSpeedDisplay();
        clearReflectedWaves();
        document.querySelector(".mach-cone")?.remove();
    });

    speedControlInput.addEventListener("input", () => {
        const v = Math.max(+speedControl.min, Math.min(+speedControl.max, +speedControlInput.valueAsNumber || 0));
        speedControl.value = v;
        speed = v;
        currentType = null;
        updateDisplays();
        updateSpeedDisplay();
        clearReflectedWaves();
        document.querySelector(".mach-cone")?.remove();
    });

    frequencyControl.addEventListener("input", () => {
        const f = Math.max(+frequencyControl.min, Math.min(+frequencyControl.max, +frequencyControl.value));
        frequencyControlInput.value = f;
        isFrequencyManual = true;
        sourceFrequency = f;
        updateDisplays();
        updateFrequencyDisplay();
        clearReflectedWaves();
    });

    frequencyControlInput.addEventListener("input", () => {
        const f = Math.max(
            +frequencyControl.min,
            Math.min(+frequencyControl.max, +frequencyControlInput.valueAsNumber || 0)
        );
        frequencyControl.value = f;
        isFrequencyManual = true;
        sourceFrequency = f;
        updateDisplays();
        updateFrequencyDisplay();
        clearReflectedWaves();
    });

    document.getElementById("startBtn").addEventListener("click", () => {
        if (isPaused) {
            isPaused = false;
            requestAnimationFrame(update);
        }
    });

    document.getElementById("pauseBtn").addEventListener("click", () => {
        isPaused = true;
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
        location.reload();
    });

    observer.style.left = observerX + "%";

    updateDisplays();

    updateSpeedDisplay();
    updateFrequencyDisplay();
    requestAnimationFrame(update);
    updateEngineSound(currentType, sourceX, observerX, speed);

    let isDragging = false;
    let offsetX = 0;

    movingDot.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = movingDot.getBoundingClientRect();
        offsetX = e.clientX - (rect.left + rect.width / 2);
        document.body.style.cursor = "grabbing";
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        let x = e.clientX - containerRect.left - offsetX;
        x = Math.max(0, Math.min(x, containerRect.width));
        const percent = (x / containerRect.width) * 100;
        movingDot.style.left = percent + "%";
        sourceX = percent;
        clearReflectedWaves();
        updateMachConeAndLines();
        updateSpeedDisplay();
    });

    window.addEventListener("mouseup", (e) => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";
        }
    });

    let isDraggingObserver = false;
    let observerOffsetX = 0;

    observer.addEventListener("mousedown", (e) => {
        isDraggingObserver = true;
        const rect = observer.getBoundingClientRect();
        observerOffsetX = e.clientX - (rect.left + rect.width / 2);
        document.body.style.cursor = "grabbing";
        clearReflectedWaves();
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
        if (isDraggingObserver) {
            const containerRect = container.getBoundingClientRect();
            let x = e.clientX - containerRect.left - observerOffsetX;
            x = Math.max(0, Math.min(x, containerRect.width));
            const percent = (x / containerRect.width) * 100;
            observer.style.left = percent + "%";
            observerX = percent;
            clearReflectedWaves();
            updateMachConeAndLines();
            updateSpeedDisplay();
        }
    });

    window.addEventListener("mouseup", (e) => {
        if (isDraggingObserver) {
            isDraggingObserver = false;
            document.body.style.cursor = "";
        }
    });

    makePanelDraggable(document.getElementById("speedDetails"), document.getElementById("speedDetails"));
    makePanelDraggable(document.getElementById("dopplerDetails"), document.getElementById("dopplerDetails"));

    makePanelDraggable(document.getElementById("controls"), document.getElementById("controls-handle"));

    document.getElementById("show-results-btn").addEventListener("click", showResultsModal);

    document.getElementById("close-btn").addEventListener("click", () => {
        const modal = document.getElementById("results-modal");
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        const modal = document.getElementById("results-modal");
        if (e.target === modal) modal.style.display = "none";
    });
});

window.addEventListener(
    "wheel",
    function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    },
    {passive: false}
);
