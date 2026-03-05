'use client'

import { useState, useEffect } from 'react'
import {
  EXPERIMENT_TEXT, BASELINE_TEXT, ERRORS, N_ERRORS, LESSON_LESDOEL
} from '@/lib/experiment-content'
import { levenshtein, countCorrectedErrors } from '@/lib/metrics'

// ─── Color Palette (MaxAssist tailwind.config.ts) ─────────────────────────────
// maxPrimary: #F71E63   ← hot pink (buttons border/text)
// maxOrange:  #F9703D   ← orange
// maxGreen:   #039B96   ← teal (brand color, active states, lesdoel)
// lightGrey:  #FAFBFD   ← page background
// button "primary" variant = gradient from #E13AA1 → #FF6633, rounded-full
// button "default" variant = rounded-full, border-2 border-maxPrimary, text-maxPrimary

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthoringTab = 'lesplan' | 'lesoverzicht' | 'les' | 'voorvertoning'
type AppStep = 'details' | 'authoring' | 'completed'

const EDUCATION_LEVELS = [
  { id: 'po', label: 'PO' },
  { id: 'vmbo', label: 'VMBO' },
  { id: 'havo_vwo', label: 'HAVO/VWO' },
  { id: 'mbo', label: 'MBO' },
  { id: 'hbo_wo', label: 'HBO/WO' },
  { id: 'anders', label: 'Anders' },
]

