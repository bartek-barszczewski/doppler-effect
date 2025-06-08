// Importuje funkcje do obliczeń częstotliwości Dopplera i długości fali z pliku formulas.js
import {dopplerFrequencySound, countWaveLength} from "./utils/formulas.js";

// Pobiera element DOM reprezentujący poruszający się punkt (źródło dźwięku)
const movingDot = document.getElementById("movingDot");
// Pobiera kontener, w którym odbywa się cała symulacja
const container = document.querySelector(".container");
// Suwak kontrolujący prędkość źródła dźwięku
const speedControl = document.getElementById("speedControl");
// Suwak kontrolujący częstotliwość dźwięku źródła
const frequencyControl = document.getElementById("frequencyControl");
// Wyświetlacz pokazujący aktualną prędkość
const speedDisplay = document.getElementById("speedDisplay");
// Wyświetlacz pokazujący aktualną częstotliwość
const frequencyDisplay = document.getElementById("frequencyDisplay");
// Element DOM pokazujący szczegóły dotyczące prędkości
const speedDetails = document.getElementById("speedDetails");
// Element DOM reprezentujący górną falę uderzeniową (szokową)
const shockwaveUpper = document.getElementById("shockwave_upper");
// Element DOM reprezentujący dolną falę uderzeniową (szokową)
const shockwaveLower = document.getElementById("shockwave_lower");
// Obserwator, który odbiera dźwięk i doświadcza efektu Dopplera
const observer = document.getElementById("observer1");

// Domyślne wartości początkowe
const DEFAULT_FREQ = 400; // Domyślna częstotliwość dźwięku
const DEFAULT_FREQ_AMB = 900; // Domyślna częstotliwość syreny
const DEFAULT_SPEED = 25; // Domyślna prędkość źródła dźwięku

const SPEED_OF_SOUND = 343; // Prędkość dźwięku w powietrzu (m/s)
// 100% szerokości kontenera = 343 m (1% = 3.43 m)
const METERS_PER_PERCENT = 3.43;
const SPEED_OF_SOUND_SIM = SPEED_OF_SOUND / METERS_PER_PERCENT; // % na sekundę
const SCALE_FACTOR = 1.5; // Skalowanie interfejsu graficznego
const WAVE_LIFETIME = 1; // Czas życia jednej fali dźwiękowej (w sekundach)
const CONE_WIDTH_PERCENT = 30; // Szerokość stożka fali uderzeniowej (w %)
const MIN_SHOCKWAVE_INTERVAL = 5; // Minimalny odstęp czasowy pomiędzy falami uderzeniowymi
const FREQUENCY_SCALE_FACTOR = 50; // Współczynnik skalowania częstotliwości w symulacji

// Zmienne stanu
let observerX = 50; // Pozycja obserwatora w % (środek kontenera)
let sourceX = 50; // Początkowa pozycja źródła dźwięku
let speed = parseFloat(speedControl.value) || DEFAULT_SPEED; // Prędkość z suwaczka lub domyślna
let sourceFrequency = parseFloat(frequencyControl.value / 100) || DEFAULT_FREQ; // Częstotliwość z suwaczka lub domyślna
let lastWaveTime = 0; // Czas emisji ostatniej fali
let waves = []; // Tablica wszystkich fal w symulacji
let isFrequencyManual = false; // Czy częstotliwość została ustawiona ręcznie
let currentType = 'car'; // Typ dźwięku aktualnie odtwarzany (np. 'car', 'ambulance')
let lastShockwavePos = null; // Pozycja ostatniej fali uderzeniowej
let lastShockwaveTime = 0; // Czas emisji ostatniej fali uderzeniowej
let freqObserver = null; // Częstotliwość odebrana przez obserwatora
let reflectedWaveTimeouts = []; // Tablica timeoutów dla odbitych fal
let reflection2DTimeouts = []; // Tablica timeoutów dla odbić 2D

const c = 343; // Duplikacja prędkości dźwięku w m/s dla wygody (można usunąć)

let audioContext = null; // Kontekst audio Web Audio API
let osc = null; // Oscylator (źródło dźwięku)
let gain = null; // Wzmacniacz (głośność)
let lfo = null; // Niskoczęstotliwościowy oscylator (modulacja syreny)
let lfoGain = null; // Zasięg modulacji LFO
let currentSoundType = null; // Aktualnie odtwarzany typ dźwięku
let lastEngineSoundType = null; // Poprzedni odtwarzany typ dźwięku

