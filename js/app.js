import {dopplerFrequencySound, countWaveLength} from "./utils/formulas.js";

// DOM elements
const movingDot = document.getElementById("movingDot");
const container = document.querySelector(".container");
const speedControl = document.getElementById("speedControl");
const frequencyControl = document.getElementById("frequencyControl");
const speedDisplay = document.getElementById("speedDisplay");
const frequencyDisplay = document.getElementById("frequencyDisplay");
const speedDetails = document.getElementById("speedDetails");

// Zabezpieczenie przed brakiem elementów DOM
if (
    !movingDot ||
    !container ||
    !speedControl ||
    !frequencyControl ||
    !speedDisplay ||
    !frequencyDisplay ||
    !speedDetails
) {
    alert("Błąd: Brak wymaganych elementów DOM. Upewnij się, że wszystkie elementy istnieją w HTML.");
    console.error("Brak wymaganych elementów DOM.");
    throw new Error("Missing DOM elements");
}

// Constants
const SPEED_OF_SOUND = 343;
const OBSERVER1_POS = 80;
const OBSERVER2_POS = 20;
const SCALE_FACTOR = 0.25;
const WAVE_LIFETIME = 5;
const CONE_WIDTH_PERCENT = 30;
const MIN_SHOCKWAVE_INTERVAL = 2;
const FREQUENCY_SCALE_FACTOR = 10; // Scale frequency for wave creation (1000 Hz → 100 waves)

// State variables
let sourceX = 50;
let speed = parseFloat(speedControl.value) || 25;
let sourceFrequency = parseFloat(frequencyControl.value) || 1;
let lastWaveTime = 0;
let waves = [];
let isFrequencyManual = false;
let currentType = null;
let lastShockwavePos1 = null;
let lastShockwavePos2 = null;
let lastShockwaveTime1 = 0;
let lastShockwaveTime2 = 0;

// Initialize
updateSpeedDisplay();
updateFrequencyDisplay();

// Events
speedControl.addEventListener("input", () => {
    speed = parseFloat(speedControl.value) || 0;
    console.debug(`Nowa prędkość: ${speed.toFixed(2)} m/s, currentType: ${currentType}`);
    currentType = null;
    updateSpeedDisplay();
});

frequencyControl.addEventListener("input", () => {
    isFrequencyManual = true;
    sourceFrequency = parseFloat(frequencyControl.value) || 1;
    updateFrequencyDisplay();
});

function updateSpeedDisplay() {
    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    let lambda, freqObserver1, freqObserver2;
    try {
        lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
        const mach = speed / SPEED_OF_SOUND;

        if (speed < SPEED_OF_SOUND) {
            freqObserver1 = dopplerFrequencySound(
                sourceFrequency,
                SPEED_OF_SOUND,
                sourceX < OBSERVER1_POS ? speed : -speed,
                0
            );
            freqObserver2 = dopplerFrequencySound(
                sourceFrequency,
                SPEED_OF_SOUND,
                sourceX < OBSERVER2_POS ? speed : -speed,
                0
            );
        } else {
            freqObserver1 = "N/A (naddźwiękowe)";
            freqObserver2 = "N/A (naddźwiękowe)";
        }

        speedDisplay.textContent = speed.toFixed(2);
        speedDetails.innerHTML = `
            Prędkość: ${speed.toFixed(2)} m/s | ${kmh.toFixed(2)} km/h | ${mph.toFixed(2)} mph<br>
            Liczba Macha: ${mach.toFixed(2)}<br>
            Częstotliwość źródła: ${sourceFrequency.toFixed(1)} Hz<br>
            Długość fali: ${lambda.toFixed(2)} m<br>
            Częstotliwość obserwatora 1 (x=${OBSERVER1_POS}%): ${
                typeof freqObserver1 === "number" ? freqObserver1.toFixed(1) + " Hz" : freqObserver1
            }<br>
            Częstotliwość obserwatora 2 (x=${OBSERVER2_POS}%): ${
                typeof freqObserver2 === "number" ? freqObserver2.toFixed(1) + " Hz" : freqObserver2
            }
        `;
    } catch (error) {
        console.error("Błąd w updateSpeedDisplay:", error);
    }
}

function updateFrequencyDisplay() {
    frequencyDisplay.textContent = sourceFrequency.toFixed(1);
    updateSpeedDisplay();
}

