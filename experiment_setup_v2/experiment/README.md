# MaxAssist Wizard of Oz Experiment — Setup Guide

## Overview

This is a standalone Next.js application that recreates the MaxAssist lesson
generator as a **Wizard of Oz** experiment for measuring **automation bias**.
There is no AI backend. Lesson content is pre-generated and displayed to
participants, who can edit it before "sharing" it with a colleague. On sharing,
the experiment ends and data is submitted to **Formspree**.

### What is measured

| Metric | How | Where computed |
|---|---|---|
| **Error correction rate** | 4 intentional errors in the content; how many did the participant fix? | `lib/experiment.ts → detectErrorCorrections()` |
| **Levenshtein distance** | Edit distance between the baseline content and the participant's final version — proxy for active engagement | `lib/experiment.ts → levenshteinDistance()` |
| **Time in authoring env** | Milliseconds spent in the authoring tabs | `app/page.tsx → authoringStartTime` |
| **Final text** | Raw saved text for manual inspection | Submitted to Formspree |

### The 4 intentional errors

| # | Location | Error | Correct version |
|---|---|---|---|
| 1 | Lesplan | `"Aktief luisterren"` (spelling) | `"Actief luisteren"` |
| 2 | Lesoverzicht | Verwerking listed before Instructie (wrong phase order) | Introductie → Instructie → Verwerking → Afronding |
| 3 | Les body | `"non-verbale communicatie slechts 10%"` (factual error) | 55–93% |
| 4 | Les body | `"de cliënt voelt zich begrepen voelen"` (grammar error) | `"de cliënt zich begrepen voelt"` |

---

## Step-by-step deployment guide

### Step 1 — Set up Formspree

1. Go to [formspree.io](https://formspree.io) and create a free account.
2. Create a **New Form**. Name it `MaxAssist Experiment`.
3. Copy your form endpoint URL. It looks like:
   `https://formspree.io/f/xabc1234`
4. Open `lib/experiment.ts` and replace:
   ```ts
   FORMSPREE_ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID',
   ```
   with your actual endpoint.
5. Set your Qualtrics survey URL:
   ```ts
   QUALTRICS_URL: 'https://your-qualtrics-survey-url.com',
   ```

**Formspree free tier** allows 50 submissions/month. For larger samples,
upgrade or use the project plan.

---

### Step 2 — Push to GitHub

1. Create a new **private** repository on GitHub.
2. In the `maxassist-experiment/` folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial experiment setup"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

---

### Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New → Project**.
3. Import your GitHub repository.
4. Vercel auto-detects Next.js. Leave all settings at defaults.
5. Click **Deploy**.
6. Once deployed, your experiment URL will be:
   `https://your-project-name.vercel.app`

No environment variables are needed — all config lives in `lib/experiment.ts`.

---

### Step 4 — Test your deployment

1. Visit: `https://your-project-name.vercel.app?condition=baseline&pid=test001`
2. Walk through the full flow:
   - Fill in lesdetails → click Opslaan
   - Review each authoring tab (Lesplan, Lesoverzicht, Les, Voorvertoning)
   - Click "Deel deze les" → "Deel met collega"
3. Verify data appears in your Formspree dashboard.

---

### Step 5 — Set up experiment conditions

The app supports three conditions out of the box:

| Condition | URL parameter | What participants see |
|---|---|---|
| `baseline` | `?condition=baseline` | No nudges — plain AI output |
| `nudge_transparency` | `?condition=nudge_transparency` | Blue "AI-gegenereerd — controleer de inhoud" badge on each tab + confidence indicator |
| `nudge_warning` | `?condition=nudge_warning` | Yellow warning banner at the top: "⚠️ AI kan fouten maken…" + AI badge |

**In Qualtrics:** Use an embedded data field to randomly assign conditions and
pass them via URL to the experiment. In your Qualtrics survey flow:

1. Add a **Randomizer** block at the start.
2. Set embedded data: `condition = baseline` (or `nudge_transparency`,
   `nudge_warning`) in each branch.
3. Use a **Web Service** or redirect the participant to:
   `https://your-project.vercel.app?condition=${e://Field/condition}&pid=${e://Field/ResponseID}`
4. After the experiment, redirect back to Qualtrics for the evaluation survey.

---

### Step 6 — Add or modify nudge conditions

Open `lib/experiment.ts` and find `NUDGE_CONFIGS`. Each condition is a plain
object:

```ts
nudge_warning: {
  showAccuracyBadge: true,      // Show badge on each tab header
  showWarningBanner: true,      // Show yellow banner at top of authoring env
  warningText: '⚠️ AI kan fouten maken...',
  accuracyBadgeText: 'AI-gegenereerd',
  showConfidenceIndicator: false,
  confidenceLevel: 'high',
}
```

To add a **new condition** (e.g. `nudge_social_proof`):

1. Add the condition name to the `ExperimentCondition` type:
   ```ts
   export type ExperimentCondition = 'baseline' | 'nudge_transparency' | 'nudge_warning' | 'nudge_social_proof'
   ```
2. Add its config to `NUDGE_CONFIGS`:
   ```ts
   nudge_social_proof: {
     showAccuracyBadge: true,
     showWarningBanner: true,
     warningText: '💡 94% van docenten past AI-inhoud aan voor gebruik.',
     accuracyBadgeText: 'AI-gegenereerd',
     showConfidenceIndicator: false,
     confidenceLevel: 'high',
   }
   ```
3. Redeploy (Vercel auto-deploys on git push).

---

### Step 7 — Change the lesson content or errors

All lesson content and error definitions live in `lib/experiment.ts`:

- **`BASELINE_LESPLAN`** — the pre-filled lesplan with error 1 (spelling)
- **`BASELINE_LESOVERZICHT`** — the phase structure with error 2 (wrong order)
- **`BASELINE_LES`** — the lesson body with errors 3 & 4
- **`CORRECT_LESPLAN`** / **`CORRECT_LES`** — the correct versions (used for Levenshtein)
- **`detectErrorCorrections()`** — update the regex conditions here when you change errors

---

### Step 8 — Accessing your data in Formspree

1. Log into Formspree → your form → **Submissions**.
2. You can **export as CSV**.
3. Each row contains:
   - `participant_id`, `condition`, `timestamp`
   - `time_in_authoring_ms`
   - `levenshtein_lesplan`, `levenshtein_les`, `levenshtein_total`
   - `error_1_fixed_spelling` … `error_4_fixed_grammar` (true/false)
   - `total_errors_fixed`, `error_correction_rate` (0–1)
   - `final_lesplan`, `final_les`, `final_outline_order` (for manual inspection)

---

## Project file structure

```
maxassist-experiment/
├── app/
│   ├── globals.css          # Tailwind + brand tokens
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # ← Main experiment UI (all screens)
├── lib/
│   └── experiment.ts        # ← All config: content, errors, conditions, Levenshtein
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

**Key principle:** Keep all experiment logic in `lib/experiment.ts`.
The UI in `page.tsx` simply reads from it.

---

## Troubleshooting

**Formspree not receiving submissions?**
- Check the endpoint URL in `lib/experiment.ts`
- Check Formspree's spam filter (first submissions require email confirmation)
- Use browser devtools → Network tab to confirm the POST is being sent

**Vercel build failing?**
- Run `npm install && npm run build` locally first to catch errors

**Condition not applying?**
- Check the URL: `?condition=nudge_warning` (exact lowercase string)
- Verify the condition name exists in `NUDGE_CONFIGS` in `lib/experiment.ts`