// Funkcja uruchamiająca dźwięk syreny (ambulans)
function startAmbulanceSiren() {
    stopAmbulanceSiren(); // Zatrzymaj wcześniejszy dźwięk
    audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Tworzy kontekst audio
    osc = audioContext.createOscillator(); // Tworzy główny oscylator (ton bazowy)
    osc.type = "square"; // Typ fali: prostokątna (bardziej intensywna)
    osc.frequency.value = 700; // Częstotliwość podstawowa syreny
    lfo = audioContext.createOscillator(); // Tworzy LFO do modulacji dźwięku
    lfo.type = "triangle"; // Fala trójkątna dla modulacji
    lfo.frequency.value = 5; // Częstotliwość modulacji (5 Hz)
    lfoGain = audioContext.createGain(); // Tworzy wzmacniacz dla LFO
    lfoGain.gain.value = 250; // Zakres modulacji (im większy, tym bardziej „jęcząca” syrena)
    lfo.connect(lfoGain); // Podłącz LFO do jego gaina
    lfoGain.connect(osc.frequency); // LFO wpływa na częstotliwość oscylatora
    gain = audioContext.createGain(); // Główna kontrola głośności
    gain.gain.value = 0.01; // Bardzo cicho (symulacja)
    osc.connect(gain); // Połączenie źródła z głośnością
    gain.connect(audioContext.destination); // Wyjście dźwięku do słuchawek/głośników
    osc.start(); // Start oscylatora
    lfo.start(); // Start LFO
}

// Funkcja zatrzymująca syrenę i czyszcząca zasoby
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

// Funkcja zatrzymująca dźwięk silnika i zwalniająca zasoby Web Audio API
function stopEngineSound() {
    stopAmbulanceSiren(); // Upewnia się, że jeśli była uruchomiona syrena, zostanie zatrzymana

    if (osc) { // Sprawdza, czy istnieje aktywny oscylator
        try {
            osc.stop();       // Próbuje zatrzymać oscylator
            osc.disconnect(); // Odłącza oscylator od łańcucha audio
        } catch (e) {}        // Ignoruje błędy (np. jeśli oscylator już został zatrzymany)
        osc = null;           // Czyści referencję do oscylatora
    }

    if (gain) { // Sprawdza, czy istnieje obiekt Gain (kontrola głośności)
        try {
            gain.disconnect(); // Odłącza wzmacniacz od audioContext
        } catch (e) {}         // Ignoruje ewentualne błędy
        gain = null;           // Czyści referencję do gain
    }

    if (audioContext) { // Sprawdza, czy istnieje kontekst audio
        try {
            audioContext.close(); // Próbuje zamknąć kontekst
        } catch (e) {}            // Ignoruje błędy
        audioContext = null;      // Czyści referencję do kontekstu
    }

    currentSoundType = null; // Resetuje aktualny typ dźwięku
}

// Funkcja uruchamiająca dźwięk silnika zgodnie z typem: 'car', 'sport', lub 'ambulance'
function startEngineSound(type) {
    if (currentSoundType === type) return; // Jeśli już odtwarzany jest ten typ, pomija dalsze kroki

    stopEngineSound();     // Zatrzymuje wszystkie aktualne dźwięki i czyści zasoby
    currentSoundType = type; // Zapisuje nowy typ dźwięku jako aktualny

    if (type === "ambulance") { // Jeśli wybrany typ to ambulans...
        startAmbulanceSiren();  // ...uruchamia modulowaną syrenę (z LFO)
        return;                 // Przerywa dalsze wykonanie tej funkcji
    }

    // Tworzy nowy kontekst audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Tworzy główny oscylator (źródło dźwięku)
    osc = audioContext.createOscillator();

    // Tworzy wzmacniacz (gain node) do kontroli głośności
    gain = audioContext.createGain();

    // Ustawia parametry oscylatora w zależności od typu pojazdu
    if (type === "car") {
        osc.type = "square";        // Typ fali: prostokątna (ostry, mechaniczny dźwięk)
        osc.frequency.value = 120;  // Częstotliwość dźwięku dla zwykłego samochodu
    } else if (type === "sport") {
        osc.type = "square";        // Fala prostokątna też dla sportowego auta
        osc.frequency.value = 60;   // Niższa częstotliwość = niższy, „basowy” dźwięk silnika
    } else {
        osc.type = "sine";          // Domyślnie fala sinusoidalna (łagodniejszy dźwięk)
        osc.frequency.value = 40;   // Niska częstotliwość
    }

    gain.gain.value = 0.5; // Ustawia poziom głośności na połowę

    // Łączy oscylator z gainem (regulacją głośności)
    osc.connect(gain);

    // Łączy gain z wyjściem audio (np. słuchawki lub głośniki)
    gain.connect(audioContext.destination);

    osc.start(); // Uruchamia oscylator (zaczyna generować dźwięk)
}

