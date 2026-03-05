// Wizard of Oz: all "AI" responses are hardcoded here.
// Update these strings to change what participants see.

export const LESDOEL_SUGGESTION =
  "De leerling kan uitleggen wat klimaatverandering is en twee oorzaken benoemen die samenhangen met menselijk handelen."

export const LESPLAN_INTRO = `
**Introductie (10 min)**
Activeer voorkennis met een korte poll: "Wat weet jij al over klimaat?" Bespreek de uitkomsten klassikaal.

**Instructie (15 min)**
Leg de broeikaswerking uit aan de hand van een visueel model. Focus op CO₂ en methaan als belangrijkste broeikasgassen.

**Verwerking (15 min)**
Leerlingen werken in tweetallen aan een opdracht: rangschik vijf menselijke activiteiten op klimaatimpact en onderbouw de keuze.

**Afronding (5 min)**
Plenaire nabespreking. Elke leerling schrijft één ding op dat ze vandaag nieuw hebben geleerd (exit ticket).
`

export const CHAT_RESPONSES: Record<string, string> = {
  default:
    "Dat is een goed punt! Op basis van de lesdetails die je hebt ingevoerd stel ik voor om de nadruk te leggen op actief leren — laat leerlingen zelf verbanden leggen in plaats van ze voor te zeggen.",
  lesdoel:
    "Ik heb het lesdoel aangepast zodat het concreet en meetbaar is. Het sluit aan bij B1-niveau en de doelgroep die je hebt opgegeven.",
  structuur:
    "De lesstructuur ziet er goed uit. Je hebt een duidelijke opbouw van introductie naar verwerking. Let op dat de overgang naar de verwerkingsopdracht soepel verloopt.",
  inhoud:
    "Tip: voeg een concreet voorbeeld uit de leefwereld van leerlingen toe aan de instructiefase. Dat vergroot de betrokkenheid en maakt de stof herkenbaar.",
}

// Step labels shown in the metro-line progress indicator
export const STEPS = [
  { id: 1, label: "Lesdetails" },
  { id: 2, label: "Lesplan" },
  { id: 3, label: "Inhoud bouwen" },
  { id: 4, label: "Voorvertoning & delen" },
]