const SUB_LEVELS: Record<string, string[]> = {
  vmbo: ['BB', 'KB', 'GL', 'TL'],
  havo_vwo: ['HAVO', 'VWO', 'Gymnasium'],
  mbo: ['MBO-1', 'MBO-2', 'MBO-3', 'MBO-4'],
  hbo_wo: ['HBO', 'WO-Bachelor', 'WO-Master'],
}

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Pill button matching MaxAssist button variants exactly */
function Btn({
  children, onClick, disabled = false,
  variant = 'default', className = '', type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost'
  className?: string; type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2'
  const v: Record<string, string> = {
    primary:   'bg-gradient-to-r from-[#E13AA1] hover:from-[#e13aa1c4] to-[#F63] hover:to-[#ff6633ce] text-white',
    default:   'border-2 border-[#F71E63] text-[#F71E63] bg-white hover:border-[#E13AA1] disabled:border-0 disabled:bg-slate-200 disabled:text-slate-600',
    secondary: 'bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]',
    outline:   'border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] hover:text-[#18181b]',
    ghost:     'hover:bg-[#f4f4f5] hover:text-[#18181b]',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} ${className}`}>
      {children}
    </button>
  )
}

/** Green teal lesdoel card */
function LesdoelCard({ lesdoel }: { lesdoel: string }) {
  return (
    <div className="rounded-lg bg-[#039B96] p-3 text-white text-sm w-full max-h-32 overflow-y-auto cursor-pointer hover:bg-[#038a86] transition-colors">
      <div className="flex items-center justify-between pb-2">
        <p className="font-bold">Lesdoel</p>
      </div>
      <p>{lesdoel || <span className="italic opacity-75">Geen lesdoel ingesteld</span>}</p>
    </div>
  )
}

/** Metro progress line matching original exactly */
function MetroLine({ step }: { step: number }) {
  const items = [
    { id: 1, label: 'Lesplan' },
    { id: 2, label: 'Lesoverzicht' },
    { id: 3, label: 'Les' },
    { id: 4, label: 'Voorvertoning' },
  ]
  return (
    <div id="metro-line" className="mt-6 md:mt-0">
      <div className="relative p-5">
        <div className="ml-8 mr-10 absolute top-0 left-0 right-0 h-[6px] bg-[#FAFBFD] z-0" />
        <ul className="flex justify-between list-none p-0 m-0">
          {items.map(({ id, label }) => {
            const active = id === step, completed = id < step
            return (
              <li key={id} className="relative flex flex-col items-center">
                <span className={[
                  'absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 border-8 rounded-full flex items-center justify-center',
                  completed ? 'border-[#039B96] bg-[#039B96]'
                  : active ? 'border-[#F9703D] bg-white'
                  : 'border-slate-100 bg-slate-300'
                ].join(' ')}>
                  {completed && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span className={`mt-2 text-xs ${active ? 'font-bold' : 'text-gray-400'}`}>{label}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <hr className="mt-3 mb-7 border-gray-200" />
    </div>
  )
}

/** Toggle switch matching original */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-[#039B96]' : 'bg-gray-200'}`}>
      <span className={`block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

/** Max chatbox right panel */
function ChatPanel({ lesdoel }: { lesdoel: string }) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-2/5 lg:min-w-0 lg:gap-4">
      <div className="shrink-0"><LesdoelCard lesdoel={lesdoel} /></div>
      <div className="flex-1 min-h-0 border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
          <span className="text-sm font-medium">Max</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4" id="scroller">
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] shrink-0 flex items-center justify-center text-white text-[10px] font-bold">M</div>
            <div className="bg-[#FAFBFD] rounded-xl rounded-bl-none px-4 py-3 text-sm text-gray-700 max-w-[85%]">
              Hoi, ik ben Max! Ik heb de lesinhoud voor je gegenereerd. Controleer de inhoud en pas aan waar nodig.
            </div>
          </div>
          <div id="anchor" className="h-px overflow-anchor-auto" />
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2 items-center">
          <input readOnly placeholder="Stel Max een vraag..."
            className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-2 bg-[#FAFBFD] focus:outline-none" />
          <button className="w-9 h-9 rounded-full bg-[#FAFBFD] border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function ExperimentPage() {
  const [appStep, setAppStep]             = useState<AppStep>('details')
  const [activeTab, setActiveTab]         = useState<AuthoringTab>('lesplan')
  const [detailsComplete, setDetailsComplete] = useState(false)

  // LesDetails
  const [educatieNiveau, setEducatieNiveau]         = useState('')
  const [educatieSubNiveau, setEducatieSubNiveau]   = useState('')
  const [onderwerp, setOnderwerp]                   = useState('')
  const [lesdoel, setLesdoel]                       = useState('')
  const [referentieNiveau, setReferentieNiveau]     = useState('B1')
  const [kwalificatieEnabled, setKwalificatieEnabled] = useState(false)
  const [taxonomieEnabled, setTaxonomieEnabled]       = useState(false)
  const [selectedTaxonomie, setSelectedTaxonomie]   = useState('')
  const [selectedTaxNiveau, setSelectedTaxNiveau]   = useState('')

  // Lesplan
  const [lesduur, setLesduur]           = useState<number | undefined>()
  const VERWERKING_OPDRACHT             = 'Schrijf een samenvatting van de les in maximaal 150 woorden.'

  // Lesoverzicht
  type Phase = 'introductie' | 'instructie' | 'verwerking' | 'afronding'
  const [lessonOutline, setLessonOutline] = useState<Record<Phase, { active: boolean; topics: { id: string; title: string }[] }>>({
    introductie: { active: true, topics: [{ id: '1', title: 'Activeer voorkennis over planten' }, { id: '2', title: 'Introduceer energie in biologische systemen' }] },
    instructie:  { active: true, topics: [{ id: '3', title: 'Uitleg fotosynthese vergelijking' }, { id: '4', title: 'Benodigde stoffen voor fotosynthese' }, { id: '5', title: 'Factoren die snelheid beïnvloeden' }] },
    verwerking:  { active: true, topics: [{ id: '6', title: 'Grafiek analyseren' }, { id: '7', title: 'Experiment ontwerpen' }] },
    afronding:   { active: true, topics: [{ id: '8', title: 'Kernvraag bespreken' }, { id: '9', title: 'Reflectie op lesdoel' }] },
  })

  // Les text (editable)
  const [lesText, setLesText] = useState(EXPERIMENT_TEXT)

  // Share modal
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareTab, setShareTab]             = useState<'students' | 'colleagues'>('students')
  const [submitting, setSubmitting]         = useState(false)
  const [submitError, setSubmitError]       = useState<string | null>(null)
  const [participantId, setParticipantId]   = useState('unknown')
  const [condition, setCondition]           = useState('baseline')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setParticipantId(p.get('pid') || 'unknown')
    setCondition(p.get('condition') || 'baseline')
  }, [])

  const wordCount    = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const isDetailsValid = !!educatieNiveau && wordCount >= 3 && lesdoel.trim().length > 0

  const handleSaveDetails = () => {
    if (!isDetailsValid) return
    setDetailsComplete(true)
    setAppStep('authoring')
  }

  const handleDeelMetCollega = async () => {
    setSubmitting(true)
    setSubmitError(null)
    const { corrected, uncorrected } = countCorrectedErrors(lesText, ERRORS)
    const lev = levenshtein(lesText, BASELINE_TEXT)
    try {
      const res = await fetch('https://formspree.io/f/mqedwepd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          condition,
          error_correction_rate: corrected.length / N_ERRORS,
          errors_corrected: corrected.join(','),
          errors_uncorrected: uncorrected.join(','),
          levenshtein_distance: lev,
          final_text: lesText,
          submitted_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('failed')
      setShareModalOpen(false)
      setAppStep('completed')
    } catch {
      setSubmitError('Er is iets misgegaan bij het opslaan. Probeer het opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  if (appStep === 'completed') return <CompletionScreen />

  const activeLesdoel = lesdoel || LESSON_LESDOEL

  return (
    <div className="min-h-screen bg-[#FAFBFD]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex h-screen overflow-hidden">

        {/* Left sidebar — md:w-36 */}
        <aside className="hidden md:flex flex-col w-36 bg-white border-r border-gray-100 pt-4 pb-6 items-center shrink-0">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white font-bold text-sm">M</div>
          </div>
          <nav className="flex flex-col gap-1 w-full px-2">
            {[
              { label: 'Lesdetails', step: 'details' as AppStep },
              { label: 'Auteursomgeving', step: 'authoring' as AppStep },
            ].map(({ label, step }) => (
              <button key={step}
                onClick={() => { if (step === 'authoring' && !detailsComplete) return; setAppStep(step) }}
                disabled={step === 'authoring' && !detailsComplete}
                className={`text-xs px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  appStep === step ? 'bg-[#039B96]/10 text-[#039B96] font-semibold' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Authoring tab bar */}
          {appStep === 'authoring' && (
            <div className="bg-white border-b border-gray-200 px-5 flex gap-1 pt-2 shrink-0">
              {(['lesplan', 'lesoverzicht', 'les', 'voorvertoning'] as AuthoringTab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-[#039B96] text-gray-900 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {appStep === 'details' && (
              <LesDetailsTab
                educatieNiveau={educatieNiveau} setEducatieNiveau={setEducatieNiveau}
                educatieSubNiveau={educatieSubNiveau} setEducatieSubNiveau={setEducatieSubNiveau}
                onderwerp={onderwerp} setOnderwerp={setOnderwerp}
                lesdoel={lesdoel} setLesdoel={setLesdoel}
                referentieNiveau={referentieNiveau} setReferentieNiveau={setReferentieNiveau}
                kwalificatieEnabled={kwalificatieEnabled} setKwalificatieEnabled={setKwalificatieEnabled}
                taxonomieEnabled={taxonomieEnabled} setTaxonomieEnabled={setTaxonomieEnabled}
                selectedTaxonomie={selectedTaxonomie} setSelectedTaxonomie={setSelectedTaxonomie}
                selectedTaxNiveau={selectedTaxNiveau} setSelectedTaxNiveau={setSelectedTaxNiveau}
                isValid={isDetailsValid} onSave={handleSaveDetails}
              />
            )}
            {appStep === 'authoring' && activeTab === 'lesplan' && (
              <LesplanTab lesduur={lesduur} setLesduur={setLesduur}
                verwerkingOpdracht={VERWERKING_OPDRACHT}
                lesdoel={activeLesdoel} condition={condition}
                onNext={() => setActiveTab('lesoverzicht')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'lesoverzicht' && (
              <LesoverzichtTab lessonOutline={lessonOutline} setLessonOutline={setLessonOutline}
                lesdoel={activeLesdoel} condition={condition}
                onPrev={() => setActiveTab('lesplan')}
                onNext={() => setActiveTab('les')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'les' && (
              <LesTab lesText={lesText} setLesText={setLesText}
                lesdoel={activeLesdoel} condition={condition}
                onPrev={() => setActiveTab('lesoverzicht')}
                onNext={() => setActiveTab('voorvertoning')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'voorvertoning' && (
              <VoorvertoningTab lesText={lesText} lesdoel={activeLesdoel}
                condition={condition}
                onPrev={() => setActiveTab('les')}
                onShare={() => { setShareTab('students'); setShareModalOpen(true) }}
              />
            )}
          </div>
        </main>
      </div>

      {shareModalOpen && (
        <ShareModal tab={shareTab} setTab={setShareTab}
          onClose={() => setShareModalOpen(false)}
          onDeelMetCollega={handleDeelMetCollega}
          submitting={submitting} error={submitError}
        />
      )}
    </div>
  )
}

// ─── LesDetails Tab ───────────────────────────────────────────────────────────
const TAXONOMIES = [
  { label: "Bloom's Taxonomie", levels: ['Kennis', 'Begrip', 'Toepassing', 'Analyse', 'Synthese', 'Evaluatie'] },
  { label: 'Anderson & Krathwohl', levels: ['Onthouden', 'Begrijpen', 'Toepassen', 'Analyseren', 'Evalueren', 'Creëren'] },
]

function LesDetailsTab({ educatieNiveau, setEducatieNiveau, educatieSubNiveau, setEducatieSubNiveau,
  onderwerp, setOnderwerp, lesdoel, setLesdoel, referentieNiveau, setReferentieNiveau,
  kwalificatieEnabled, setKwalificatieEnabled, taxonomieEnabled, setTaxonomieEnabled,
  selectedTaxonomie, setSelectedTaxonomie, selectedTaxNiveau, setSelectedTaxNiveau,
  isValid, onSave }: any) {
  const [activeTab, setActiveTab] = useState<'basis' | 'materiaal' | 'taal'>('basis')
  const [showLesdoelInput, setShowLesdoelInput] = useState(!!lesdoel)
  const wordCount = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const progress = [!!educatieNiveau, wordCount >= 3, lesdoel.trim().length > 0].filter(Boolean).length
  const subLevels = SUB_LEVELS[educatieNiveau] || []

  const completionText = !educatieNiveau ? 'Selecteer de doelgroep'
    : wordCount < 3 ? 'Vul het onderwerp in (minimaal 3 woorden)'
    : !lesdoel.trim() ? 'Vul het lesdoel in'
    : 'Alle basisinformatie is ingevuld'

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#039B96] mb-1">Lesdetails bewerken</h2>
          <p className="text-sm text-gray-500">Bewerk de basisinformatie van je les</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div className="bg-[#039B96] h-1.5 rounded-full transition-all duration-300" style={{ width: `${(progress / 3) * 100}%` }} />
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {(['basis', 'materiaal', 'taal'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab ? 'text-[#039B96] border-b-2 border-[#039B96]' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {tab === 'basis' ? 'Basisinformatie' : tab === 'materiaal' ? 'Bronmateriaal' : 'Taalinstellingen'}
            </button>
          ))}
        </div>

        {activeTab === 'basis' && (
          <div className="space-y-6">
            {/* Voor wie */}
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-4">
              <label className="block text-base font-semibold text-gray-900">Voor wie is deze les?</label>
              <div className="grid grid-cols-5 gap-2">
                {EDUCATION_LEVELS.map(({ id, label }) => (
                  <button key={id} type="button"
                    onClick={() => { setEducatieNiveau(id); setEducatieSubNiveau('') }}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                      educatieNiveau === id
                        ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}>{label}</button>
                ))}
              </div>

              {/* Feedback: choose sub-level */}
              {educatieNiveau && educatieNiveau !== 'anders' && subLevels.length > 0 && !educatieSubNiveau && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <span className="text-sm text-blue-800">Kies nu het specifieke niveau</span>
                </div>
              )}

              {/* Sub-levels */}
              {subLevels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specifiek niveau</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subLevels.map((sub: string) => (
                      <button key={sub} type="button" onClick={() => setEducatieSubNiveau(sub)}
                        className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                          educatieSubNiveau === sub
                            ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}

              {educatieNiveau === 'anders' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specificeer doelgroep</label>
                  <input type="text" placeholder="bijv. Volwassenenonderwijs, Bedrijfstraining..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                </div>
              )}
            </div>

            {/* Onderwerp */}
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-3">
              <label className="block text-base font-semibold text-gray-900">Waar gaat de les over?</label>
              <input type="text" value={onderwerp} onChange={(e) => setOnderwerp(e.target.value)}
                placeholder="bijv. het herkennen van stijlfiguren in poëzie, snelheid, afstand en tijd berekenen"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
              {onderwerp.trim().length > 0 && wordCount < 3 && (
                <div className="flex items-center gap-2 text-sm text-red-600"><span>Vul minimaal 3 woorden in</span></div>
              )}
              {wordCount >= 3 && (
                <div className="flex items-center gap-2 text-sm text-green-600"><span>✓</span><span>Onderwerp ingevuld</span></div>
              )}
            </div>

            {/* Kwalificatie-eisen */}
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-base font-semibold text-gray-900">Kwalificatie-eisen</label>
                  <p className="text-sm text-gray-500 mt-1">Officiële eindtermen of exameneisen uit syllabi, examenprogramma's of andere kwalificatiedocumenten.</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">{kwalificatieEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                  <Toggle checked={kwalificatieEnabled} onChange={setKwalificatieEnabled} />
                </div>
              </div>
              {kwalificatieEnabled && (
                <Btn variant="default" className="w-full" onClick={() => {}}>+ Kwalificatie-eis toevoegen</Btn>
              )}
              {kwalificatieEnabled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">Nog geen kwalificatie-eisen toegevoegd. Gebruik de knop hierboven om de eerste toe te voegen.</p>
                </div>
              )}
            </div>

            {/* Leertaxonomie */}
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-base font-semibold text-gray-900">Leertaxonomie</label>
                  <p className="text-sm text-gray-500 mt-1">Welke leertaxonomie en welk niveau wil je gebruiken als ontwerpkader?</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">{taxonomieEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                  <Toggle checked={taxonomieEnabled} onChange={setTaxonomieEnabled} />
                </div>
              </div>
              {taxonomieEnabled && (
                <div className="space-y-4">
                  {TAXONOMIES.map((tax) => (
                    <div key={tax.label}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{tax.label}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {tax.levels.map((lvl) => (
                          <button key={lvl} type="button"
                            onClick={() => { setSelectedTaxonomie(tax.label); setSelectedTaxNiveau(lvl) }}
                            className={`flex flex-col items-start px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                              selectedTaxNiveau === lvl && selectedTaxonomie === tax.label
                                ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                            }`}>{lvl}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lesdoel */}
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-4">
              <label className="block text-base font-semibold text-gray-900">Wat moeten leerlingen kunnen na de les?</label>
              <div className="flex gap-3">
                <Btn variant="primary" className="flex-1"
                  onClick={() => { setLesdoel(LESSON_LESDOEL); setShowLesdoelInput(true) }}>
                  Laat AI een lesdoel maken
                </Btn>
                <Btn variant="secondary" className="flex-1" onClick={() => setShowLesdoelInput(true)}>
                  Zelf invullen
                </Btn>
              </div>
              {(showLesdoelInput || lesdoel) && (
                <div className="space-y-2">
                  <textarea value={lesdoel} onChange={(e) => setLesdoel(e.target.value.slice(0, 1000))}
                    placeholder="bijv. Leerlingen kunnen de factoren die fotosynthese beïnvloeden uitleggen..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] min-h-[80px]" />
                  {lesdoel.trim().length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600"><span>✓</span><span>Lesdoel ingevuld</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'materiaal' && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-900">Feitenkader</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">Feitenkader is onderdeel van Bronmateriaal. Voeg een feitenkader toe; Max toetst erop dat gegenereerd lesmateriaal niet conflicteert met de inhoud die hier staat.</p>
            </div>
            <Btn variant="default" className="w-full" onClick={() => {}}>+ Feitenkader toevoegen</Btn>
          </div>
        )}

        {activeTab === 'taal' && (
          <div className="space-y-6">
            <div className="border-t border-r border-b border-gray-200 border-l-4 border-l-[#039B96] rounded-lg p-6 space-y-3">
              <label className="block text-base font-semibold text-gray-900">Op welk taalniveau?</label>
              <div className="grid grid-cols-4 gap-2">
                {['1F', '2F', '3F', '4F'].map((n) => (
                  <button key={n} type="button" onClick={() => setReferentieNiveau(n)}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                      referentieNiveau === n ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((n) => (
                  <button key={n} type="button" onClick={() => setReferentieNiveau(n)}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                      referentieNiveau === n ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}>{n}</button>
                ))}
              </div>
              {referentieNiveau && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <span className="text-sm text-blue-800">Taalniveau {referentieNiveau} geselecteerd</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between w-full border-t border-gray-200 pt-4 mt-6">
          <div className="text-sm text-gray-600">{completionText}</div>
          <Btn variant="default" onClick={onSave} disabled={!isValid}>Opslaan</Btn>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-2/5 p-6 gap-4 bg-white overflow-y-auto">
        <div className="shrink-0"><LesdoelCard lesdoel={lesdoel} /></div>
        <div className="flex-1 border border-gray-200 rounded-lg bg-white flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
            <span className="text-sm font-medium">Max</span>
          </div>
          <div className="p-4 flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] shrink-0 flex items-center justify-center text-white text-[10px] font-bold">M</div>
            <div className="bg-[#FAFBFD] rounded-xl rounded-bl-none px-4 py-3 text-sm text-gray-700">
              Hoi, ik ben Max, je AI-assistent. Vul de lesdetails in en vraag me om suggesties of hulp waar nodig.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lesplan Tab ──────────────────────────────────────────────────────────────
function LesplanTab({ lesduur, setLesduur, verwerkingOpdracht, lesdoel, condition, onNext }: any) {
  const canNext = lesduur !== undefined && lesduur >= 10 && lesduur <= 300
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={1} />
        <NudgeBox condition={condition} tab="lesplan" />
        <div className="space-y-6">
          {/* Verwerkingsopdracht */}
          <div className="border border-gray-200 p-6 rounded-lg relative">
            <div className="mb-4">
              <p className="font-bold text-base">Verwerkingsopdracht</p>
              <p className="text-sm text-gray-500">Kies een opdracht voor deze fase</p>
            </div>
            <div className="border-2 border-[#039B96] bg-[#039B96]/5 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#039B96] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#039B96]" />
              </div>
              <p className="text-sm text-gray-700">{verwerkingOpdracht}</p>
            </div>
          </div>

          {/* Lesduur */}
          <div className="border border-gray-200 p-6 rounded-lg relative">
            <p className="font-bold text-base mb-1">Lesduur</p>
            <p className="text-sm text-gray-500 mb-3">Hoe lang duurt de les? (in minuten)</p>
            <input type="number" value={lesduur ?? ''} min={10} max={300}
              onChange={(e) => { const v = e.target.value; if (v === '') { setLesduur(undefined); return }; const n = parseInt(v, 10); if (!isNaN(n)) setLesduur(n) }}
              placeholder="bijv. 45"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
            {lesduur !== undefined && (lesduur < 10 || lesduur > 300) && (
              <p className="text-xs text-red-500 mt-1">Lesduur moet tussen 10 en 300 minuten zijn</p>
            )}
          </div>
        </div>

        <div className="h-16 w-full relative mt-8">
          <Btn variant="default" onClick={onNext} disabled={!canNext} className="float-right">
            Volgende <ChevronRight />
          </Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} />
    </div>
  )
}

// ─── Lesoverzicht Tab ─────────────────────────────────────────────────────────
type OutlinePhase = 'introductie' | 'instructie' | 'verwerking' | 'afronding'
const PHASE_TITLES: Record<OutlinePhase, string> = { introductie: 'Introductie', instructie: 'Instructie', verwerking: 'Verwerking', afronding: 'Afronding' }
const PHASE_DESCS:  Record<OutlinePhase, string> = {
  introductie: 'Activeer voorkennis en wek interesse',
  instructie:  'Leg nieuwe kennis en concepten uit',
  verwerking:  'Oefen met de nieuwe kennis',
  afronding:   'Reflecteer en evalueer',
}

function LesoverzichtTab({ lessonOutline, setLessonOutline, lesdoel, condition, onPrev, onNext }: any) {
  const toggle = (phase: OutlinePhase) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], active: !p[phase].active } }))
  const updateTopic = (phase: OutlinePhase, id: string, title: string) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], topics: p[phase].topics.map((t: any) => t.id === id ? { ...t, title } : t) } }))
  const deleteTopic = (phase: OutlinePhase, id: string) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], topics: p[phase].topics.filter((t: any) => t.id !== id) } }))
  const addTopic = (phase: OutlinePhase) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], topics: [...p[phase].topics, { id: Date.now().toString(), title: 'Nieuw onderwerp' }] } }))
  const moveTopic = (phase: OutlinePhase, idx: number, dir: 'up' | 'down') =>
    setLessonOutline((p: any) => {
      const topics = [...p[phase].topics]; const j = dir === 'up' ? idx - 1 : idx + 1
      if (j < 0 || j >= topics.length) return p;
      [topics[idx], topics[j]] = [topics[j], topics[idx]]
      return { ...p, [phase]: { ...p[phase], topics } }
    })

  const hasActive = (Object.keys(PHASE_TITLES) as OutlinePhase[]).some((k) => lessonOutline[k].active)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={2} />
        <h1 className="text-3xl mb-1">Lesoverzicht</h1>
        <div className="text-sm text-gray-500 mb-6">
          <div className="font-bold">Structureer je les</div>
          <p>Bepaal de opbouw van je les door de onderwerpen per fase te ordenen. Gebruik de knoppen om onderwerpen toe te voegen, te verwijderen of te verplaatsen.</p>
        </div>
        <NudgeBox condition={condition} tab="lesoverzicht" />

        <div className="space-y-6">
          {(Object.keys(PHASE_TITLES) as OutlinePhase[]).map((phase) => {
            const { active, topics } = lessonOutline[phase]
            return (
              <div key={phase} className={`rounded-lg border-2 ${active ? 'border-gray-900' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className="p-6">
                  <div className="block md:flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-semibold leading-none tracking-tight ${!active ? 'text-gray-400' : ''}`}>{PHASE_TITLES[phase]}</h3>
                      <p className="text-sm text-gray-500 mt-1.5 mb-2 md:mb-0">{PHASE_DESCS[phase]}</p>
                    </div>
                    <div className="flex rounded-md bg-gray-100 p-0.5 shrink-0">
                      <button onClick={() => !active && toggle(phase)}
                        className={`rounded px-3 py-1.5 text-sm transition-colors ${active ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
                        Gebruiken
                      </button>
                      <button onClick={() => active && toggle(phase)}
                        className={`rounded px-3 py-1.5 text-sm transition-colors ${!active ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
                        Niet gebruiken
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  {active ? (
                    <div className="space-y-3">
                      {topics.map((topic: any, idx: number) => (
                        <div key={topic.id} className="rounded-lg border bg-white p-4">
                          <div className="flex items-center gap-2">
                            <input defaultValue={topic.title}
                              onBlur={(e) => updateTopic(phase, topic.id, e.target.value)}
                              className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                            <button onClick={() => moveTopic(phase, idx, 'up')} disabled={idx === 0}
                              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => moveTopic(phase, idx, 'down')} disabled={idx === topics.length - 1}
                              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button onClick={() => deleteTopic(phase, topic.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addTopic(phase)}
                        className="w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1 bg-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Onderwerp toevoegen
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Deze fase wordt niet gebruikt in de les</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="h-16 w-full relative mt-8">
          <Btn variant="outline" onClick={onPrev} className="float-left"><ChevronLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext} disabled={!hasActive} className="float-right">Volgende <ChevronRight /></Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} />
    </div>
  )
}

// ─── Les Tab ──────────────────────────────────────────────────────────────────
function LessonElementBlock({ content, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  content: string; onUpdate: (v: string) => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(content)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#FAFBFD] border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tekstblok</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst} title="Omhoog"
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast} title="Omlaag"
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button onClick={() => setCollapsed(!collapsed)} title="Inklappen"
            className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
            <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onDelete} title="Verwijderen"
            className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      {!collapsed && (
        editing ? (
          <textarea value={val} onChange={(e) => setVal(e.target.value)}
            onBlur={() => { setEditing(false); onUpdate(val) }}
            autoFocus
            className="w-full p-4 text-sm text-gray-800 min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-[#039B96] border-0" />
        ) : (
          <div onClick={() => setEditing(true)}
            className="p-4 text-sm text-gray-800 cursor-text min-h-[50px] whitespace-pre-wrap hover:bg-gray-50/50 leading-relaxed">
            {val || <span className="text-gray-400 italic">Klik om te bewerken...</span>}
          </div>
        )
      )}
    </div>
  )
}

function LesTab({ lesText, setLesText, lesdoel, condition, onPrev, onNext }: any) {
  const [blocks, setBlocks] = useState<string[]>(() =>
    lesText.split('\n\n').filter((b: string) => b.trim().length > 0)
  )

  const sync = (nb: string[]) => { setBlocks(nb); setLesText(nb.join('\n\n')) }
  const updateBlock = (i: number, v: string) => { const nb = [...blocks]; nb[i] = v; sync(nb) }
  const deleteBlock = (i: number) => sync(blocks.filter((_: any, idx: number) => idx !== i))
  const moveBlock = (i: number, dir: 'up' | 'down') => {
    const nb = [...blocks]; const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= nb.length) return;
    [nb[i], nb[j]] = [nb[j], nb[i]]; sync(nb)
  }
  const addBlock = () => sync([...blocks, ''])

  // Determine phase label per block
  const phaseLabel = (i: number) => {
    const r = i / Math.max(blocks.length - 1, 1)
    if (r < 0.15) return 'Introductie'
    if (r < 0.55) return 'Instructie'
    if (r < 0.82) return 'Verwerking'
    return 'Afronding'
  }
  const phaseColors: Record<string, string> = {
    Introductie: 'text-blue-600',
    Instructie: 'text-purple-600',
    Verwerking: 'text-orange-600',
    Afronding: 'text-[#039B96]',
  }

  let prevPhase = ''
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={3} />
        <h1 className="text-3xl mb-4">Les</h1>
        <NudgeBox condition={condition} tab="les" />

        <div className="space-y-3">
          {blocks.map((block: string, i: number) => {
            const phase = phaseLabel(i)
            const showHeader = phase !== prevPhase; prevPhase = phase
            return (
              <div key={i}>
                {showHeader && (
                  <div className="flex items-center gap-3 mb-2 mt-5 first:mt-0">
                    <span className={`text-xs font-bold uppercase tracking-wider ${phaseColors[phase]}`}>{phase}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <LessonElementBlock
                  content={block} onUpdate={(v: string) => updateBlock(i, v)}
                  onDelete={() => deleteBlock(i)}
                  onMoveUp={() => moveBlock(i, 'up')} onMoveDown={() => moveBlock(i, 'down')}
                  isFirst={i === 0} isLast={i === blocks.length - 1}
                />
              </div>
            )
          })}

          <div className="flex gap-2 mt-4">
            <button onClick={addBlock}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tekstblok toevoegen
            </button>
          </div>
        </div>

        <div className="h-16 w-full relative mt-8 flex justify-between">
          <Btn variant="outline" onClick={onPrev}><ChevronLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext}>Volgende <ChevronRight /></Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} />
    </div>
  )
}

// ─── Voorvertoning Tab ────────────────────────────────────────────────────────
function renderMd(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let k = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) { nodes.push(<div key={k++} className="h-2" />); continue }
    if (line.startsWith('## ')) { nodes.push(<h2 key={k++} className="text-xl font-bold text-gray-900 mt-8 mb-3 first:mt-0">{line.slice(3)}</h2>); continue }
    if (line.startsWith('### ')) { nodes.push(<h3 key={k++} className="text-base font-semibold text-gray-800 mt-5 mb-2">{line.slice(4)}</h3>); continue }
    const md = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
    if (line.match(/^\d+\. /)) { nodes.push(<li key={k++} className="ml-5 list-decimal text-sm text-gray-700 mb-1" dangerouslySetInnerHTML={{ __html: md.replace(/^\d+\. /, '') }} />); continue }
    if (line.startsWith('- ')) { nodes.push(<li key={k++} className="ml-5 list-disc text-sm text-gray-700 mb-1" dangerouslySetInnerHTML={{ __html: md.slice(2) }} />); continue }
    nodes.push(<p key={k++} className="text-sm text-gray-700 mb-2" dangerouslySetInnerHTML={{ __html: md }} />)
  }
  return nodes
}

function VoorvertoningTab({ lesText, lesdoel, condition, onPrev, onShare }: any) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={4} />
        {/* Mobile lesdoel */}
        <div className="lg:hidden mb-6"><LesdoelCard lesdoel={lesdoel} /></div>
        <NudgeBox condition={condition} tab="voorvertoning" />
        <div className="h-16 w-full relative mt-2">
          <h1 className="text-3xl float-left">Voorvertoning</h1>
          <Btn variant="primary" className="float-right" onClick={onShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Deel deze les
          </Btn>
        </div>
        <div className="mt-4">
          {renderMd(lesText)}
        </div>
        <div className="h-16 w-full relative mt-8 flex justify-between">
          <Btn variant="outline" onClick={onPrev}><ChevronLeft /> Vorige</Btn>
          <Btn variant="primary" onClick={onShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Deel deze les
          </Btn>
        </div>
      </div>
      <div className="hidden lg:block lg:w-2/5 p-6 bg-white">
        <LesdoelCard lesdoel={lesdoel} />
      </div>
    </div>
  )
}

// ─── Nudge Box ────────────────────────────────────────────────────────────────
function NudgeBox({ condition, tab }: { condition: string; tab: string }) {
  if (condition === 'baseline') return null
  if (condition === 'nudge_accuracy' && tab === 'les') return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
      <span className="text-blue-500 text-lg">🔍</span>
      <div>
        <p className="text-sm font-semibold text-blue-900">Controleer de inhoud nauwkeurig</p>
        <p className="text-sm text-blue-700">AI-gegenereerde tekst kan fouten bevatten. Lees de inhoud zorgvuldig door voordat je deelt.</p>
      </div>
    </div>
  )
  if (condition === 'nudge_trust' && tab === 'les') return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex gap-3">
      <span className="text-green-500 text-lg">✅</span>
      <div>
        <p className="text-sm font-semibold text-green-900">Kwaliteitsgecontroleerde inhoud</p>
        <p className="text-sm text-green-700">Deze les is gegenereerd met geavanceerde AI en doorloopt een kwaliteitscheck.</p>
      </div>
    </div>
  )
  return null
}