function updateEngineSound(type, srcX, observerX, v) {
    // Uruchamiaj lub zmieniaj dźwięk tylko jeśli typ się zmienił względem poprzedniego
    if (type !== lastEngineSoundType) {
        startEngineSound(type); // Startuje nowy typ dźwięku
        lastEngineSoundType = type; // Zapamiętuje aktualny typ
    }

    // Jeśli typ dźwięku nie należy do dozwolonych, zatrzymaj silnik i wyjdź
    if (!["car", "ambulance", "sport"].includes(type)) {
        stopEngineSound();
        return;
    }

    // Nie zmieniamy częstotliwości ani gain dla syreny ambulansu (robi to LFO)
    if (type !== "ambulance" && gain && osc && audioContext) {
        // Oblicz dystans między źródłem a obserwatorem (w procentach kontenera)
        const percentToMeters = METERS_PER_PERCENT; // 100% = 343 m
        // ======================
        // distance musi musi być taki by 
        // dźwięk fali odtwarzał się wcześniej bo fala ma pewien rozmiar
        // i już wcześniej dźwięki są emitowane i wcześniej trafiają do odbiorcy
        const distance = Math.abs(srcX - observerX) * percentToMeters; // tutaj jeszcze by się przydała poprawka na rozmiar emitowanej fali
        // ======================
        // Wzór: głośność maleje z kwadratem odległości, przy minimum 1m
        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.3;

        // Jeśli źródło jest zbyt daleko, ustaw głośność na 0
        const silenceThreshold = 20;
        let appliedVolume = distance > silenceThreshold ? 0 : volume;

        // Parametry charakterystyczne dla typów pojazdów
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

        // Wylicz częstotliwość na podstawie prędkości
        let freq = base + scale * v;
        // Ogranicz częstotliwość do dozwolonego zakresu
        freq = Math.max(low, Math.min(freq, high));

        // Efekt Dopplera: zmodyfikuj częstotliwość w zależności od kierunku ruchu
        if (srcX < observerX) freq *= 1.03; // Zbliża się → wyższy ton
        else if (srcX > observerX) freq *= 0.97; // Oddala się → niższy ton

        // Płynna zmiana głośności i częstotliwości w czasie
        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.02);
        osc.frequency.linearRampToValueAtTime(freq, audioContext.currentTime + 0.02);
    }

    // Znów sprawdza zmianę typu – może być nadmiarowe (duplikat)
    if (type !== lastEngineSoundType) {
        startEngineSound(type);
        lastEngineSoundType = type;
    }

    // Ponownie sprawdza typ dźwięku – to także może być zbędne (duplikat)
    if (!["car", "ambulance", "sport"].includes(type)) {
        stopEngineSound();
        return;
    }

    // --- SPECJALNE ZACHOWANIE DLA SYRENY AMBULANSU ---
    if (type === "ambulance" && gain && audioContext) {
        // Oblicz odległość do obserwatora
        const percentToMeters = METERS_PER_PERCENT;
        // ========================
        const distance = Math.abs(srcX - observerX) * percentToMeters; // // TUTAJ BY SIĘ JESZCZE PRZYDAŁA POPRAWKA ROZMIARU EMITOWANEJ FALI
        // ========================
        // Głośność maleje z kwadratem odległości
        // Przy bardzo małej odległości głośność nie powinna być nieskończona (wprowadzamy minimum)
        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.06;
        const silenceThreshold = 20; // Jeżeli źródło jest bardzo daleko (np. >20m) – wycisz całkowicie
        let appliedVolume = distance > silenceThreshold ? 0 : volume;

        // Płynna zmiana tylko głośności, NIE częstotliwości (ta jest modulowana przez LFO)
        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.03);
    }
    // --- NORMALNE ZACHOWANIE DLA POZOSTAŁYCH TYPÓW ---
    else if (type !== "ambulance" && gain && osc && audioContext) {
        const percentToMeters = METERS_PER_PERCENT;
        // ========================
        const distance = Math.abs(srcX - observerX) * percentToMeters; // // TUTAJ BY SIĘ JESZCZE PRZYDAŁA POPRAWKA ROZMIARU EMITOWANEJ FALI
        // ========================
        // Głośność maleje z kwadratem odległości
        // Przy bardzo małej odległości głośność nie powinna być nieskończona (wprowadzamy minimum)
        const minDistance = 1;
        const volume = Math.min(1, 1 / Math.pow(Math.max(distance, minDistance), 2)) * 0.3;
        const silenceThreshold = 20; // Jeżeli źródło jest bardzo daleko (np. >20m) – wycisz całkowicie
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

        if (srcX < observerX) freq *= 1.03;
        else if (srcX > observerX) freq *= 0.97;

        gain.gain.linearRampToValueAtTime(appliedVolume, audioContext.currentTime + 0.02);
        osc.frequency.linearRampToValueAtTime(freq, audioContext.currentTime + 0.02);
    }
}