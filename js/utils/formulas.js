// Funkcje matematyczne dla efektu Dopplera

// Efekt Dopplera dla dźwięku
export const dopplerFrequencySound = (fz, v, vz, vo) => {
    const denom = v - vz;
    if (Math.abs(vz) >= v) {
        return fz * ((v + vo) / Math.abs(denom));
    }
    return fz * ((v + vo) / denom);
};

// Długość fali
export const countWaveLength = (fz, v) => {
    return v / fz;
};

// Prędkość źródła
export const velocitySource = (fz, fo, v) => {
    return v * (1 - fz / fo);
};

// Prędkość obserwatora
export const velocityObserver = (fz, fo, v) => {
    return v * (fo / fz - 1);
};

// Przesunięcie ku czerwieni
export const redshift = (fz, fo) => {
    return (fo - fz) / fz;
};

// Przesunięcie ku błękitowi
export const blueshift = (fz, fo) => {
    return (fz - fo) / fz;
};
