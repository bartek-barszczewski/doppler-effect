// Bartłomiej Barszczewski -->
// Symulacja zjawiska fizycznego -->
// Efekt Dopplera i zjawisko stożka macha -->
// Semestr drugi -->
// Fizyka -->

import {dopplerFrequencySound, countWaveLength} from "./utils/formulas.js";

const movingDot = document.getElementById("movingDot");
const container = document.querySelector(".container");
const speedControl = document.getElementById("speedControl");
const frequencyControl = document.getElementById("frequencyControl");
const speedDisplay = document.getElementById("speedDisplay");
const frequencyDisplay = document.getElementById("frequencyDisplay");
const speedDetails = document.getElementById("speedDetails");
const shockwaveUpper = document.getElementById("shockwave_upper");
const shockwaveLower = document.getElementById("shockwave_lower");
const observer = document.getElementById("observer1");

const DEFAULT_FREQ = 400;
const DEFAULT_SPEED = 25;

const SPEED_OF_SOUND = 343;
const METERS_PER_PERCENT = 3.43;
const SPEED_OF_SOUND_SIM = SPEED_OF_SOUND / METERS_PER_PERCENT;

const SCALE_FACTOR = 1.5;
const WAVE_LIFETIME = 2;
const CONE_WIDTH_PERCENT = 30;
const MIN_SHOCKWAVE_INTERVAL = 5;
const FREQUENCY_SCALE_FACTOR = 1000;

let observerX = 50;
let sourceX = 50;
let speed = parseFloat(speedControl.value) || DEFAULT_SPEED;
let sourceFrequency = parseFloat(frequencyControl.value / 100) || DEFAULT_FREQ;
let lastWaveTime = 0;
let waves = [];
let isFrequencyManual = false;
let currentType = null;
let lastShockwavePos = null;
let lastShockwaveTime = 0;
let freqObserver = null;
let reflectedWaveTimeouts = [];
let reflection2DTimeouts = [];

const c = 343;
let audioContext = null;
let osc = null;
let gain = null;
let lfo = null;
let lfoGain = null;
let currentSoundType = null;
let lastEngineSoundType = null;
let isPaused = false;