function createWave(xPosition, timestamp) {
    const wave = document.createElement("div");
    wave.classList.add("wave");
    wave.style.left = `${xPosition}%`;
    wave.style.top = "50%";
    const translateX = -(50 + (50 * speed) / SPEED_OF_SOUND);
    wave.style.transform = `translate(${translateX}%, -50%)`;
    console.debug(
        `Fala: xPosition=${xPosition.toFixed(2)}%, translateX=${translateX.toFixed(2)}%, speed=${speed.toFixed(2)} m/s`
    );
    container.appendChild(wave);

    let lambda;
    try {
        lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    } catch (error) {
        console.error("Błąd w countWaveLength:", error);
        lambda = 1;
    }
    wave.style.animation = `wave-expand ${WAVE_LIFETIME}s linear forwards`;

    waves.push({
        element: wave,
        xPosition: xPosition,
        createdAt: timestamp / 1000,
    });

    setTimeout(() => {
        wave.remove();
        waves = waves.filter((w) => w.element !== wave);
    }, WAVE_LIFETIME * 1000);
}

function createMachCone(timestamp) {
    const existingCone = document.querySelector(".mach-cone");
    if (existingCone) existingCone.remove();

    if (speed < SPEED_OF_SOUND || (currentType !== "jet" && currentType !== "missile")) return;

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

function createReflectedWave(xPosition, timestamp, isShockwave = false, edgeX = null) {
    const wave = document.createElement("div");
    wave.classList.add("wave-reflected");
    if (isShockwave) {
        wave.classList.add("shockwave");
        wave.style.width = "1rem";
        wave.style.height = "1rem";
    }
    // Place shockwave at edgeX (Mach cone edge) near observer, otherwise at observer's position
    wave.style.left = isShockwave ? `${edgeX}%` : `${xPosition}%`;
    wave.style.top = "50%"; // Align with source and debug marker
    const translateX =
        speed >= SPEED_OF_SOUND ? -(20 + (20 * speed) / SPEED_OF_SOUND) : -(50 + (50 * speed) / SPEED_OF_SOUND);
    wave.style.transform = `translate(${translateX}%, -50%)`;
    console.debug(
        `Fala odbita: xPosition=${(isShockwave ? edgeX : xPosition).toFixed(2)}%, translateX=${translateX.toFixed(2)}%, speed=${speed.toFixed(
            2
        )} m/s, type=${currentType}, shockwave=${wave.classList.contains("shockwave")}`
    );
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

function scheduleReflectedWave(observerPos, sourcePos, timestamp, edgeX = null) {
    const distancePercent = Math.abs(observerPos - sourcePos);
    const containerWidthPx = container.clientWidth || 1000;
    const distancePx = (distancePercent / 100) * containerWidthPx;
    const delaySeconds = (distancePx / SPEED_OF_SOUND) * SCALE_FACTOR;
    console.debug(
        `Planowanie fali: observerPos=${observerPos}%, sourcePos=${sourcePos.toFixed(2)}%, delay=${delaySeconds.toFixed(
            2
        )}s, edgeX=${edgeX ? edgeX.toFixed(2) : "null"}%`
    );
    setTimeout(() => {
        createReflectedWave(observerPos, performance.now(), speed >= SPEED_OF_SOUND && (currentType === "jet" || currentType === "missile"), edgeX);
    }, delaySeconds * 1000);
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
    const deltaTime = 0.016;
    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * 10 * SCALE_FACTOR;
    if (sourceX > 100) {
        sourceX -= 100;
        lastShockwavePos1 = null;
        lastShockwavePos2 = null;
        lastShockwaveTime1 = 0;
        lastShockwaveTime2 = 0;
    }

    if (movingDot) {
        movingDot.style.left = `${sourceX}%`;
    }

    const isCarSpeed = speed <= 25;
    const isAmbulance = speed > 25 && speed <= 50;
    const isCarSport = speed > 50 && speed <= 116.7;
    const isJet = speed > 116.7 && speed < 664;
    const isMissile = speed >= 664;

    let newType = null;
    if (isCarSpeed) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "car";
    } else if (isAmbulance) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "ambulance";
    } else if (isCarSport) {
        document.body.style.backgroundImage = "url('./../js/img/arizona_road.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "0px -280px";
        document.body.style.backgroundColor = "#e6a142";
        newType = "sport";
    } else if (isJet) {
        document.body.style.backgroundImage = "url('./../js/img/sky.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193, 255, 244)";
        newType = "jet";
    } else if (isMissile) {
        document.body.style.backgroundImage = "url('./../js/img/sky.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193, 255, 244)";
        newType = "missile";
    }

    if (newType !== currentType) {
        currentType = newType;

        if (newType === "car") {
            movingDot.src = "./../js/img/car_yellow.png";
            if (!isFrequencyManual) {
                sourceFrequency = 200;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "ambulance") {
            movingDot.src = "./../js/img/ambulance.png";
            if (!isFrequencyManual) {
                sourceFrequency = 800;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "sport") {
            movingDot.src = "./../js/img/bugatti_chiron.png";
            if (!isFrequencyManual) {
                sourceFrequency = 1000;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "jet") {
            movingDot.src = "./../js/img/jet.png";
            if (!isFrequencyManual) {
                sourceFrequency = 3000;
                frequencyControl.value = sourceFrequency;
            }
        } else if (newType === "missile") {
            movingDot.src = "./../js/img/missle.png";
            if (!isFrequencyManual) {
                sourceFrequency = 100;
                frequencyControl.value = sourceFrequency;
            }
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

    // Observer 1
    if (speed < SPEED_OF_SOUND) {
        if (
            Math.abs(sourceX - OBSERVER1_POS) < proximityThreshold &&
            !waves.some(
                (w) =>
                    Math.abs(w.xPosition - OBSERVER1_POS) < proximityThreshold && w.createdAt > timestamp / 1000 - 0.2
            )
        ) {
            scheduleReflectedWave(OBSERVER1_POS, sourceX, timestamp);
        }
    } else if (currentType === "jet" || currentType === "missile") {
        const machAngle = Math.asin(SPEED_OF_SOUND / speed);
        const coneWidthPercent = CONE_WIDTH_PERCENT;
        const edgeX = sourceX - coneWidthPercent * Math.cos(machAngle);
        createDebugMarker(edgeX);
        const shockThreshold = coneWidthPercent / 2;
        const currentTime = timestamp / 1000;
        const isConeEdgeAtObserver =
            Math.abs(OBSERVER1_POS - edgeX) < proximityThreshold &&
            (!lastShockwavePos1 || Math.abs(sourceX - lastShockwavePos1) > shockThreshold) &&
            currentTime - lastShockwaveTime1 > MIN_SHOCKWAVE_INTERVAL;

        if (isConeEdgeAtObserver) {
            console.debug(
                `Obserwator 1: edgeX=${edgeX.toFixed(2)}%, sourceX=${sourceX.toFixed(2)}%, ` +
                    `proximityThreshold=${proximityThreshold.toFixed(2)}%, shockThreshold=${shockThreshold.toFixed(
                        2
                    )}%, ` +
                    `timeSinceLast=${(currentTime - lastShockwaveTime1).toFixed(2)}s, wyzwalanie fali`
            );
            scheduleReflectedWave(OBSERVER1_POS, sourceX, timestamp, edgeX);
            lastShockwavePos1 = sourceX;
            lastShockwaveTime1 = currentTime;
        }
    }

    // Observer 2
    if (speed < SPEED_OF_SOUND) {
        if (
            Math.abs(sourceX - OBSERVER2_POS) < proximityThreshold &&
            !waves.some(
                (w) =>
                    Math.abs(w.xPosition - OBSERVER2_POS) < proximityThreshold && w.createdAt > timestamp / 1000 - 0.2
            )
        ) {
            scheduleReflectedWave(OBSERVER2_POS, sourceX, timestamp);
        }
    } else if (currentType === "jet" || currentType === "missile") {
        const machAngle = Math.asin(SPEED_OF_SOUND / speed);
        const coneWidthPercent = CONE_WIDTH_PERCENT;
        const edgeX = sourceX - coneWidthPercent * Math.cos(machAngle);
        createDebugMarker(edgeX);
        const shockThreshold = coneWidthPercent / 2;
        const currentTime = timestamp / 1000;
        const isConeEdgeAtObserver =
            Math.abs(OBSERVER2_POS - edgeX) < proximityThreshold &&
            (!lastShockwavePos2 || Math.abs(sourceX - lastShockwavePos2) > shockThreshold) &&
            currentTime - lastShockwaveTime2 > MIN_SHOCKWAVE_INTERVAL;

        if (isConeEdgeAtObserver) {
            console.debug(
                `Obserwator 2: edgeX=${edgeX.toFixed(2)}%, sourceX=${sourceX.toFixed(2)}%, ` +
                    `proximityThreshold=${proximityThreshold.toFixed(2)}%, shockThreshold=${shockThreshold.toFixed(
                        2
                    )}%, ` +
                    `timeSinceLast=${(currentTime - lastShockwaveTime2).toFixed(2)}s, wyzwalanie fali`
            );
            scheduleReflectedWave(OBSERVER2_POS, sourceX, timestamp, edgeX);
            lastShockwavePos2 = sourceX;
            lastShockwaveTime2 = currentTime;
        }
    }

    if (speed >= SPEED_OF_SOUND && (currentType === "jet" || currentType === "missile")) {
        createMachCone(timestamp);
    } else {
        const existingCone = document.querySelector(".mach-cone");
        if (existingCone) existingCone.remove();
        lastShockwavePos1 = null;
        lastShockwavePos2 = null;
        lastShockwaveTime1 = 0;
        lastShockwaveTime2 = 0;
    }

    requestAnimationFrame(update);
}

requestAnimationFrame(update);