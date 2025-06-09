# Dokumentacja projektu: Symulacja efektu Dopplera

## Autor: Bartłomiej Barszczewski

## Przedmiot: Fizyka (Semestr 2)

## Temat: Efekt Dopplera i zjawisko stożka Macha – Symulacja komputerowa

---

## Spis treści

1. **Cel projektu**
2. **Opis działania aplikacji**
3. **Podstawy fizyczne i zastosowane wzory**
4. **Obliczenia i parametry symulacji**
5. **Logika programu i interfejs użytkownika**
6. **Opisy poszczególnych bloków obliczeniowych**
7. **Zastosowanie oraz ograniczenia**
8. **Wnioski**

---

## 1. Cel projektu

Celem projektu jest stworzenie komputerowej symulacji efektu Dopplera i zjawiska stożka Macha dla ruchomego źródła dźwięku. Symulator pozwala na interaktywną wizualizację, eksperymentowanie z parametrami oraz obserwowanie wpływu prędkości i częstotliwości źródła na rozchodzenie się fal akustycznych. Program demonstruje zjawiska takie jak:

* zmiana wysokości dźwięku przy zbliżaniu/oddalaniu się źródła,
* różnice w długości fal przed i za poruszającym się źródłem,
* powstawanie stożka Macha przy przekroczeniu prędkości dźwięku,
* efekty specjalne: fala uderzeniowa (boom dźwiękowy), zmiana energii, przesunięcia Dopplera.

---

## 2. Opis działania aplikacji

Aplikacja jest interaktywną symulacją webową (HTML + JavaScript). Użytkownik steruje parametrami źródła dźwięku:

* **Prędkość źródła** (suwak): od 1 do 8000 m/s
* **Częstotliwość źródła** (suwak): od 20 Hz do 20000 Hz
* Możliwość przeciągania źródła oraz obserwatora na osi X

Wizualizacja obejmuje:

* Rozchodzenie się fal dźwiękowych,
* Ruchome źródło (samochód, ambulans, odrzutowiec, pocisk – w zależności od prędkości),
* Obserwatora na osi X,
* Stożek Macha i linie szokowe dla naddźwiękowych prędkości,
* Efekty dźwiękowe,
* Wyświetlanie szczegółowych parametrów fizycznych w panelach bocznych i modalnym oknie wyników.

---

## 3. Podstawy fizyczne i zastosowane wzory

W symulatorze zaimplementowano następujące prawa fizyki i wzory:

### a) Efekt Dopplera dla dźwięku

**Wzór na częstotliwość odbieraną przez obserwatora:**

```
f' = f₀ * (v + v_o) / (v - v_s)
```

Gdzie:

* f' – częstotliwość odbierana przez obserwatora
* f₀ – częstotliwość źródła
* v – prędkość dźwięku (w powietrzu \~343 m/s)
* v\_o – prędkość obserwatora względem ośrodka (tu: 0, bo obserwator jest statyczny)
* v\_s – prędkość źródła (dodatnia, gdy zbliża się do obserwatora)

### b) Długość fali akustycznej

```
λ = v / f₀
```

Gdzie:

* λ – długość fali
* v – prędkość dźwięku
* f₀ – częstotliwość źródła

### c) Liczba Macha i kąt stożka Macha

```
M = v_s / v
sin(θ) = v / v_s
θ = arcsin(v / v_s)
```

Gdzie:

* M – liczba Macha (ile razy prędkość przekracza prędkość dźwięku)
* θ – kąt stożka Macha

### d) Przesunięcie Dopplera

```
Δf = f' - f₀
Współczynnik Dopplera = f' / f₀
```

### e) Energia fali przy obserwatorze

```
E ∝ 1 / d²
```

Gdzie d – odległość między źródłem a obserwatorem.

### f) Przesunięcie fazowe

```
Δφ = 2π * d / λ
```

### g) Czas dotarcia fali

```
t = d / v
```

---

## 4. Obliczenia i parametry symulacji

Wszystkie powyższe wzory zostały zaimplementowane w funkcjach JavaScript (szczegółowo komentowane w kodzie):

