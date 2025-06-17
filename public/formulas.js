/*
    Bartłomiej Barszczewski
    Fizyka
    Efekt Dopplera i zjawisko stożka Macha
    Semestr II
    Grupa B
*/
// Oblicza częstotliwość fali dźwiękowej odebranej przez obserwatora
// z uwzględnieniem klasycznego efektu Dopplera (dla fali akustycznej).
// fz – częstotliwość emitowana przez źródło
// v  – prędkość dźwięku w ośrodku (np. 343 m/s w powietrzu)
// vz – prędkość źródła względem ośrodka (dodatnia, gdy źródło zbliża się)
// vo – prędkość obserwatora względem ośrodka (dodatnia, gdy zbliża się do źródła)
const dopplerFrequencySound = (fz, v, vz, vo) => {
    const denom = v - vz;

    // Jeśli źródło porusza się z prędkością równą lub większą od dźwięku (np. efekt stożka Macha),
    // stosujemy bezwzględną wartość mianownika, by uniknąć podzielenia przez zero lub liczbę ujemną.
    if (Math.abs(vz) >= v) {
        return fz * ((v + vo) / Math.abs(denom));
    }

    // Klasyczny wzór Dopplera dla obserwatora i źródła w ruchu względem ośrodka.
    return fz * ((v + vo) / denom);
};

// Oblicza długość fali (λ) emitowanej przez źródło akustyczne
// fz – częstotliwość emitowana przez źródło
// v  – prędkość dźwięku w ośrodku
// λ = v / f
const countWaveLength = (fz, v) => {
    return v / fz;
};

// Wyznacza prędkość źródła (vz), mając daną częstotliwość emitowaną (fz),
// częstotliwość zaobserwowaną (fo) oraz prędkość dźwięku (v).
// Wyprowadzone z klasycznego wzoru Dopplera, zakładającego nieruchomego obserwatora.
// Jeśli fz < fo → źródło zbliża się (vz > 0)
const velocitySource = (fz, fo, v) => {
    return v * (1 - fz / fo);
};

// Wyznacza prędkość obserwatora (vo), znając częstotliwość źródła (fz),
// częstotliwość zaobserwowaną (fo) oraz prędkość dźwięku (v).
// Zakłada nieruchome źródło, a poruszającego się obserwatora.
// Jeśli fo > fz → obserwator zbliża się (vo > 0)
const velocityObserver = (fz, fo, v) => {
    return v * (fo / fz - 1);
};

// Odtwarza dźwięk z podanego URL — wykorzystywane np. do testów efektu Dopplera
// w aplikacji symulującej dźwięk poruszającego się obiektu.
function playSound(url) {
    const sound = new Audio(url);
    sound.play();
}

// Oblicza kąt stożka Macha (tylko jeśli prędkość źródła > prędkość dźwięku)
// v – prędkość dźwięku, vs – prędkość źródła
// θ = arcsin(v / vs)
const machConeAngle = (v, vs) => {
    if (vs <= v) return null; // Brak stożka – nie osiągnięto prędkości dźwięku
    return Math.asin(v / vs); // W radianach
};