// ─── Share Modal — matches MaxAssist ShareModal exactly ───────────────────────
function ShareModal({ tab, setTab, onClose, onDeelMetCollega, submitting, error }: {
  tab: 'students' | 'colleagues'; setTab: (t: 'students' | 'colleagues') => void
  onClose: () => void; onDeelMetCollega: () => void
  submitting: boolean; error: string | null
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 -mx-0 px-0">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Kies een deelmethode</h2>

            {/* Tabs matching original */}
            <div className="flex w-full mb-4">
              <button onClick={() => setTab('students')}
                className={`flex-1 py-2 text-sm font-medium transition-colors rounded-l-md ${tab === 'students' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Deel met doelgroep
              </button>
              <button onClick={() => setTab('colleagues')}
                className={`flex-1 py-2 text-sm font-medium transition-colors rounded-r-md ${tab === 'colleagues' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Deel met collega's
              </button>
            </div>

            {tab === 'students' && (
              <div className="text-sm text-gray-700 space-y-4">
                <p>Selecteer hoe je de les wilt delen met je leerlingen.</p>
                <div>
                  <p className="font-bold mt-2 mb-1">PDF download</p>
                  <p className="text-gray-500 mb-2">Deel als downloadbaar PDF bestand</p>
                  <Btn variant="default" className="w-full" onClick={() => {}}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download PDF bestand
                  </Btn>
                </div>
                <div>
                  <p className="font-bold mt-4 mb-1">Link met lescode</p>
                  <p className="text-gray-500 mb-2">Zet de les op slot zodat je de link kan delen.</p>
                  <Btn variant="default" className="w-full" onClick={() => {}}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Zet les op slot
                  </Btn>
                </div>
                <div className="flex justify-end pt-2">
                  <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                </div>
              </div>
            )}

            {tab === 'colleagues' && (
              <div>
                <p className="text-sm text-gray-600 mb-4">Deel de les <b>De fotosynthese</b> met je collega's.</p>
                <div className="flex gap-2 mb-5">
                  <input type="email" placeholder="E-mailadres"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                  <Btn variant="default" onClick={() => {}}>Toevoegen</Btn>
                </div>
                <p className="text-sm text-gray-400 mb-4">Voeg collega's toe om deze les met hen te delen.</p>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">{error}</div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
                  <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                  <Btn variant="primary" onClick={onDeelMetCollega} disabled={submitting}>
                    {submitting ? (
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    Delen met collega's
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ────────────────────────────────────────────────────────
function CompletionScreen() {
  return (
    <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-[#039B96]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#039B96]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Bedankt voor je deelname!</h1>
        <p className="text-gray-600 mb-6">Je hebt de les succesvol gedeeld. Ga nu terug naar Qualtrics om de vragenlijst af te ronden.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">📋 Volgende stap</p>
          <p className="text-sm text-amber-700">Keer terug naar het Qualtrics-tabblad in je browser om de evaluatie in te vullen.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Tiny icon helpers ────────────────────────────────────────────────────────
function ChevronRight() {
  return <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
}
function ChevronLeft() {
  return <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
}
