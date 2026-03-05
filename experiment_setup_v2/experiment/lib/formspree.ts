// Replace FORMSPREE_FORM_ID with your actual Formspree form ID
// e.g. "xpwzabcd"  →  https://formspree.io/f/xpwzabcd

const FORMSPREE_FORM_ID = "YOUR_FORM_ID_HERE"
const FORMSPREE_URL = `https://formspree.io/f/${FORMSPREE_FORM_ID}`

export interface ExperimentData {
  participant_id: string
  timestamp: string
  event: string
  // lesson setup fields
  onderwerp?: string
  doelgroep?: string
  referentieNiveau?: string
  lesdoel?: string
  lesduur?: number
  // lock event
  locked?: boolean
  // chat interaction
  chat_message?: string
  // step tracking
  step?: number
}

export async function submitToFormspree(data: ExperimentData): Promise<boolean> {
  try {
    const response = await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    })
    return response.ok
  } catch {
    console.error("Formspree submission failed")
    return false
  }
}
