'use client'

import { useState, useEffect, useRef } from 'react'
import { EXPERIMENT_TEXT, BASELINE_TEXT, ERRORS, N_ERRORS, LESSON_TOPIC, LESSON_DOELGROEP, LESSON_LESDOEL, LESSON_REFERENTIENIVEAU } from '@/lib/experiment-content'
import { levenshtein, countCorrectedErrors } from '@/lib/metrics'

// ─── Types ──────────────────────────────────────────────────────────────────

type ExperimentStep = 'lesdetails' | 'lesplan' | 'lesoverzicht' | 'les' | 'voorvertoning' | 'completed'

// ─── Step Labels ─────────────────────────────────────────────────────────────

const STEP_LABELS: Record<ExperimentStep, string> = {
  lesdetails: 'Lesdetails',
  lesplan: 'Lesplan',
  lesoverzicht: 'Lesoverzicht',
  les: 'Les',
  voorvertoning: 'Voorvertoning',
  completed: 'Klaar',
}

const AUTHORING_STEPS: ExperimentStep[] = ['lesplan', 'lesoverzicht', 'les', 'voorvertoning']

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExperimentPage() {
  const [step, setStep] = useState<ExperimentStep>('lesdetails')
  const [activeAuthoringTab, setActiveAuthoringTab] = useState<ExperimentStep>('lesplan')

  // LesDetails form state (matches original app fields)
  const [doelgroepSelected, setDoelgroepSelected] = useState<string>('')
  const [onderwerp, setOnderwerp] = useState('')
  const [lesdoel, setLesdoel] = useState('')
  const [savedDetails, setSavedDetails] = useState(false)

  // The editable lesson text (starts as experiment text with errors)
  const [lesText, setLesText] = useState(EXPERIMENT_TEXT)

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Participant ID from URL param (set by Qualtrics)
  const [participantId, setParticipantId] = useState<string>('unknown')
  const [condition, setCondition] = useState<string>('baseline')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setParticipantId(params.get('pid') || 'unknown')
    setCondition(params.get('condition') || 'baseline')
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveDetails = () => {
    if (!doelgroepSelected || onderwerp.trim().split(/\s+/).length < 3 || !lesdoel.trim()) return
    setSavedDetails(true)
    setStep('lesplan')
  }

  const handleNavigateAuthoring = (tab: ExperimentStep) => {
    setStep('lesplan') // switch to authoring view
    setActiveAuthoringTab(tab)
  }

  const handleShareClick = () => {
    setShareModalOpen(true)
  }

  const handleDeelMetCollega = async () => {
    setSubmitting(true)
    setSubmitError(null)

    const { corrected, uncorrected } = countCorrectedErrors(lesText, ERRORS)
    const lev = levenshtein(lesText, BASELINE_TEXT)
    const errorCorrectionRate = corrected.length / N_ERRORS

    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          condition,
          error_correction_rate: errorCorrectionRate,
          errors_corrected: corrected.join(','),
          errors_uncorrected: uncorrected.join(','),
          levenshtein_distance: lev,
          final_text: lesText,
          submitted_at: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Submission failed')

      setShareModalOpen(false)
      setStep('completed')
    } catch (err) {
      setSubmitError('Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === 'completed') {
    return <CompletionScreen />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2D7D46] flex items-center justify-center text-white font-bold text-sm">M</div>
          <span className="font-semibold text-gray-800">MaxAssist</span>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <span className="text-sm text-gray-500">Experiment</span>
      </nav>

      {step === 'lesdetails' && (
        <LesDetailsScreen
          doelgroepSelected={doelgroepSelected}
          setDoelgroepSelected={setDoelgroepSelected}
          onderwerp={onderwerp}
          setOnderwerp={setOnderwerp}
          lesdoel={lesdoel}
          setLesdoel={setLesdoel}
          onSave={handleSaveDetails}
        />
      )}

      {step !== 'lesdetails' && (
        <AuthoringScreen
          activeTab={activeAuthoringTab}
          setActiveTab={setActiveAuthoringTab}
          lesText={lesText}
          setLesText={setLesText}
          condition={condition}
          onShareClick={handleShareClick}
          lesdoel={lesdoel || LESSON_LESDOEL}
        />
      )}

      {shareModalOpen && (
        <ShareModal
          onClose={() => setShareModalOpen(false)}
          onDeelMetCollega={handleDeelMetCollega}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  )
}

// ─── LesDetails Screen ────────────────────────────────────────────────────────

const EDUCATION_LEVELS = ['PO', 'VMBO', 'HAVO/VWO', 'MBO', 'HBO/WO', 'Anders']

function LesDetailsScreen({
  doelgroepSelected, setDoelgroepSelected,
  onderwerp, setOnderwerp,
  lesdoel, setLesdoel,
  onSave,
}: {
  doelgroepSelected: string
  setDoelgroepSelected: (v: string) => void
  onderwerp: string
  setOnderwerp: (v: string) => void
  lesdoel: string
  setLesdoel: (v: string) => void
  onSave: () => void
}) {
  const wordCount = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const isValid = !!doelgroepSelected && wordCount >= 3 && lesdoel.trim().length > 0

  const progress = [!!doelgroepSelected, wordCount >= 3, lesdoel.trim().length > 0].filter(Boolean).length

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left: form */}
      <div className="w-full lg:w-3/5 overflow-y-auto p-6 md:p-10 lg:p-14 border-r border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-[#2D7D46] mb-1">Lesdetails bewerken</h2>
        <p className="text-sm text-gray-500 mb-5">Bewerk de basisinformatie van je les</p>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-[#2D7D46] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(progress / 3) * 100}%` }}
          />
        </div>

        {/* Tabs (decorative, only Basisinformatie active) */}
        <div className="flex gap-0 border-b border-gray-200 mb-6 text-sm">
          {['Basisinformatie', 'Bronmateriaal', 'Taalinstellingen'].map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-2 font-medium transition-colors ${i === 0 ? 'text-[#2D7D46] border-b-2 border-[#2D7D46]' : 'text-gray-400 cursor-default'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Voor wie is deze les? */}
        <div className="border border-gray-200 border-l-4 border-l-[#2D7D46] rounded-lg p-6 mb-5 space-y-4">
          <label className="block text-base font-semibold text-gray-900">Voor wie is deze les?</label>
          <div className="grid grid-cols-3 gap-2">
            {EDUCATION_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDoelgroepSelected(level)}
                className={`px-3 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                  doelgroepSelected === level
                    ? 'border-[#2D7D46] bg-[#2D7D46]/10 text-[#2D7D46]'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Waar gaat de les over? */}
        <div className="border border-gray-200 border-l-4 border-l-[#2D7D46] rounded-lg p-6 mb-5 space-y-3">
          <label className="block text-base font-semibold text-gray-900">Waar gaat de les over?</label>
          <input
            type="text"
            value={onderwerp}
            onChange={(e) => setOnderwerp(e.target.value)}
            placeholder="bijv. het herkennen van stijlfiguren in poëzie"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
          />
          {onderwerp.trim().length > 0 && wordCount < 3 && (
            <p className="text-xs text-red-500">Vul minimaal 3 woorden in</p>
          )}
          {wordCount >= 3 && <p className="text-xs text-green-600">✓ Onderwerp ingevuld</p>}
        </div>

        {/* Lesdoel */}
        <div className="border border-gray-200 border-l-4 border-l-[#2D7D46] rounded-lg p-6 mb-5 space-y-3">
          <label className="block text-base font-semibold text-gray-900">Wat moeten leerlingen kunnen na de les?</label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setLesdoel(LESSON_LESDOEL)}
              className="flex-1 bg-[#2D7D46] text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-[#256638]"
            >
              Laat AI een lesdoel maken
            </button>
            <button className="flex-1 border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">
              Zelf invullen
            </button>
          </div>
          <textarea
            value={lesdoel}
            onChange={(e) => setLesdoel(e.target.value)}
            placeholder="bijv. Leerlingen kunnen de factoren die fotosynthese beïnvloeden uitleggen..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D46] min-h-[80px]"
          />
          {lesdoel.trim().length > 0 && <p className="text-xs text-green-600">✓ Lesdoel ingevuld</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-5">
          <span className="text-sm text-gray-500">
            {!doelgroepSelected ? 'Selecteer de doelgroep' : wordCount < 3 ? 'Vul het onderwerp in (minimaal 3 woorden)' : !lesdoel.trim() ? 'Vul het lesdoel in' : 'Alle basisinformatie is ingevuld'}
          </span>
          <button
            onClick={onSave}
            disabled={!isValid}
            className="bg-[#2D7D46] text-white rounded-md px-5 py-2 text-sm font-medium disabled:opacity-40 hover:bg-[#256638]"
          >
            Opslaan
          </button>
        </div>
      </div>

      {/* Right: AI assistant placeholder */}
      <div className="hidden lg:flex lg:flex-col lg:w-2/5 p-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Lesdoel</p>
          <p className="text-sm text-gray-600">{lesdoel || 'Nog geen lesdoel ingevuld.'}</p>
        </div>
        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Max AI-assistent</p>
          <div className="flex-1 flex items-end">
            <div className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 w-full">
              Hoi, ik ben Max, je AI-assistent. Vul de lesdetails in en vraag me om suggesties of hulp waar nodig.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Authoring Screen ─────────────────────────────────────────────────────────

function AuthoringScreen({
  activeTab, setActiveTab, lesText, setLesText, condition, onShareClick, lesdoel,
}: {
  activeTab: ExperimentStep
  setActiveTab: (t: ExperimentStep) => void
  lesText: string
  setLesText: (t: string) => void
  condition: string
  onShareClick: () => void
  lesdoel: string
}) {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 pt-2">
        {AUTHORING_STEPS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
              activeTab === tab
                ? 'border-[#2D7D46] text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {STEP_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'lesplan' && <LesplanTab condition={condition} />}
      {activeTab === 'lesoverzicht' && <LesoverzichtTab condition={condition} />}
      {activeTab === 'les' && (
        <LesTab lesText={lesText} setLesText={setLesText} condition={condition} lesdoel={lesdoel} />
      )}
      {activeTab === 'voorvertoning' && (
        <VoorvertoningTab lesText={lesText} onShareClick={onShareClick} condition={condition} />
      )}
    </div>
  )
}

// ─── Lesplan Tab ──────────────────────────────────────────────────────────────

function LesplanTab({ condition }: { condition: string }) {
  const phases = [
    { title: 'Introductie', duration: '5 min', topics: ['Activeer voorkennis over planten', 'Introduceer het begrip energie in biologische systemen'] },
    { title: 'Instructie', duration: '15 min', topics: ['Uitleg fotosynthese vergelijking', 'Bespreek de drie benodigde stoffen', 'Leg factoren uit die de snelheid beïnvloeden'] },
    { title: 'Verwerking', duration: '20 min', topics: ['Opdracht 1: Grafiekanalyse', 'Opdracht 2: Experiment ontwerpen'] },
    { title: 'Afronding', duration: '5 min', topics: ['Kernvraag bespreken', 'Reflectie op lesdoel'] },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Lesplan</h2>
      <NudgeBox condition={condition} tab="lesplan" />
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.title} className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{phase.title}</h3>
              <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{phase.duration}</span>
            </div>
            <ul className="space-y-1">
              {phase.topics.map((t) => (
                <li key={t} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-[#2D7D46] mt-0.5">•</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lesoverzicht Tab ─────────────────────────────────────────────────────────

function LesoverzichtTab({ condition }: { condition: string }) {
  const elements = [
    { phase: 'Introductie', type: 'Tekstblok', title: 'Inleiding fotosynthese' },
    { phase: 'Instructie', type: 'Tekstblok', title: 'Wat heb je nodig voor fotosynthese?' },
    { phase: 'Instructie', type: 'Tekstblok', title: 'Wat levert fotosynthese op?' },
    { phase: 'Instructie', type: 'Tekstblok', title: 'Factoren die fotosynthese beïnvloeden' },
    { phase: 'Verwerking', type: 'Open vraag', title: 'Opdracht 1 – Analyseer de grafiek' },
    { phase: 'Verwerking', type: 'Open vraag', title: 'Opdracht 2 – Experiment ontwerpen' },
    { phase: 'Afronding', type: 'Tekstblok', title: 'Samenvatting en kernvraag' },
  ]

  const phaseColors: Record<string, string> = {
    Introductie: 'bg-blue-100 text-blue-700',
    Instructie: 'bg-purple-100 text-purple-700',
    Verwerking: 'bg-orange-100 text-orange-700',
    Afronding: 'bg-green-100 text-green-700',
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Lesoverzicht</h2>
      <NudgeBox condition={condition} tab="lesoverzicht" />
      <div className="space-y-2">
        {elements.map((el, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-5 text-right">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{el.title}</p>
                <p className="text-xs text-gray-400">{el.type}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColors[el.phase]}`}>{el.phase}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Les Tab ──────────────────────────────────────────────────────────────────

function LesTab({
  lesText, setLesText, condition, lesdoel,
}: {
  lesText: string
  setLesText: (t: string) => void
  condition: string
  lesdoel: string
}) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 bg-white border-r border-gray-200">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Les</h2>
          <p className="text-sm text-gray-500 mb-4">Bekijk en bewerk de gegenereerde lesinhoud hieronder.</p>
          <NudgeBox condition={condition} tab="les" />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            💡 De inhoud is gegenereerd door AI. Controleer de tekst zorgvuldig en pas aan waar nodig.
          </div>
          <textarea
            value={lesText}
            onChange={(e) => setLesText(e.target.value)}
            className="w-full min-h-[600px] border border-gray-200 rounded-xl p-5 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2D7D46] resize-y"
          />
        </div>
      </div>
      <div className="hidden lg:block w-64 p-5 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Lesdoel</p>
        <p className="text-sm text-gray-600">{lesdoel}</p>
      </div>
    </div>
  )
}

// ─── Voorvertoning Tab ────────────────────────────────────────────────────────

function VoorvertoningTab({
  lesText, onShareClick, condition,
}: {
  lesText: string
  onShareClick: () => void
  condition: string
}) {
  // Simple markdown-to-html rendering for preview
  const renderMarkdown = (text: string) => {
    return text
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mt-5 mb-2">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-gray-700 mb-1">$2</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-gray-700 mb-1">$1</li>')
      .replace(/^(?!<[h|l]).+$/gm, '<p class="text-sm text-gray-700 mb-2">$&</p>')
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Voorvertoning</h2>
          <button
            onClick={onShareClick}
            className="flex items-center gap-2 bg-[#2D7D46] text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-[#256638]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Deel deze les
          </button>
        </div>
        <NudgeBox condition={condition} tab="voorvertoning" />
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(lesText) }}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onShareClick}
            className="flex items-center gap-2 bg-[#2D7D46] text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-[#256638]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Deel deze les
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Nudge Box (placeholder for experimental conditions) ─────────────────────

function NudgeBox({ condition, tab }: { condition: string; tab: string }) {
  // BASELINE: no nudge shown
  if (condition === 'baseline') return null

  // CONDITION 1: accuracy nudge on the "les" tab
  if (condition === 'nudge_accuracy' && tab === 'les') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
        <span className="text-blue-500 text-lg">🔍</span>
        <div>
          <p className="text-sm font-semibold text-blue-900">Controleer de inhoud nauwkeurig</p>
          <p className="text-sm text-blue-700">AI-gegenereerde tekst kan fouten bevatten. Lees de inhoud zorgvuldig door voordat je deelt.</p>
        </div>
      </div>
    )
  }

  // CONDITION 2: trust nudge (AI is reliable framing)
  if (condition === 'nudge_trust' && tab === 'les') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex gap-3">
        <span className="text-green-500 text-lg">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-900">Kwaliteitsgecontroleerde inhoud</p>
          <p className="text-sm text-green-700">Deze les is gegenereerd met behulp van geavanceerde AI en doorloopt een kwaliteitscheck.</p>
        </div>
      </div>
    )
  }

  // Add more condition types here for future nudge variations
  return null
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({
  onClose, onDeelMetCollega, submitting, error,
}: {
  onClose: () => void
  onDeelMetCollega: () => void
  submitting: boolean
  error: string | null
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Kies een deelmethode</h2>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-5 mt-4">
            {['Deel met doelgroep', 'Deel met collega\'s'].map((tab, i) => (
              <button
                key={tab}
                className={`flex-1 py-2 text-sm font-medium rounded-t-md transition-colors ${i === 1 ? 'bg-[#2D7D46] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Colleagues tab content */}
          <p className="text-sm text-gray-600 mb-4">
            Deel de les <b>De fotosynthese</b> met je collega's.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="E-mailadres"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D7D46]"
              disabled
            />
            <button className="bg-gray-200 text-gray-500 rounded-md px-4 py-2 text-sm cursor-default">
              Toevoegen
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-6">Voeg collega's toe om deze les met hen te delen.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={onDeelMetCollega}
              disabled={submitting}
              className="bg-[#2D7D46] text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-[#256638] disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Delen met collega's
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-[#2D7D46]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#2D7D46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Bedankt voor je deelname!</h1>
        <p className="text-gray-600 mb-6">
          Je hebt de les succesvol gedeeld. Ga nu terug naar Qualtrics om de vragenlijst af te ronden.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">📋 Volgende stap</p>
          <p className="text-sm text-amber-700">
            Keer terug naar het Qualtrics-tabblad in je browser om de evaluatie in te vullen.
          </p>
        </div>
      </div>
    </div>
  )
}