function showResultsModal() {
    if (!isPaused) {
        const pauseBtn = document.getElementById("pauseBtn");
        const flashColor = (bg, color, delay) => {
            setTimeout(() => {
                pauseBtn.style.backgroundColor = bg;
                pauseBtn.style.color = color;
            }, delay);
        };

        flashColor("red", "white", 0); 
        flashColor("#f0f0f0", "black", 300); 
        flashColor("red", "white", 600); 
        flashColor("#f0f0f0", "black", 900); 
        flashColor("red", "white", 1500); 
        flashColor("#f0f0f0", "black", 1800); 
        flashColor("red", "white", 2100); 
        flashColor("#f0f0f0", "black", 2400); 
        return; 
    }

    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    const mach = speed / SPEED_OF_SOUND;
    const lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    const relativeVelocity = sourceX < observerX ? speed : -speed;
    const freqObserverNum = dopplerFrequencySound(sourceFrequency, SPEED_OF_SOUND, relativeVelocity, 0);
    const deltaF = freqObserverNum - sourceFrequency;
    const dopplerCoeff = freqObserverNum / sourceFrequency;

    const distancePercent = Math.abs(observerX - sourceX);
    const distanceMeters = distancePercent * METERS_PER_PERCENT;
    const timeToObserver = distanceMeters / SPEED_OF_SOUND;
    const phaseShift = (2 * Math.PI * distanceMeters) / (lambda > 0 ? lambda : 1);
    const energyAtObs = 1 / Math.pow(distanceMeters || 1, 2);
    const isAudible = sourceFrequency >= 20 && sourceFrequency <= 20000;

    const distanceText =
        sourceX - observerX < 0
            ? `PRZED obserwatorem (-${distancePercent.toFixed(2)}%)`
            : sourceX - observerX > 0
            ? `ZA obserwatorem (+${distancePercent.toFixed(2)}%)`
            : "Na obserwatorze (0%)";

    const rows = [
        ["Prędkość", `${speed.toFixed(2)} m/s | ${kmh.toFixed(2)} km/h | ${mph.toFixed(2)} mph`, "—"],
        ["Liczba Macha", mach.toFixed(2), "M = v / v_dźw"],
        ["Częstotliwość źródła", `${sourceFrequency.toFixed(1)} Hz`, "Dana"],
        ["Długość fali", `${lambda.toFixed(2)} m`, "λ = v_dźw / f₀"],
        ["Częstotliwość obserwatora", `${freqObserverNum.toFixed(1)} Hz`, "f' = f₀ · v_dźw / (v_dźw - v)"],
        ["Kąt stożka Macha", mach < 1 ? "—" : `asin(1/M)`, "sin(θ) = v_dźw / v (dla M > 1)"],
        ["Odległość od obserwatora", distanceText, "Δx = x₀ - x_obs"],
        ["Δf (Przesunięcie Dopplera)", `${deltaF.toFixed(2)} Hz`, "Δf = f' - f₀"],
        ["Współczynnik Dopplera", dopplerCoeff.toFixed(3), "f' / f₀"],
        ["Czas dotarcia fali", `${timeToObserver.toFixed(3)} s`, "t = d / v_dźw"],
        ["Przesunięcie fazowe", `${phaseShift.toFixed(2)} rad`, "Δφ = 2π · d / λ"],
        ["Energia względna", energyAtObs.toExponential(2), "E ∝ 1 / d²"],
        ["Słyszalność", isAudible ? "TAK" : "NIE", "f₀ ∈ [20, 20000] Hz"],
    ];

    const tbody = document.getElementById("results-table-body");
    tbody.innerHTML = "";
    rows.forEach(([param, value, formula]) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${param}</td><td>${value}</td><td>${formula}</td>`;
        tbody.appendChild(row);
    });

    document.getElementById("results-modal").style.display = "flex";
}

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
    gain.gain.value = 0.01;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    lfo.start();
}

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
    if (type === "car") {
        osc.type = "square";
        osc.frequency.value = 120;
    } else if (type === "sport") {
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

function updateEngineSound(type, srcX, observerX, v) {
    if (type !== lastEngineSoundType) {
        startEngineSound(type);
        lastEngineSoundType = type;
    }
    if (!["car", "ambulance", "sport"].includes(type)) {
        stopEngineSound();
        return;
    }

    if (type !== "ambulance" && gain && osc && audioContext) {
        const percentToMeters = METERS_PER_PERCENT;
        const distance = Math.abs(srcX - observerX) * percentToMeters;

        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.3;

        const silenceThreshold = 20;
        let appliedVolume = distance > silenceThreshold ? 0 : volume;

        let base, scale, low, high;
        if (type === "car") {
            base = 80;
            scale = 0.6;
            low = 50;
            high = 220;
        } else if (type === "sport") {
            base = 30;
            scale = 0.11;
            low = 20;
            high = 52;
        }
        let freq = base + scale * v;
        freq = Math.max(low, Math.min(freq, high));
        const relativeVelocity = srcX < observerX ? v : -v;
        const dopplerFreq = dopplerFrequencySound(freq, SPEED_OF_SOUND, relativeVelocity, 0);
        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.02);
        osc.frequency.linearRampToValueAtTime(dopplerFreq, audioContext.currentTime + 0.02);
    }

    if (type !== lastEngineSoundType) {
        startEngineSound(type);
        lastEngineSoundType = type;
    }
    if (!["car", "ambulance", "sport"].includes(type)) {
        stopEngineSound();
        return;
    }

    if (type === "ambulance" && gain && audioContext) {
        const percentToMeters = METERS_PER_PERCENT;
        const distance = Math.abs(srcX - observerX) * percentToMeters;

        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.06;
        const silenceThreshold = 20;
        let appliedVolume = distance > silenceThreshold ? 0 : volume;

        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.03);
    } else if (type !== "ambulance" && gain && osc && audioContext) {
        const percentToMeters = METERS_PER_PERCENT;
        const distance = Math.abs(srcX - observerX) * percentToMeters;

        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.3;
        const silenceThreshold = 20;
        let appliedVolume = distance > silenceThreshold ? 0 : volume;
        let base, scale, low, high;
        if (type === "car") {
            base = 80;
            scale = 0.6;
            low = 50;
            high = 220;
        } else if (type === "sport") {
            base = 30;
            scale = 0.11;
            low = 20;
            high = 52;
        }
        let freq = base + scale * v;
        freq = Math.max(low, Math.min(freq, high));
        const relativeVelocity = srcX < observerX ? v : -v;
        const dopplerFreq = dopplerFrequencySound(freq, SPEED_OF_SOUND, relativeVelocity, 0);
        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.02);
        osc.frequency.linearRampToValueAtTime(dopplerFreq, audioContext.currentTime + 0.02);
    }
}

function updateDisplays() {
    speedDisplay.textContent = speedControl.value;
    frequencyDisplay.textContent = frequencyControl.value;
}

function updateMachConeAndLines() {
    const rect = movingDot.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const dotX = rect.left - containerRect.left + rect.width / 2;
    const dotY = rect.top - containerRect.top + rect.height / 2;

    const V = parseFloat(speedControl.value);
    const c = SPEED_OF_SOUND;

    if (V > c) {
        const M = V / c;
        const theta = Math.asin(1 / M);
        const tanTheta = Math.tan(theta);

        const y2_upper = dotY + tanTheta * dotX;
        const y2_lower = dotY - tanTheta * dotX;

        shockwaveUpper.setAttribute("x1", dotX);
        shockwaveUpper.setAttribute("y1", dotY);
        shockwaveUpper.setAttribute("x2", 0);
        shockwaveUpper.setAttribute("y2", y2_upper);
        shockwaveLower.setAttribute("x1", dotX);
        shockwaveLower.setAttribute("y1", dotY);
        shockwaveLower.setAttribute("x2", 0);
        shockwaveLower.setAttribute("y2", y2_lower);
        shockwaveUpper.style.display = "block";
        shockwaveLower.style.display = "block";
    } else {
        shockwaveUpper.style.display = "none";
        shockwaveLower.style.display = "none";
    }
}

function createReflectionWave(xPosition, yPosition, amplitude = 1) {
    const wave = document.createElement("div");
    wave.classList.add("wave-reflected-2d");
    wave.style.left = `${xPosition}%`;
    wave.style.top = `${yPosition}%`;
    wave.style.opacity = amplitude;
    wave.style.width = "30px";
    wave.style.height = "30px";
    wave.style.transform = "translate(-50%, -50%) scale(0.2)";
    container.appendChild(wave);

    wave.animate(
        [
            {transform: "translate(-50%, -50%) scale(0.2)", opacity: amplitude},
            {transform: "translate(-50%, -50%) scale(10)", opacity: 0},
        ],
        {
            duration: 2000,
            easing: "linear",
        }
    );

    setTimeout(() => wave.remove(), 2000);
}

function schedule2DReflection(observerPosPercent, wavePosPercent, timestamp) {
    const distanceMeters = Math.abs(observerPosPercent - wavePosPercent) * METERS_PER_PERCENT;
    const delaySeconds = distanceMeters / SPEED_OF_SOUND;
    const timeoutId = setTimeout(() => {
        createReflectionWave(observerPosPercent, 50, 1);
    }, delaySeconds * 1000);

    reflection2DTimeouts.push(timeoutId);
}

function createWave(xPosition, timestamp) {
    if (waves.length > 1000) {
        const oldest = waves.shift();
        if (oldest && oldest.element) oldest.element.remove();
    }

    const wave = document.createElement("div");
    wave.classList.add("wave");
    wave.style.left = `${xPosition}%`;
    wave.style.top = "49%";
    const translateX = -(50 + (50 * speed) / SPEED_OF_SOUND);
    wave.style.transform = `translate(${translateX}%, -50%)`;

    container.appendChild(wave);

    let lambda;
    try {
        lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    } catch (error) {
        console.error("Błąd w countWaveLength:", error);
        lambda = 1;
    }

    wave.style.animation = `wave-expand ${WAVE_LIFETIME}s linear forwards`;
    let finalScale;
    switch (currentType) {
        case "car":
            finalScale = 30;
            break;
        case "ambulance":
            finalScale = 40;
            break;
        case "sport":
            finalScale = 50;
            break;
        case "jet":
        case "missile":
            finalScale = 60;
            break;
        default:
            finalScale = 30;
    }

    wave.animate(
        [
            {transform: "scale(0.6)", opacity: 1},
            {transform: `scale(${finalScale})`, opacity: 0},
        ],
        {
            duration: WAVE_LIFETIME * 1000,
            easing: "linear",
            fill: "forwards",
        }
    );

    waves.push({
        element: wave,
        xPosition: xPosition,
        createdAt: timestamp / 1000,
    });

    setTimeout(() => {
        wave.remove();
        waves = waves.filter((w) => w.element !== wave);
    }, WAVE_LIFETIME * 1000);

    if (speed < SPEED_OF_SOUND) {
        const distanceMeters = Math.abs(observerX - xPosition) * METERS_PER_PERCENT;
        const timeToObserver = distanceMeters / SPEED_OF_SOUND;

        if (timeToObserver <= WAVE_LIFETIME * 0.15) {
            schedule2DReflection(observerX, xPosition, timestamp);
            scheduleReflectedWave(observerX, xPosition, timestamp, null, false);
        }
    }
}

function createReflectedWave(xPosition, timestamp, isShockwave = false, edgeX = null) {
    const wave = document.createElement("div");
    wave.classList.add("wave-reflected");
    if (isShockwave) {
        wave.classList.add("shockwave");
        wave.style.width = "1rem";
        wave.style.height = "1rem";
    }
    wave.style.left = isShockwave ? `${edgeX}%` : `${xPosition}%`;
    wave.style.top = "50%";
    const translateX =
        speed >= SPEED_OF_SOUND ? -(20 + (20 * speed) / SPEED_OF_SOUND) : -(50 + (50 * speed) / SPEED_OF_SOUND);
    wave.style.transform = `translate(${translateX}%, -50%)`;

    container.appendChild(wave);

    waves.push({
        element: wave,
        xPosition: isShockwave ? edgeX : xPosition,
        createdAt: timestamp / 1000,
    });

    setTimeout(() => {
        wave.remove();
        waves = waves.filter((w) => w.element !== wave);
    }, WAVE_LIFETIME * 1000);
}

function playSound(url) {
    const sound = new Audio(url);
    sound.play();
}

function scheduleReflectedWave(observerPos, wavePos, timestamp, edgeX = null, isShockwave = false) {
    let delaySeconds;
    if (isShockwave) {
        delaySeconds = 0;
    } else {
        const distanceMeters = Math.abs(observerPos - wavePos) * METERS_PER_PERCENT;
        delaySeconds = distanceMeters / SPEED_OF_SOUND;
    }
    const timeoutId = setTimeout(() => {
        createReflectedWave(observerPos, performance.now(), isShockwave, edgeX);
    }, delaySeconds * 1000);
    reflectedWaveTimeouts.push(timeoutId);
}

function clearReflectedWaves() {
    reflectedWaveTimeouts.forEach((id) => clearTimeout(id));
    reflectedWaveTimeouts = [];
    reflection2DTimeouts.forEach((id) => clearTimeout(id));
    reflection2DTimeouts = [];

    document.querySelectorAll(".wave-reflected, .wave-reflected-2d").forEach((el) => el.remove());
}

speedControl.addEventListener("input", () => {
    speed = parseFloat(speedControl.value) || 0;
    console.debug(`Nowa prędkość: ${speed.toFixed(2)} m/s, currentType: ${currentType}`);
    currentType = null;
    updateSpeedDisplay();
    clearReflectedWaves();
    const existingCone = document.querySelector(".mach-cone");
    if (existingCone) existingCone.remove();
});

frequencyControl.addEventListener("input", () => {
    isFrequencyManual = true;
    sourceFrequency = parseFloat(frequencyControl.value) || 1;
    updateFrequencyDisplay();
    clearReflectedWaves();
});

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

    document.getElementById("dopplerDetails").innerHTML = `
        <b>Dodatkowe parametry:</b><br>
        Przesunięcie Dopplera Δf: ${deltaF !== null ? deltaF.toFixed(2) + " Hz" : "—"}<br>
        Współczynnik Dopplera: ${dopplerCoeff !== null ? dopplerCoeff.toFixed(3) : "—"}<br>
        Czas dotarcia fali: ${timeToObserver.toFixed(3)} s<br>
        Przesunięcie fazowe: ${phaseShift.toFixed(2)} rad<br>
        Energia względna: ${energyAtObs.toExponential(2)}<br>
        Słyszalność: ${isAudible ? "TAK" : "NIE"}<br>
    `;
}

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

function updateFrequencyDisplay() {
    frequencyDisplay.textContent = sourceFrequency.toFixed(1);
    updateSpeedDisplay();
}

function createMachCone(timestamp) {
    const existingCone = document.querySelector(".mach-cone");
    if (existingCone) existingCone.remove();

    if (speed < SPEED_OF_SOUND || (currentType !== "jet" && currentType !== "missile")) {
        const existingCone = document.querySelector(".mach-cone");
        if (existingCone) existingCone.remove();
        return;
    }

    const machAngle = Math.asin(SPEED_OF_SOUND / speed) * (180 / Math.PI);
    const coneWidth = CONE_WIDTH_PERCENT;
    const coneHeight = Math.tan(machAngle * (Math.PI / 180)) * (coneWidth / 2);

    const cone = document.createElement("div");
    cone.classList.add("mach-cone");
    cone.style.left = `${sourceX}%`;
    cone.style.top = "50%";
    cone.style.width = `${coneWidth}%`;
    cone.style.height = `${coneHeight * 2}%`;
    cone.style.transform = "translate(-100%, -50%)";
    cone.style.clipPath = `polygon(100% 50%, 0% ${50 - coneHeight}%, 0% ${50 + coneHeight}%)`;
    container.appendChild(cone);

    const scaledFrequency = sourceFrequency / FREQUENCY_SCALE_FACTOR;
    const period = 1 / scaledFrequency;
    if (timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }
}

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

function update(timestamp) {
    if (isPaused) return;

    const deltaTime = 0.016;
    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * 10 * SCALE_FACTOR;
    if (sourceX > 100) {
        sourceX -= 100;
        lastShockwavePos = null;
        lastShockwaveTime = 0;
    }

    if (movingDot) {
        movingDot.style.left = `${sourceX}%`;
    }

    const isCarSpeed = speed <= 20;
    const isAmbulance = speed > 20 && speed <= 39;
    const isCarSport = speed > 50 && speed <= 117;
    const isJet = speed > 117 && speed < 664;
    const isMissile = speed >= 664;

    let newType = null;
    if (isCarSpeed) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "car";
        observer.style.top = "45%";
        observer.style.height = "80px";
    } else if (isAmbulance) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "ambulance";
        observer.style.top = "45%";
        observer.style.height = "80px";
    } else if (isCarSport) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "sport";
        observer.style.top = "45%";
        observer.style.height = "80px";
    } else if (isJet) {
        document.body.style.backgroundImage = "url('./../js/img/sky.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193, 255, 244)";
        newType = "jet";
        observer.style.top = "72%";
        observer.style.height = "35px";
    } else if (isMissile) {
        document.body.style.backgroundImage = "url('./../js/img/sky.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193, 255, 244)";
        newType = "missile";
        observer.style.top = "72%";
        observer.style.height = "35px";
    }

    if (newType !== currentType) {
        currentType = newType;

        if (newType === "car") {
            movingDot.src = "./../js/img/car_yellow.png";
            observer.src = "./../js/img/human.png";
            movingDot.style.transform = `translate(-50%, -50%)`;

            if (!isFrequencyManual) {
                sourceFrequency = 2500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "ambulance") {
            movingDot.src = "./../js/img/ambulance.png";
            observer.src = "./../js/img/nurse.png";
            movingDot.style.transform = `translate(-50%, -50%)`;
            if (!isFrequencyManual) {
                sourceFrequency = 2500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "sport") {
            movingDot.src = "./../js/img/bugatti_chiron.png";
            observer.src = "./../js/img/human.png";
            movingDot.style.transform = `translate(-75%, -50%)`;
            if (!isFrequencyManual) {
                sourceFrequency = 3500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "jet") {
            movingDot.src = "./../js/img/jet.png";
            observer.src = "./../js/img/human.png";
            movingDot.style.transform = `translate(-100%, -50%)`;

            if (!isFrequencyManual) {
                sourceFrequency = 4500;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "missile") {
            observer.src = "./../js/img/human.png";
            movingDot.src = "./../js/img/missle.png";
            movingDot.style.transform = `translate(-100%, -50%)`;
        }

        updateFrequencyDisplay();
    }

    const scaledFrequency = sourceFrequency / FREQUENCY_SCALE_FACTOR;
    const period = 1 / scaledFrequency;
    if (speed < SPEED_OF_SOUND && timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }

    const waveWidthPx = 0.95 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const proximityThreshold = (waveWidthPx / (container.clientWidth || 1000)) * 100 * 5;

    if (speed >= SPEED_OF_SOUND && (currentType === "jet" || currentType === "missile")) {
        movingDot.style.transform = `translate(-50%, -50%)`;

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
        createMachCone(timestamp);
        updateMachConeAndLines();

        if (isConeEdgeAtObserver) {
            scheduleReflectedWave(observerX, sourceX, timestamp, edgeX, true);
            lastShockwavePos = sourceX;
            lastShockwaveTime = currentTime;
            playSound("./../js/sounds/shockwave.mp3");
        }
    }

    requestAnimationFrame(update);
    updateMachConeAndLines();
    updateSpeedDisplay();
    updateEngineSound(currentType, sourceX, observerX, speed);
}

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

window.addEventListener("DOMContentLoaded", () => {
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

    speedControl.addEventListener("input", updateDisplays);
    frequencyControl.addEventListener("input", updateDisplays);

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
    const tbody = document.getElementById("results-table-body");

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
