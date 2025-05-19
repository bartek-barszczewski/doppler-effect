import {dopplerFrequencySound, wavelength} from "./utils/formulas.js";

// DOM elements
const movingDot = document.getElementById("movingDot");
const container = document.querySelector(".container");
const speedControl = document.getElementById("speedControl");
const frequencyControl = document.getElementById("frequencyControl");
const speedDisplay = document.getElementById("speedDisplay");
const frequencyDisplay = document.getElementById("frequencyDisplay");
const speedDetails = document.getElementById("speedDetails");

// Constants
const SPEED_OF_SOUND = 343; // Speed of sound in air (m/s)
const CONTAINER_WIDTH = 100; // Width of container in percentage
const OBSERVER1_POS = 80; // Observer 1 position (%)
const OBSERVER2_POS = 20; // Observer 2 position (%)
const SCALE_FACTOR = 0.1; // Scale factor for mapping physical distances to percentages
const WAVE_LIFETIME = 5; // Wave lifetime in seconds

// State variables
let sourceX = 50; // Source position (% of container width)
let speed = parseFloat(speedControl.value); // Source speed (m/s)
let sourceFrequency = parseFloat(frequencyControl.value); // Source frequency (Hz)
let lastWaveTime = 0; // Time of last wave emission
let waves = []; // Array to store active waves

// Initialize displays
updateSpeedDisplay();
updateFrequencyDisplay();

// Event listeners for sliders
speedControl.addEventListener("input", () => {
    speed = parseFloat(speedControl.value);
    updateSpeedDisplay();
});

frequencyControl.addEventListener("input", () => {
    sourceFrequency = parseFloat(frequencyControl.value);
    updateFrequencyDisplay();
});

function updateSpeedDisplay() {
    const kmh = speed * 3.6;
    const mph = speed * 2.23694;
    const lambda = wavelength(sourceFrequency, SPEED_OF_SOUND);
    const mach = speed / SPEED_OF_SOUND;

    // Calculate observed frequencies
    let freqObserver1, freqObserver2;
    if (speed < SPEED_OF_SOUND) {
        // Observer 1 (source approaching if sourceX < OBSERVER1_POS)
        freqObserver1 = dopplerFrequencySound(
            sourceFrequency,
            SPEED_OF_SOUND,
            sourceX < OBSERVER1_POS ? speed : -speed,
            0
        );
        // Observer 2 (source approaching if sourceX < OBSERVER2_POS)
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
    updateSpeedDisplay(); // Fixed typo: Changed SpeedDisplay to speedDisplay
}

function createWave(xPosition, timestamp) {
    const wave = document.createElement("div");
    wave.classList.add("wave");
    wave.style.left = `${xPosition}%`;
    wave.style.top = "50%";
    wave.style.transform = "translate(-50%, -50%)";
    container.appendChild(wave);

    // Calculate animation duration based on wavelength
    const lambda = wavelength(sourceFrequency, SPEED_OF_SOUND);
    const animationDuration = WAVE_LIFETIME; // Fixed lifetime for visibility
    wave.style.animation = `wave-expand ${animationDuration}s linear forwards`;

    // Store wave data
    waves.push({
        element: wave,
        xPosition: xPosition,
        createdAt: timestamp / 1000,
    });

    setTimeout(() => {
        wave.remove();
        waves = waves.filter((w) => w.element !== wave);
    }, animationDuration * 1000);
}

function createMachCone(timestamp) {
    // Remove existing Mach cone
    const existingCone = document.querySelector(".mach-cone");
    if (existingCone) existingCone.remove();

    if (speed < SPEED_OF_SOUND) return;

    // Calculate Mach cone angle: sin(θ) = v/v_s
    const machAngle = Math.asin(SPEED_OF_SOUND / speed) * (180 / Math.PI);
    const coneWidth = 50; // Width of cone in %
    const coneHeight = Math.tan(machAngle * (Math.PI / 180)) * (coneWidth / 2);

    // Create Mach cone
    const cone = document.createElement("div");
    cone.classList.add("mach-cone");
    cone.style.left = `${sourceX}%`;
    cone.style.top = "50%";
    cone.style.width = `${coneWidth}%`;
    cone.style.height = `${coneHeight * 2}%`;
    cone.style.clipPath = `polygon(0% 50%, 100% ${50 - coneHeight}%, 100% ${50 + coneHeight}%)`;
    container.appendChild(cone);

    // Emit waves behind source for supersonic case
    const period = 1 / sourceFrequency;
    if (timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }
}

function update(timestamp) {
    // Update source position
    const deltaTime = 0.016; // Approximate frame time (60 FPS)
    sourceX += (speed / SPEED_OF_SOUND) * deltaTime * 10 * SCALE_FACTOR; // Scale movement
    if (sourceX > 100) sourceX -= 100; // Loop back to left

    movingDot.style.left = `${sourceX}%`;

    // Emit waves based on source frequency
    const period = 1 / sourceFrequency; // Period in seconds
    if (speed < SPEED_OF_SOUND && timestamp / 1000 - lastWaveTime >= period) {
        createWave(sourceX, timestamp);
        lastWaveTime = timestamp / 1000;
    }

    // Handle supersonic case
    if (speed >= SPEED_OF_SOUND) {
        createMachCone(timestamp);
    } else {
        // Remove Mach cone if present
        const existingCone = document.querySelector(".mach-cone");
        if (existingCone) existingCone.remove();
    }

    requestAnimationFrame(update);
}

// Start animation
requestAnimationFrame(update);
