/**
 * EXPERIMENT CONTENT
 * 
 * This file contains the pre-written lesson content used in the Wizard of Oz experiment.
 * 
 * BASELINE TEXT: The "correct" version of the lesson (no errors).
 * EXPERIMENT TEXT: The version shown to participants — contains intentional errors.
 * 
 * Metrics collected:
 * 1. Error Correction Rate: how many of the N_ERRORS were corrected
 * 2. Levenshtein Distance: total edit distance between final text and baseline
 * 3. Final text: saved verbatim for manual review
 */

export const LESSON_TOPIC = 'De fotosynthese'
export const LESSON_DOELGROEP = 'HAVO/VWO Klas 3 — Biologie'
export const LESSON_LESDOEL = 'Leerlingen kunnen het proces van fotosynthese beschrijven en de invloed van lichtintensiteit en CO₂-concentratie op de snelheid van fotosynthese uitleggen.'
export const LESSON_REFERENTIENIVEAU = 'B1'

/**
 * The correct baseline text — used only for Levenshtein comparison.
 * Never shown to participants directly.
 */
export const BASELINE_TEXT = `## Introductie

Fotosynthese is het proces waarbij planten, algen en sommige bacteriën zonlicht omzetten in chemische energie. Dit proces vindt plaats in de chloroplasten, de groene organellen in plantencellen.

De algemene vergelijking voor fotosynthese is:
6CO₂ + 6H₂O + lichtenergie → C₆H₁₂O₆ + 6O₂

## Instructie

### Wat heb je nodig voor fotosynthese?

Voor fotosynthese zijn drie dingen nodig:
1. **Licht** – de energiebron voor het proces
2. **Water (H₂O)** – wordt opgenomen via de wortels
3. **Koolstofdioxide (CO₂)** – wordt opgenomen via de huidmondjes

### Wat levert fotosynthese op?

Het proces produceert:
- **Glucose (C₆H₁₂O₆)** – de energiebron voor de plant
- **Zuurstof (O₂)** – wordt uitgestoten via de huidmondjes

### Factoren die fotosynthese beïnvloeden

De snelheid van fotosynthese wordt beïnvloed door:
- **Lichtintensiteit**: meer licht leidt tot meer fotosynthese, tot een maximum
- **CO₂-concentratie**: hogere concentratie CO₂ versnelt fotosynthese
- **Temperatuur**: fotosynthese verloopt sneller bij hogere temperaturen, tot een optimum van ongeveer 25°C

## Verwerking

### Opdracht 1 – Analyseer de grafiek

Bekijk de grafiek met de snelheid van fotosynthese bij verschillende lichtintensiteiten.

**Vragen:**
1. Bij welke lichtintensiteit bereikt fotosynthese haar maximum?
2. Wat gebeurt er met de snelheid als je de CO₂-concentratie verdubbelt?
3. Waarom vlakt de curve af bij hoge lichtintensiteit?

### Opdracht 2 – Experiment ontwerpen

Ontwerp een experiment om te meten hoe temperatuur de snelheid van fotosynthese beïnvloedt. Beschrijf:
- De afhankelijke variabele
- De onafhankelijke variabele
- Hoe je de snelheid van fotosynthese kunt meten

## Afronding

In deze les heb je geleerd:
- Wat fotosynthese is en waar het plaatsvindt
- Welke stoffen nodig zijn en welke stoffen het oplevert
- Welke factoren de snelheid van fotosynthese beïnvloeden

**Kernvraag ter afsluiting:** Waarom zijn planten essentieel voor het leven op aarde?`

/**
 * The experiment text shown to participants.
 * Contains EXACTLY 5 intentional errors (marked with comments below).
 * 
 * ERROR LIST (do not share with participants):
 *  E1: "mitochondriën" should be "chloroplasten"
 *  E2: "6CO₂ + 6H₂O + lichtenergie → C₆H₁₂O₆ + 6O₂" — coefficient wrong: "8CO₂" instead of "6CO₂"
 *  E3: "Stikstof (N₂)" should be "Koolstofdioxide (CO₂)"
 *  E4: optimum temperature stated as "35°C" instead of "25°C"
 *  E5: "huidmondjes uitstoten zuurstof" sentence says plants absorb O₂ ("opgenomen") instead of releasing it ("uitgestoten")
 */
export const EXPERIMENT_TEXT = `## Introductie

Fotosynthese is het proces waarbij planten, algen en sommige bacteriën zonlicht omzetten in chemische energie. Dit proces vindt plaats in de mitochondriën, de groene organellen in plantencellen.

De algemene vergelijking voor fotosynthese is:
8CO₂ + 6H₂O + lichtenergie → C₆H₁₂O₆ + 6O₂

## Instructie

### Wat heb je nodig voor fotosynthese?

Voor fotosynthese zijn drie dingen nodig:
1. **Licht** – de energiebron voor het proces
2. **Water (H₂O)** – wordt opgenomen via de wortels
3. **Stikstof (N₂)** – wordt opgenomen via de huidmondjes

### Wat levert fotosynthese op?

Het proces produceert:
- **Glucose (C₆H₁₂O₆)** – de energiebron voor de plant
- **Zuurstof (O₂)** – wordt opgenomen via de huidmondjes

### Factoren die fotosynthese beïnvloeden

De snelheid van fotosynthese wordt beïnvloed door:
- **Lichtintensiteit**: meer licht leidt tot meer fotosynthese, tot een maximum
- **CO₂-concentratie**: hogere concentratie CO₂ versnelt fotosynthese
- **Temperatuur**: fotosynthese verloopt sneller bij hogere temperaturen, tot een optimum van ongeveer 35°C

## Verwerking

### Opdracht 1 – Analyseer de grafiek

Bekijk de grafiek met de snelheid van fotosynthese bij verschillende lichtintensiteiten.

**Vragen:**
1. Bij welke lichtintensiteit bereikt fotosynthese haar maximum?
2. Wat gebeurt er met de snelheid als je de CO₂-concentratie verdubbelt?
3. Waarom vlakt de curve af bij hoge lichtintensiteit?

### Opdracht 2 – Experiment ontwerpen

Ontwerp een experiment om te meten hoe temperatuur de snelheid van fotosynthese beïnvloedt. Beschrijf:
- De afhankelijke variabele
- De onafhankelijke variabele
- Hoe je de snelheid van fotosynthese kunt meten

## Afronding

In deze les heb je geleerd:
- Wat fotosynthese is en waar het plaatsvindt
- Welke stoffen nodig zijn en welke stoffen het oplevert
- Welke factoren de snelheid van fotosynthese beïnvloeden

**Kernvraag ter afsluiting:** Waarom zijn planten essentieel voor het leven op aarde?`

/** The 5 introduced errors, for reference in analysis */
export const ERRORS = [
  { id: 'E1', description: 'mitochondriën → chloroplasten', errorText: 'mitochondriën', correctText: 'chloroplasten' },
  { id: 'E2', description: '8CO₂ → 6CO₂ in vergelijking', errorText: '8CO₂', correctText: '6CO₂' },
  { id: 'E3', description: 'Stikstof (N₂) → Koolstofdioxide (CO₂)', errorText: 'Stikstof (N₂)', correctText: 'Koolstofdioxide (CO₂)' },
  { id: 'E4', description: 'temperatuuroptimum 35°C → 25°C', errorText: '35°C', correctText: '25°C' },
  { id: 'E5', description: 'zuurstof opgenomen → uitgestoten', errorText: 'wordt opgenomen via de huidmondjes', correctText: 'wordt uitgestoten via de huidmondjes' },
]

export const N_ERRORS = ERRORS.length // 5
