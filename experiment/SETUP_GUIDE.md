# Wizard of Oz Experiment — Setup Guide

**MaxAssist Automation Bias Experiment**  
Vercel + Formspree deployment guide

---

## Overzicht

Dit experiment meet **automation bias** bij leraren die AI-gegenereerde lesinhoud beoordelen. De applicatie is een gefaseerde Wizard of Oz setup: deelnemers geloven dat een AI les genereert, maar de inhoud is vooraf vastgelegd — inclusief **5 bewuste fouten**.

**Metrics die worden opgeslagen (via Formspree):**
- `error_correction_rate` — percentage van de 5 fouten dat gecorrigeerd is (0.0–1.0)
- `levenshtein_distance` — totale bewerkingsafstand t.o.v. de correcte baseline
- `final_text` — de volledige eindtekst, voor handmatige analyse
- `condition` — experimentele conditie van de deelnemer
- `participant_id` — Qualtrics deelnemer-ID

---

## Stap 1 — Repository opzetten

1. Maak een nieuwe GitHub repository aan, bijv. `maxassist-experiment`
2. Kopieer de volgende mappen/bestanden uit het geleverde zipbestand naar de root:
   ```
   apps/experiment/
   ├── app/
   │   ├── layout.tsx
   │   ├── globals.css
   │   ├── page.tsx               ← redirect naar /experiment
   │   └── experiment/
   │       └── page.tsx           ← de volledige experiment-applicatie
   ├── lib/
   │   ├── experiment-content.ts  ← lesinhoud + fouten
   │   └── metrics.ts             ← Levenshtein + foutenteller
   ├── next.config.js
   ├── tailwind.config.js
   ├── postcss.config.js
   ├── tsconfig.json
   └── package.json
   ```
3. Push naar GitHub

---

## Stap 2 — Formspree instellen