* **dopplerFrequencySound(fz, v, vz, vo)** – oblicza częstotliwość dla obserwatora wg klasycznego efektu Dopplera
* **countWaveLength(fz, v)** – wylicza długość fali
* **velocitySource/velocityObserver** – pozwalają obliczyć prędkość źródła lub obserwatora na podstawie znanych częstotliwości
* **redshift/blueshift** – przesunięcia częstotliwości
* **Energia, czas dotarcia, przesunięcie fazowe** – dodatkowe parametry liczone wg wzorów podanych wyżej

Parametry domyślne i jednostki symulacji:

* Prędkość dźwięku w powietrzu: **343 m/s**
* Zakres prędkości źródła: **1 – 8000 m/s**
* Zakres częstotliwości: **20 – 20000 Hz**
* Przeskalowanie pozycji i animacji: 1% szerokości ekranu ≈ 3.43 m
* Animacja fali – liczba emitowanych fal ograniczona przez skalę częstotliwości (dla wydajności przeglądarki)

---

## 5. Logika programu i interfejs użytkownika

* Panel sterowania pozwala ustawiać prędkość i częstotliwość źródła (suwaki)
* Wizualizacje: źródło dźwięku (obrazek), obserwator (postać), fale akustyczne (okręgi), stożek Macha (linie, trójkąt), fale odbite (efekt boomu)
* Obliczone parametry i wyniki wyświetlane są na bieżąco w panelach bocznych oraz w tabeli modalnej „Wyniki i wzory”
* Dodatkowo możliwe jest przesuwanie źródła i obserwatora myszą (drag\&drop)
* Specjalne efekty dźwiękowe: zmiana tonu silnika, syrena ambulansu, efekt boomu dźwiękowego przy przejściu przez barierę dźwięku

---

## 6. Opisy bloków obliczeniowych

Wszystkie kluczowe funkcje programu są szczegółowo opisane w kodzie (patrz komentarze // oraz /\*\* ... \*/ w kodzie JavaScript). Oto podsumowanie:

* **Obliczanie efektu Dopplera:**

  * Funkcja `dopplerFrequencySound()` używa klasycznego wzoru na efekt Dopplera, bierze pod uwagę kierunek ruchu (zbliżanie/oddalanie)
* **Obliczanie długości fali:**

  * `countWaveLength()` stosuje wzór lambda = v / f
* **Stożek Macha:**

  * Funkcje obliczające liczbę Macha i kąt θ, a także rysujące stożek w SVG/CSS
* **Energia i czas dotarcia:**

  * Każda fala na ekranie ma obliczaną energię (maleje z kwadratem odległości od obserwatora), a także czas, po którym dociera do obserwatora
* **Przesunięcia częstotliwości:**

  * Przesunięcia Dopplera (delta f), faza, słyszalność, odległość w metrach i procentach

---

## 7. Zastosowanie oraz ograniczenia

**Zastosowania:**

* Edukacja fizyczna i akustyczna,
* Symulacja zjawisk naddźwiękowych,
* Pomoc w wizualizacji trudnych pojęć (Doppler, stożek Macha, fala szokowa)

**Ograniczenia:**

* Liczba fal i częstotliwości w symulacji jest ograniczona dla wydajności przeglądarki
* Dźwięki są generowane syntetycznie przez Web Audio API, więc nie odwzorowują w pełni rzeczywistych odgłosów (ale pokazują zjawiska zmiany tonu, głośności, efektu Dopplera)
* Przy bardzo dużych prędkościach, animacja może działać mniej płynnie
* Symulacja nie uwzględnia tłumienia fal w ośrodku ani odbić innych niż od obserwatora

---

## 8. Wnioski

Stworzona symulacja pozwala intuicyjnie zrozumieć, jak prędkość źródła dźwięku i jego częstotliwość wpływają na odbiór fali przez obserwatora. Pozwala eksperymentować z ekstremalnymi wartościami i obserwować zjawiska, które w warunkach szkolnych lub domowych byłyby niemożliwe do przeprowadzenia. Projekt stanowi wartościową pomoc dydaktyczną i pokazuje, jak nowoczesne narzędzia informatyczne mogą wspierać nauczanie fizyki.
