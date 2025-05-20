import {dopplerFrequencySound, countWaveLength} from "./utils/formulas.js";

// DOM elements
const movingDot = document.getElementById("movingDot");
const container = document.querySelector(".container");
const speedControl = document.getElementById("speedControl");
const frequencyControl = document.getElementById("frequencyControl");
const speedDisplay = document.getElementById("speedDisplay");
const frequencyDisplay = document.getElementById("frequencyDisplay");
const speedDetails = document.getElementById("speedDetails");

// Constants
const SPEED_OF_SOUND = 343;
const OBSERVER1_POS = 80;
const OBSERVER2_POS = 20;
const SCALE_FACTOR = 0.1;
const WAVE_LIFETIME = 5;

// State variables
let sourceX = 50;
let speed = parseFloat(speedControl.value);
let sourceFrequency = parseFloat(frequencyControl.value);
let lastWaveTime = 0;
let waves = [];
let isFrequencyManual = false;
let currentType = null;

// Initialize
updateSpeedDisplay();
updateFrequencyDisplay();

// Events
speedControl.addEventListener("input", () => {
    speed = parseFloat(speedControl.value);
    currentType = null; // <=== To wymusza ponowne przypisanie typu i częstotliwości
    updateSpeedDisplay();
});

frequencyControl.addEventListener("input", () => {
    isFrequencyManual = true;
    sourceFrequency = parseFloat(frequencyControl.value);
    updateFrequencyDisplay();
});

function updateSpeedDisplay() {
    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    const lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    const mach = speed / SPEED_OF_SOUND;

    let freqObserver1, freqObserver2;
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
    wave.style.transform = "translate(-50%, -50%)";
    container.appendChild(wave);

    const lambda = countWaveLength(sourceFrequency, SPEED_OF_SOUND);
    wave.style.animation = `wave-expand ${WAVE_LIFETIME}s linear forwards`;

    waves.push({
        element: wave,
        xPosition: xPosition,
        createdAt: timestamp / 1000,
    });

    setTimeout(() => {
        wave.remove();
        waves = waves.filter((w) => w.element !== wave);
    }, WAVE_LIFETIME * 900);
}

function createMachCone(timestamp) {
    const existingCone = document.querySelector(".mach-cone");
    if (existingCone) existingCone.remove();

    if (speed < SPEED_OF_SOUND) return;

    const machAngle = Math.asin(SPEED_OF_SOUND / speed) * (180 / Math.PI);
    const coneWidth = 50;
    const coneHeight = Math.tan(machAngle * (Math.PI / 180)) * (coneWidth / 2);

    const cone = document.createElement("div");
    cone.classList.add("mach-cone");
    cone.style.left = `${sourceX}%`;
    cone.style.top = "50%";
    cone.style.width = `${coneWidth}%`;
    cone.style.height = `${coneHeight * 2}%`;
    cone.style.clipPath = `polygon(0% 50%, 100% ${50 - coneHeight}%, 100% ${50 + coneHeight}%)`;
    container.appendChild(cone);

    const period = 1 / sourceFrequency;
    if (timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }
}

function update(timestamp) {
    const deltaTime = 0.016;
    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * 10 * SCALE_FACTOR;
    if (sourceX > 100) sourceX -= 100;

    movingDot.style.left = `${sourceX}%`;

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
        document.body.style.backgroundPosition = "0px";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193 255 244)";

        newType = "jet";
    } else if (isMissile) {
        document.body.style.backgroundImage = "url('./../js/img/sky.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "0px 180px";
        document.body.style.backgroundColor = "rgb(193 255 244)";

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

    const period = 1 / sourceFrequency;
    if (speed < SPEED_OF_SOUND && timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }

    if (speed >= SPEED_OF_SOUND) {
        createMachCone(timestamp);
    } else {
        const existingCone = document.querySelector(".mach-cone");
        if (existingCone) existingCone.remove();
    }

    requestAnimationFrame(update);
}

requestAnimationFrame(update);