1. Ga naar [formspree.io](https://formspree.io) en maak een account aan
2. Maak een nieuw formulier aan: **"MaxAssist Experiment Data"**
3. Kopieer je **Form ID** (ziet eruit als `xrgjoqkp`)
4. Open `apps/experiment/app/experiment/page.tsx`
5. Zoek de regel:
   ```typescript
   const res = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
   ```
6. Vervang `YOUR_FORMSPREE_ID` door jouw echte Form ID:
   ```typescript
   const res = await fetch('https://formspree.io/f/xrgjoqkp', {
   ```
7. Sla op en commit naar GitHub

**Formspree ontvangt per deelnemer:**

| Veld | Beschrijving |
|------|-------------|
| `participant_id` | Qualtrics PID uit URL-parameter |
| `condition` | `baseline`, `nudge_accuracy`, of `nudge_trust` |
| `error_correction_rate` | bijv. `0.6` = 3 van 5 fouten gecorrigeerd |
| `errors_corrected` | bijv. `E1,E3,E5` |
| `errors_uncorrected` | bijv. `E2,E4` |
| `levenshtein_distance` | integer, bijv. `47` |
| `final_text` | de volledige eindtekst |
| `submitted_at` | ISO timestamp |

---

## Stap 3 — Deployen op Vercel

1. Ga naar [vercel.com](https://vercel.com) en log in
2. Klik **"Add New Project"** → importeer je GitHub repository
3. Stel de volgende **Build Settings** in:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/experiment`
   - **Build Command:** `npm run build` *(automatisch)*
   - **Output Directory:** `.next` *(automatisch)*
4. Klik **Deploy**
5. Vercel geeft je een URL, bijv. `https://maxassist-experiment.vercel.app`

> **Tip:** Je kunt ook een eigen domein koppelen via Vercel's domeininstellingen.

---

## Stap 4 — Experiment URL structuur

Deelnemers worden vanuit Qualtrics doorgestuurd met URL-parameters:

```
https://maxassist-experiment.vercel.app/experiment?pid=${e://Field/ResponseID}&condition=baseline
```

### URL-parameters

| Parameter | Beschrijving | Voorbeeld |
|-----------|-------------|---------|
| `pid` | Qualtrics Response ID | `R_3Pq8...` |
| `condition` | Experimentele conditie | `baseline` / `nudge_accuracy` / `nudge_trust` |

### Qualtrics instellen

1. Voeg een **Web Service** of **End of Block** element toe aan je Qualtrics-survey
2. Gebruik een **Embedded Data** blok vóór de redirect om `condition` op te slaan
3. Gebruik een **End of Survey** → **Redirect to a URL** instelling:
   ```
   https://maxassist-experiment.vercel.app/experiment?pid=${e://Field/ResponseID}&condition=${e://Field/condition}
   ```
4. Na het "Delen met collega's" klikken wordt de deelnemer doorgestuurd naar de afsluitpagina die aangeeft terug te keren naar Qualtrics

---

## Stap 5 — De 5 bewuste fouten

De volgende fouten zijn ingebouwd in de gegenereerde les. Deel deze tabel **niet** met deelnemers.

| ID | Locatie | Fout in experiment | Correct |
|----|---------|-------------------|---------|
| E1 | Introductie, alinea 1 | *mitochondriën* | chloroplasten |
| E2 | Introductie, vergelijking | *8CO₂* | 6CO₂ |
| E3 | Instructie, punt 3 | *Stikstof (N₂)* | Koolstofdioxide (CO₂) |
| E4 | Factoren, temperatuur | *35°C* | 25°C |
| E5 | Wat levert fotosynthese op? | *wordt opgenomen* via huidmondjes | wordt **uitgestoten** |

**Error Correction Rate** = (aantal gecorrigeerde fouten) / 5

---

## Stap 6 — Experimentele condities aanmaken

Het bestand `page.tsx` bevat een `<NudgeBox>` component die op basis van de `condition`-parameter andere content toont.

### Huidige condities

| Conditie | URL-parameter | Beschrijving |
|----------|--------------|-------------|
| Baseline | `condition=baseline` | Geen nudge; standaard AI-disclaimer |
| Accuracy nudge | `condition=nudge_accuracy` | Blauwe box: "Controleer de inhoud nauwkeurig" |
| Trust nudge | `condition=nudge_trust` | Groene box: "Kwaliteitsgecontroleerde inhoud" |

### Nieuwe conditie toevoegen

1. Open `apps/experiment/app/experiment/page.tsx`
2. Zoek de `NudgeBox` functie (rond regel 290)
3. Voeg een nieuw blok toe na de bestaande condities:

```typescript
// CONDITIE 3: sociale norm nudge
if (condition === 'nudge_social' && tab === 'les') {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex gap-3">
      <span className="text-purple-500 text-lg">👥</span>
      <div>
        <p className="text-sm font-semibold text-purple-900">Andere leraren controleren dit altijd</p>
        <p className="text-sm text-purple-700">95% van de leraren past de AI-inhoud aan voordat ze deze delen.</p>
      </div>
    </div>
  )
}
```

4. Commit en push → Vercel herdeployt automatisch
5. Test via: `https://jouw-url.vercel.app/experiment?pid=test123&condition=nudge_social`

---

## Stap 7 — Lokaal testen

```bash
# Navigeer naar de experiment-app
cd apps/experiment

# Installeer dependencies
npm install

# Start dev server
npm run dev
```

Open: `http://localhost:3000/experiment?pid=testdeelnemer&condition=baseline`

Test alle condities door `condition=` te wijzigen in de URL.

---

## Stap 8 — Data analyseren

### Formspree data exporteren

1. Log in op formspree.io
2. Open je formulier → tabblad **Submissions**
3. Klik **Export CSV**

### Kolommen in de export

```
participant_id, condition, error_correction_rate, errors_corrected,
errors_uncorrected, levenshtein_distance, final_text, submitted_at
```

### Basis analyse in Python

```python
import pandas as pd

df = pd.read_csv('formspree_export.csv')

# Gemiddelde foutcorrectie per conditie
print(df.groupby('condition')['error_correction_rate'].mean())

# Gemiddelde Levenshtein-afstand per conditie
print(df.groupby('condition')['levenshtein_distance'].mean())

# Welke fouten worden het meest gemist?
from collections import Counter
missed = Counter()
for row in df['errors_uncorrected']:
    if isinstance(row, str):
        for e in row.split(','):
            missed[e.strip()] += 1
print(missed.most_common())
```

---

## Checklist voor lancering

- [ ] `YOUR_FORMSPREE_ID` vervangen in `page.tsx`
- [ ] Gedeployd op Vercel, URL genoteerd
- [ ] Getest met alle condities via URL-parameters
- [ ] Formspree ontvangt testdata
- [ ] Qualtrics-survey heeft correcte redirect-URL
- [ ] Error-tabel bewaard voor analyse (niet gedeeld met deelnemers)
- [ ] Pilottest uitgevoerd met 2–3 testdeelnemers

---

## Bestanden overzicht

```
apps/experiment/
├── app/experiment/page.tsx      ← ALLE UI + logica (1 bestand)
├── lib/experiment-content.ts   ← Lesinhoud, fouten, baseline
├── lib/metrics.ts               ← Levenshtein + foutenteller
└── package.json                 ← Dependencies (alleen Next.js + Tailwind)
```

De applicatie heeft **geen** database, **geen** authenticatie, en **geen** backend — alleen de Formspree API-call bij het indienen.
