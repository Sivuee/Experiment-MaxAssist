'use client'

import { useState, useEffect, useRef } from 'react'
import {
  EXPERIMENT_TEXT, BASELINE_TEXT, ERRORS, N_ERRORS, LESSON_LESDOEL
} from '@/lib/experiment-content'
import { levenshtein, countCorrectedErrors } from '@/lib/metrics'

// ─── Color Palette ────────────────────────────────────────────────────────────
// maxPrimary: #F71E63  |  maxOrange: #F9703D  |  maxGreen: #039B96  |  lightGrey: #FAFBFD

// ─── Education levels (from original education-levels.ts) ─────────────────────
const EDU_LEVELS = [
  {
    id: 'PO', label: 'PO',
    subLevels: [
      { id: 'groep1-2', label: 'Groep 1-2' }, { id: 'groep3-4', label: 'Groep 3-4' },
      { id: 'groep5-6', label: 'Groep 5-6' }, { id: 'groep7-8', label: 'Groep 7-8' },
      { id: 'anders', label: 'Anders...' },
    ],
  },
  {
    id: 'VO', label: 'VO',
    subLevels: [
      {
        id: 'vmbo', label: 'VMBO',
        subSubLevels: [
          { id: 'basis', label: 'Basis' }, { id: 'kader', label: 'Kader' },
          { id: 'gt', label: 'Gemengd/Theoretisch' }, { id: 'anders', label: 'Anders...' },
        ],
      },
      { id: 'havo', label: 'HAVO' },
      { id: 'vwo', label: 'VWO' },
      { id: 'anders', label: 'Anders...' },
    ],
  },
  {
    id: 'MBO', label: 'MBO',
    subLevels: [
      { id: 'niveau1', label: 'Niveau 1' }, { id: 'niveau2', label: 'Niveau 2' },
      { id: 'niveau3', label: 'Niveau 3' }, { id: 'niveau4', label: 'Niveau 4' },
      { id: 'anders', label: 'Anders...' },
    ],
  },
  {
    id: 'HBO_WO', label: 'HBO/WO',
    subLevels: [
      { id: 'hbo', label: 'HBO' }, { id: 'wo', label: 'WO' }, { id: 'anders', label: 'Anders...' },
    ],
  },
  { id: 'Anders', label: 'Anders', subLevels: [] },
]

type AppStep = 'details' | 'authoring' | 'completed'
type AuthoringTab = 'lesplan' | 'lesoverzicht' | 'les' | 'voorvertoning'
type OutlinePhase = 'introductie' | 'instructie' | 'verwerking' | 'afronding'

// ─── Primitives ────────────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled = false, variant = 'default', className = '', type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost'; className?: string
  type?: 'button' | 'submit'
}) {
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2'
  const v: Record<string, string> = {
    primary:   'bg-gradient-to-r from-[#E13AA1] hover:from-[#e13aa1c4] to-[#F63] hover:to-[#ff6633ce] text-white',
    default:   'border-2 border-[#F71E63] text-[#F71E63] bg-white hover:border-[#E13AA1] disabled:border-0 disabled:bg-slate-200 disabled:text-slate-600',
    secondary: 'bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]',
    outline:   'border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] rounded-full',
    ghost:     'hover:bg-[#f4f4f5] hover:text-[#18181b] rounded-full',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} ${className}`}>
      {children}
    </button>
  )
}

function LesdoelCard({ lesdoel }: { lesdoel: string }) {
  return (
    <div className="rounded-lg bg-[#039B96] p-3 text-white text-sm w-full overflow-y-auto cursor-pointer hover:bg-[#038a86] transition-colors">
      <p className="font-bold pb-2">Lesdoel</p>
      <p>{lesdoel || <span className="italic opacity-75">Geen lesdoel ingesteld</span>}</p>
    </div>
  )
}

function MetroLine({ step }: { step: number }) {
  const items = [
    { id: 1, label: 'Lesplan' }, { id: 2, label: 'Lesoverzicht' },
    { id: 3, label: 'Les' }, { id: 4, label: 'Voorvertoning' },
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
                  completed ? 'border-[#039B96] bg-[#039B96]' : active ? 'border-[#F9703D] bg-white' : 'border-slate-100 bg-slate-300'
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-[#039B96]' : 'bg-gray-200'}`}>
      <span className={`block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

/** Right-side chat panel — content differs per tab */
function ChatPanel({ lesdoel, message }: { lesdoel: string; message?: string }) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-2/5 lg:min-w-0 lg:gap-4">
      <div className="shrink-0"><LesdoelCard lesdoel={lesdoel} /></div>
      <div className="flex-1 min-h-0 border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
          <span className="text-sm font-medium">Max</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] shrink-0 flex items-center justify-center text-white text-[10px] font-bold">M</div>
            <div className="bg-[#FAFBFD] rounded-xl rounded-bl-none px-4 py-3 text-sm text-gray-700 max-w-[85%]">
              {message || 'Hoi, ik ben Max, je AI-assistent. Vul de lesdetails in en vraag me om suggesties of hulp waar nodig.'}
            </div>
          </div>
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

function ChevRight() {
  return <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
}
function ChevLeft() {
  return <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
}

// ─── Max Loading Overlay ───────────────────────────────────────────────────────
function MaxLoader({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-200 opacity-80" />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-8 flex flex-col items-center text-center">
        {/* Animated Max logo */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-3xl font-bold mb-5 animate-pulse">
          M
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Max is bezig...</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#039B96] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── NudgeBox ─────────────────────────────────────────────────────────────────
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

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function ExperimentPage() {
  const [appStep, setAppStep]             = useState<AppStep>('details')
  const [activeTab, setActiveTab]         = useState<AuthoringTab>('lesplan')
  const [detailsComplete, setDetailsComplete] = useState(false)

  // LesDetails
  const [educatieNiveau, setEducatieNiveau]               = useState<string>('')
  const [educatieSpecifiekNiveau, setEducatieSpecifiekNiveau] = useState<string>('')
  const [educatieSpecifiekeRichting, setEducatieSpecifiekeRichting] = useState<string>('')
  const [customEducation, setCustomEducation]             = useState('')
  const [customSubLevel, setCustomSubLevel]               = useState('')
  const [onderwerp, setOnderwerp]                         = useState('')
  const [lesdoel, setLesdoel]                             = useState('')
  const [showLesdoelInput, setShowLesdoelInput]           = useState(false)
  const [referentieNiveau, setReferentieNiveau]           = useState('B1')
  const [kwalificatieEnabled, setKwalificatieEnabled]     = useState(false)
  const [educationStandards, setEducationStandards]       = useState<{ id: string; description: string; subject: string; expanded: boolean }[]>([])
  const [taxonomieEnabled, setTaxonomieEnabled]           = useState(false)
  const [selectedTaxonomie, setSelectedTaxonomie]         = useState('')
  const [selectedTaxNiveau, setSelectedTaxNiveau]         = useState('')
  const [detailsTab, setDetailsTab]                       = useState<'basis' | 'materiaal' | 'taal'>('basis')

  // Lesplan
  const [lesduur, setLesduur]       = useState<number | undefined>()
  const VERWERKING_OPDRACHT         = 'Schrijf een samenvatting van de les in maximaal 150 woorden.'

  // Lesoverzicht — loads after a 15s fake AI delay
  const [lesoverzichtLoaded, setLesoverzichtLoaded] = useState(false)
  const [lessonOutline, setLessonOutline] = useState<Record<OutlinePhase, { active: boolean; topics: { id: string; title: string }[] }>>({
    introductie: { active: true, topics: [
      { id: '1', title: 'Activeer voorkennis over planten' },
      { id: '2', title: 'Introduceer energie in biologische systemen' },
    ]},
    instructie: { active: true, topics: [
      { id: '3', title: 'Uitleg fotosynthese vergelijking' },
      { id: '4', title: 'Benodigde stoffen voor fotosynthese' },
      { id: '5', title: 'Factoren die snelheid beïnvloeden' },
    ]},
    verwerking: { active: true, topics: [
      { id: '6', title: 'Grafiek analyseren' },
      { id: '7', title: 'Experiment ontwerpen' },
    ]},
    afronding: { active: true, topics: [
      { id: '8', title: 'Kernvraag bespreken' },
      { id: '9', title: 'Reflectie op lesdoel' },
    ]},
  })

  // Les text (editable) — also syncs with lesoverzicht topics
  const [lesText, setLesText]           = useState(EXPERIMENT_TEXT)
  const [lesLoaded, setLesLoaded]       = useState(false)

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

  // Derived doelgroep string
  const mainLevel    = EDU_LEVELS.find(l => l.id === educatieNiveau)
  const subLevel     = mainLevel?.subLevels?.find(s => s.id === educatieSpecifiekNiveau) as any
  const subSubLevel  = subLevel?.subSubLevels?.find((s: any) => s.id === educatieSpecifiekeRichting)
  const doelgroepStr = educatieNiveau === 'Anders' ? (customEducation || 'Anders')
    : [mainLevel?.label, subLevel?.label, subSubLevel?.label].filter(Boolean).join(' - ')

  const wordCount = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const isDetailsValid = !!educatieNiveau && wordCount >= 3 && lesdoel.trim().length > 0

  const handleSaveDetails = () => {
    if (!isDetailsValid) return
    setDetailsComplete(true)
    setAppStep('authoring')
  }

  // When switching to lesoverzicht for first time, trigger 15s load
  const switchToTab = (tab: AuthoringTab) => {
    setActiveTab(tab)
    if (tab === 'lesoverzicht' && !lesoverzichtLoaded) {
      // Loader shown in the tab itself
    }
    if (tab === 'les' && !lesLoaded) {
      // Loader shown in Les tab
    }
  }

  const handleDeelMetCollega = async () => {
    setSubmitting(true); setSubmitError(null)
    const { corrected, uncorrected } = countCorrectedErrors(lesText, ERRORS)
    const lev = levenshtein(lesText, BASELINE_TEXT)
    try {
      const res = await fetch('https://formspree.io/f/mqedwepd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId, condition,
          error_correction_rate: corrected.length / N_ERRORS,
          errors_corrected: corrected.join(','), errors_uncorrected: uncorrected.join(','),
          levenshtein_distance: lev, final_text: lesText, submitted_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('failed')
      setShareModalOpen(false); setAppStep('completed')
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
        {/* Left sidebar — logo only */}
        <aside className="hidden md:flex flex-col w-16 bg-white border-r border-gray-100 pt-4 pb-6 items-center shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white font-bold text-sm">M</div>
        </aside>

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Tab bar only for authoring */}
          {appStep === 'authoring' && (
            <div className="bg-white border-b border-gray-200 px-5 flex gap-1 pt-2 shrink-0">
              {(['lesplan', 'lesoverzicht', 'les', 'voorvertoning'] as AuthoringTab[]).map((tab) => (
                <button key={tab} onClick={() => switchToTab(tab)}
                  className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                    activeTab === tab ? 'border-[#039B96] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
                educatieSpecifiekNiveau={educatieSpecifiekNiveau} setEducatieSpecifiekNiveau={setEducatieSpecifiekNiveau}
                educatieSpecifiekeRichting={educatieSpecifiekeRichting} setEducatieSpecifiekeRichting={setEducatieSpecifiekeRichting}
                customEducation={customEducation} setCustomEducation={setCustomEducation}
                customSubLevel={customSubLevel} setCustomSubLevel={setCustomSubLevel}
                onderwerp={onderwerp} setOnderwerp={setOnderwerp}
                lesdoel={lesdoel} setLesdoel={setLesdoel}
                showLesdoelInput={showLesdoelInput} setShowLesdoelInput={setShowLesdoelInput}
                referentieNiveau={referentieNiveau} setReferentieNiveau={setReferentieNiveau}
                kwalificatieEnabled={kwalificatieEnabled} setKwalificatieEnabled={setKwalificatieEnabled}
                educationStandards={educationStandards} setEducationStandards={setEducationStandards}
                taxonomieEnabled={taxonomieEnabled} setTaxonomieEnabled={setTaxonomieEnabled}
                selectedTaxonomie={selectedTaxonomie} setSelectedTaxonomie={setSelectedTaxonomie}
                selectedTaxNiveau={selectedTaxNiveau} setSelectedTaxNiveau={setSelectedTaxNiveau}
                detailsTab={detailsTab} setDetailsTab={setDetailsTab}
                doelgroepStr={doelgroepStr} isValid={isDetailsValid} onSave={handleSaveDetails}
              />
            )}
            {appStep === 'authoring' && activeTab === 'lesplan' && (
              <LesplanTab lesduur={lesduur} setLesduur={setLesduur}
                verwerkingOpdracht={VERWERKING_OPDRACHT}
                lesdoel={activeLesdoel} condition={condition}
                onNext={() => switchToTab('lesoverzicht')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'lesoverzicht' && (
              <LesoverzichtTab
                lessonOutline={lessonOutline} setLessonOutline={setLessonOutline}
                lesdoel={activeLesdoel} condition={condition}
                loaded={lesoverzichtLoaded} setLoaded={setLesoverzichtLoaded}
                onPrev={() => switchToTab('lesplan')}
                onNext={() => switchToTab('les')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'les' && (
              <LesTab lesText={lesText} setLesText={setLesText}
                lessonOutline={lessonOutline}
                lesdoel={activeLesdoel} condition={condition}
                loaded={lesLoaded} setLoaded={setLesLoaded}
                onPrev={() => switchToTab('lesoverzicht')}
                onNext={() => switchToTab('voorvertoning')}
              />
            )}
            {appStep === 'authoring' && activeTab === 'voorvertoning' && (
              <VoorvertoningTab lesText={lesText} lesdoel={activeLesdoel}
                condition={condition}
                onPrev={() => switchToTab('les')}
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
          onLesOpSlot={() => { setShareModalOpen(false); setAppStep('completed') }}
          submitting={submitting} error={submitError}
          lesText={lesText}
        />
      )}
    </div>
  )
}

// ─── LesDetails Tab ───────────────────────────────────────────────────────────
const TAXONOMIES = [
  { label: "Bloom's Taxonomie",    levels: ['Kennis', 'Begrip', 'Toepassing', 'Analyse', 'Synthese', 'Evaluatie'] },
  { label: 'Anderson & Krathwohl', levels: ['Onthouden', 'Begrijpen', 'Toepassen', 'Analyseren', 'Evalueren', 'Creëren'] },
]

function LesDetailsTab({ educatieNiveau, setEducatieNiveau, educatieSpecifiekNiveau, setEducatieSpecifiekNiveau,
  educatieSpecifiekeRichting, setEducatieSpecifiekeRichting, customEducation, setCustomEducation,
  customSubLevel, setCustomSubLevel, onderwerp, setOnderwerp, lesdoel, setLesdoel,
  showLesdoelInput, setShowLesdoelInput, referentieNiveau, setReferentieNiveau,
  kwalificatieEnabled, setKwalificatieEnabled, educationStandards, setEducationStandards,
  taxonomieEnabled, setTaxonomieEnabled, selectedTaxonomie, setSelectedTaxonomie,
  selectedTaxNiveau, setSelectedTaxNiveau, detailsTab, setDetailsTab,
  doelgroepStr, isValid, onSave }: any) {

  const wordCount = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const progress = [!!educatieNiveau, wordCount >= 3, lesdoel.trim().length > 0].filter(Boolean).length

  const mainLevel   = EDU_LEVELS.find(l => l.id === educatieNiveau)
  const subLevels   = mainLevel?.subLevels || []
  const subLevel    = subLevels.find((s: any) => s.id === educatieSpecifiekNiveau) as any
  const subSubLevels = (subLevel as any)?.subSubLevels || []

  const handleAddStandard = () => {
    setEducationStandards((prev: any[]) => [...prev, { id: Date.now().toString(), description: '', subject: '', expanded: true }])
  }
  const removeStandard = (id: string) =>
    setEducationStandards((prev: any[]) => prev.filter((s: any) => s.id !== id))
  const updateStandard = (id: string, field: string, val: string) =>
    setEducationStandards((prev: any[]) => prev.map((s: any) => s.id === id ? { ...s, [field]: val } : s))
  const toggleExpand = (id: string) =>
    setEducationStandards((prev: any[]) => prev.map((s: any) => s.id === id ? { ...s, expanded: !s.expanded } : s))

  const completionText = !educatieNiveau ? 'Selecteer de doelgroep'
    : wordCount < 3 ? 'Vul het onderwerp in (minimaal 3 woorden)'
    : !lesdoel.trim() ? 'Vul het lesdoel in'
    : 'Alle basisinformatie is ingevuld'

  // "Laat AI een lesdoel maken" is grayed out when onderwerp is empty
  const aiLesdoelDisabled = wordCount < 3

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-[#039B96] mb-1">Lesdetails bewerken</h2>
          <p className="text-sm text-gray-500">Bewerk de basisinformatie van je les</p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div className="bg-[#039B96] h-1.5 rounded-full transition-all duration-300" style={{ width: `${(progress / 3) * 100}%` }} />
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {(['basis', 'materiaal', 'taal'] as const).map((tab) => (
            <button key={tab} onClick={() => setDetailsTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${detailsTab === tab ? 'text-[#039B96] border-b-2 border-[#039B96]' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'basis' ? 'Basisinformatie' : tab === 'materiaal' ? 'Bronmateriaal' : 'Taalinstellingen'}
            </button>
          ))}
        </div>

        {detailsTab === 'basis' && (
          <div className="space-y-6">
            {/* ── Voor wie is deze les? (3-level cascade like original) ── */}
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-4">
              <label className="block text-base font-semibold">Voor wie is deze les?</label>

              {/* Level 1: main level */}
              <div className="grid grid-cols-5 gap-2">
                {EDU_LEVELS.map(level => (
                  <button key={level.id} type="button"
                    onClick={() => {
                      setEducatieNiveau(level.id)
                      setEducatieSpecifiekNiveau('')
                      setEducatieSpecifiekeRichting('')
                    }}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                      educatieNiveau === level.id
                        ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}>{level.label}</button>
                ))}
              </div>

              {/* Level 2: sub-levels (shown when main level selected + has subLevels) */}
              {educatieNiveau && educatieNiveau !== 'Anders' && subLevels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specifiek niveau</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subLevels.map((sub: any) => (
                      <button key={sub.id} type="button"
                        onClick={() => {
                          setEducatieSpecifiekNiveau(sub.id)
                          setEducatieSpecifiekeRichting('')
                          setCustomSubLevel('')
                        }}
                        className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                          educatieSpecifiekNiveau === sub.id
                            ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}>{sub.label}</button>
                    ))}
                  </div>
                  {/* Custom input for sub-level "Anders..." */}
                  {educatieSpecifiekNiveau === 'anders' && (
                    <input type="text" value={customSubLevel} onChange={e => setCustomSubLevel(e.target.value)}
                      placeholder="Beschrijf het niveau..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                  )}
                </div>
              )}

              {/* Level 3: sub-sub-levels (e.g. VMBO → Basis/Kader/GT) */}
              {educatieSpecifiekNiveau && educatieSpecifiekNiveau !== 'anders' && subSubLevels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specifieke richting</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {subSubLevels.map((sub: any) => (
                      <button key={sub.id} type="button"
                        onClick={() => setEducatieSpecifiekeRichting(sub.id)}
                        className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${
                          educatieSpecifiekeRichting === sub.id
                            ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}>{sub.label}</button>
                    ))}
                  </div>
                  {educatieSpecifiekeRichting === 'anders' && (
                    <input type="text" placeholder="Beschrijf de richting..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                  )}
                </div>
              )}

              {/* Custom input for "Anders" main level */}
              {educatieNiveau === 'Anders' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specificeer doelgroep</label>
                  <input type="text" value={customEducation} onChange={e => setCustomEducation(e.target.value)}
                    placeholder="bijv. Volwassenenonderwijs, Bedrijfstraining..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                </div>
              )}

              {doelgroepStr && (
                <div className="text-xs text-[#039B96] font-medium">✓ Doelgroep: {doelgroepStr}</div>
              )}
            </div>

            {/* ── Onderwerp ── */}
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-3">
              <label className="block text-base font-semibold">Waar gaat de les over?</label>
              <input type="text" value={onderwerp} onChange={e => setOnderwerp(e.target.value)}
                placeholder="bijv. het herkennen van stijlfiguren in poëzie, snelheid, afstand en tijd berekenen"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
              {onderwerp.trim().length > 0 && wordCount < 3 && (
                <p className="text-xs text-red-500">Vul minimaal 3 woorden in</p>
              )}
              {wordCount >= 3 && <p className="text-xs text-green-600">✓ Onderwerp ingevuld</p>}
            </div>

            {/* ── Kwalificatie-eisen ── */}
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-base font-semibold">Kwalificatie-eisen</label>
                  <p className="text-sm text-gray-500 mt-1">Officiële eindtermen of exameneisen uit syllabi, examenprogramma's of andere kwalificatiedocumenten.</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">{kwalificatieEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                  <Toggle checked={kwalificatieEnabled} onChange={setKwalificatieEnabled} />
                </div>
              </div>

              {kwalificatieEnabled && (
                <>
                  <Btn variant="default" className="w-full" onClick={handleAddStandard}>
                    + Kwalificatie-eis toevoegen
                  </Btn>

                  {educationStandards.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">Nog geen kwalificatie-eisen toegevoegd. Gebruik de knop hierboven om de eerste toe te voegen.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {educationStandards.map((std: any) => (
                      <div key={std.id} className="border border-gray-200 border-l-4 border-l-[#039B96] rounded-lg overflow-hidden">
                        <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpand(std.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-semibold text-gray-900 truncate">{std.subject || 'Kwalificatie-eis'}</div>
                            <div className="text-sm text-gray-500 mt-1 line-clamp-2">{std.description || 'Nog geen beschrijving toegevoegd'}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <Btn variant="secondary" className="text-red-600 hover:text-red-700 h-8 px-3 text-xs"
                              onClick={(e: any) => { e?.stopPropagation?.(); removeStandard(std.id) }}>
                              Verwijderen
                            </Btn>
                            <svg className={`w-5 h-5 text-gray-500 transition-transform ${std.expanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </div>
                        </div>
                        {std.expanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Exacte kwalificatie-eis</label>
                              <textarea value={std.description}
                                onChange={e => updateStandard(std.id, 'description', e.target.value)}
                                placeholder="Beschrijf exact wat deze kwalificatie-eis inhoudt."
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] min-h-[100px]" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Vak / opleiding / domein / leergebied (optioneel)</label>
                              <input type="text" value={std.subject}
                                onChange={e => updateStandard(std.id, 'subject', e.target.value)}
                                placeholder="bijv. Nederlands, Engels, Zorg & Welzijn, MBO Verpleegkunde"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Leertaxonomie ── */}
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="block text-base font-semibold">Leertaxonomie</label>
                  <p className="text-sm text-gray-500 mt-1">Welke leertaxonomie en welk niveau wil je gebruiken als ontwerpkader?</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">{taxonomieEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                  <Toggle checked={taxonomieEnabled} onChange={setTaxonomieEnabled} />
                </div>
              </div>
              {taxonomieEnabled && (
                <div className="space-y-4">
                  {TAXONOMIES.map(tax => (
                    <div key={tax.label}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{tax.label}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {tax.levels.map(lvl => (
                          <button key={lvl} type="button"
                            onClick={() => { setSelectedTaxonomie(tax.label); setSelectedTaxNiveau(lvl) }}
                            className={`px-3 py-2 rounded-md border text-xs font-medium transition-all ${
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

            {/* ── Lesdoel ── */}
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-4">
              <label className="block text-base font-semibold">Wat moeten leerlingen kunnen na de les?</label>
              <div className="flex gap-3">
                {/* AI button disabled when onderwerp < 3 words */}
                <Btn variant="primary" className="flex-1"
                  disabled={aiLesdoelDisabled}
                  onClick={() => { if (!aiLesdoelDisabled) { setLesdoel(LESSON_LESDOEL); setShowLesdoelInput(true) } }}>
                  Laat AI een lesdoel maken
                </Btn>
                <Btn variant="secondary" className="flex-1" onClick={() => setShowLesdoelInput(true)}>
                  Zelf invullen
                </Btn>
              </div>
              {aiLesdoelDisabled && (
                <p className="text-xs text-gray-400">Vul eerst het onderwerp in (minimaal 3 woorden) om AI te gebruiken.</p>
              )}
              {(showLesdoelInput || lesdoel) && (
                <div className="space-y-2">
                  <textarea value={lesdoel} onChange={e => setLesdoel(e.target.value.slice(0, 1000))}
                    placeholder="bijv. Leerlingen kunnen de factoren die fotosynthese beïnvloeden uitleggen..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] min-h-[80px]" />
                  {lesdoel.trim().length > 0 && <p className="text-xs text-green-600">✓ Lesdoel ingevuld</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {detailsTab === 'materiaal' && (
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-gray-900">Feitenkader</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">Feitenkader is onderdeel van Bronmateriaal. Voeg een feitenkader toe; Max toetst erop dat gegenereerd lesmateriaal niet conflicteert met de inhoud die hier staat.</p>
            </div>
            <Btn variant="default" className="w-full" onClick={() => {}}>+ Feitenkader toevoegen</Btn>
          </div>
        )}

        {detailsTab === 'taal' && (
          <div className="space-y-6">
            <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-6 space-y-3">
              <label className="block text-base font-semibold">Op welk taalniveau?</label>
              <div className="grid grid-cols-4 gap-2">
                {['1F','2F','3F','4F'].map(n => (
                  <button key={n} type="button" onClick={() => setReferentieNiveau(n)}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${referentieNiveau === n ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-2">
                {['A1','A2','B1','B2','C1','C2'].map(n => (
                  <button key={n} type="button" onClick={() => setReferentieNiveau(n)}
                    className={`px-2 py-2 rounded-md border-2 font-medium text-sm transition-all ${referentieNiveau === n ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
          <div className="text-sm text-gray-600">{completionText}</div>
          <Btn variant="default" onClick={onSave} disabled={!isValid}>Opslaan</Btn>
        </div>
      </div>

      {/* Right: chat panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-2/5 p-6 gap-4 bg-white overflow-y-auto">
        <div className="shrink-0"><LesdoelCard lesdoel={lesdoel} /></div>
        <div className="flex-1 border border-gray-200 rounded-lg bg-white flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
            <span className="text-sm font-medium">Max</span>
          </div>
          <div className="p-4">
            <div className="flex gap-2 items-end">
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] shrink-0 flex items-center justify-center text-white text-[10px] font-bold">M</div>
              <div className="bg-[#FAFBFD] rounded-xl rounded-bl-none px-4 py-3 text-sm text-gray-700">
                Hoi, ik ben Max, je AI-assistent. Vul de lesdetails in en vraag me om suggesties of hulp waar nodig.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lesplan Tab ───────────────────────────────────────────────────────────────
function LesplanTab({ lesduur, setLesduur, verwerkingOpdracht, lesdoel, condition, onNext }: any) {
  const canNext = lesduur !== undefined && lesduur >= 10 && lesduur <= 300
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={1} />
        <NudgeBox condition={condition} tab="lesplan" />
        <div className="space-y-6">
          <div className="border border-gray-200 p-6 rounded-lg">
            <p className="font-bold text-base mb-1">Verwerkingsopdracht</p>
            <p className="text-sm text-gray-500 mb-4">Kies een opdracht voor deze fase</p>
            <div className="border-2 border-[#039B96] bg-[#039B96]/5 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#039B96] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#039B96]" />
              </div>
              <p className="text-sm text-gray-700">{verwerkingOpdracht}</p>
            </div>
          </div>

          <div className="border border-gray-200 p-6 rounded-lg">
            <p className="font-bold text-base mb-1">Lesduur</p>
            <p className="text-sm text-gray-500 mb-3">Hoe lang duurt de les? (in minuten)</p>
            <input type="number" value={lesduur ?? ''} min={10} max={300}
              onChange={e => { const v = e.target.value; if (v === '') { setLesduur(undefined); return }; const n = parseInt(v, 10); if (!isNaN(n)) setLesduur(n) }}
              placeholder="bijv. 45"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
            {lesduur !== undefined && (lesduur < 10 || lesduur > 300) && (
              <p className="text-xs text-red-500 mt-1">Lesduur moet tussen 10 en 300 minuten zijn</p>
            )}
          </div>
        </div>
        <div className="h-16 w-full relative mt-8">
          <Btn variant="default" onClick={onNext} disabled={!canNext} className="float-right">
            Volgende <ChevRight />
          </Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} message="Goed bezig! Vul de verwerkingsopdracht en lesduur in. In de volgende stap maak ik een lesstructuur voor je." />
    </div>
  )
}

// ─── Lesoverzicht Tab ──────────────────────────────────────────────────────────
const PHASE_TITLES: Record<OutlinePhase, string> = { introductie: 'Introductie', instructie: 'Instructie', verwerking: 'Verwerking', afronding: 'Afronding' }
const PHASE_DESCS:  Record<OutlinePhase, string> = {
  introductie: 'Activeer voorkennis en wek interesse',
  instructie:  'Leg nieuwe kennis en concepten uit',
  verwerking:  'Oefen met de nieuwe kennis',
  afronding:   'Reflecteer en evalueer',
}

function LesoverzichtTab({ lessonOutline, setLessonOutline, lesdoel, condition, loaded, setLoaded, onPrev, onNext }: any) {
  // 15-second fake AI delay on first visit
  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => setLoaded(true), 15000)
      return () => clearTimeout(t)
    }
  }, [loaded, setLoaded])

  const toggle = (phase: OutlinePhase) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], active: !p[phase].active } }))
  const updateTopic = (phase: OutlinePhase, id: string, title: string) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], topics: p[phase].topics.map((t: any) => t.id === id ? { ...t, title } : t) } }))
  const deleteTopic = (phase: OutlinePhase, id: string) =>
    setLessonOutline((p: any) => ({ ...p, [phase]: { ...p[phase], topics: p[phase].topics.filter((t: any) => t.id !== id) } }))
  const moveTopic = (phase: OutlinePhase, idx: number, dir: 'up' | 'down') =>
    setLessonOutline((p: any) => {
      const topics = [...p[phase].topics]; const j = dir === 'up' ? idx - 1 : idx + 1
      if (j < 0 || j >= topics.length) return p;
      [topics[idx], topics[j]] = [topics[j], topics[idx]]
      return { ...p, [phase]: { ...p[phase], topics } }
    })

  const hasActive = (Object.keys(PHASE_TITLES) as OutlinePhase[]).some(k => lessonOutline[k].active)

  return (
    <div className="flex h-full overflow-hidden">
      {/* AI loading overlay */}
      <MaxLoader visible={!loaded} message="Max maakt de lesstructuur voor je. Pak vast een kopje koffie! ☕" />

      <div className={`w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32 ${!loaded ? 'pointer-events-none' : ''}`}>
        <MetroLine step={2} />
        <h1 className="text-3xl font-bold mb-1">Lesoverzicht</h1>
        <div className="text-sm text-gray-500 mb-6">
          <div className="font-bold">Structureer je les</div>
          <p>Bepaal de opbouw van je les door de onderwerpen per fase te ordenen.</p>
        </div>
        <NudgeBox condition={condition} tab="lesoverzicht" />

        <div className="space-y-6">
          {(Object.keys(PHASE_TITLES) as OutlinePhase[]).map(phase => {
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
                    <div className="space-y-2">
                      {topics.map((topic: any, idx: number) => (
                        /* Matches original: card with colored left border */
                        <div key={topic.id} className="rounded-xl border border-input bg-gray-50 p-4">
                          <div className="flex items-center gap-2">
                            <input defaultValue={topic.title}
                              onBlur={e => updateTopic(phase, topic.id, e.target.value)}
                              className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] bg-white" />
                            <button onClick={() => moveTopic(phase, idx, 'up')} disabled={idx === 0}
                              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button onClick={() => moveTopic(phase, idx, 'down')} disabled={idx === topics.length - 1}
                              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button onClick={() => deleteTopic(phase, topic.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
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
          <Btn variant="outline" onClick={onPrev} className="float-left"><ChevLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext} disabled={!hasActive} className="float-right">Volgende <ChevRight /></Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} message="Ik heb de lesstructuur gegenereerd op basis van je lesdetails. Je kunt fasen in- of uitschakelen en onderwerpen aanpassen." />
    </div>
  )
}

// ─── Les Tab ───────────────────────────────────────────────────────────────────

/** Matches original lesson-element: rounded-xl border bg-gray-50 p-6 with action buttons */
function TextBlock({ content, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, phaseLabel }: {
  content: string; onUpdate: (v: string) => void; onDelete: () => void
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean
  phaseLabel: string
}) {
  const [editing, setEditing]     = useState(false)
  const [val, setVal]             = useState(content)
  const [collapsed, setCollapsed] = useState(false)

  const phaseColors: Record<string, string> = {
    Introductie: 'bg-blue-100 text-blue-700',
    Instructie:  'bg-purple-100 text-purple-700',
    Verwerking:  'bg-orange-100 text-orange-700',
    Afronding:   'bg-teal-100 text-teal-700',
  }

  return (
    <div className="rounded-xl border border-input bg-gray-50 p-0 overflow-hidden">
      {/* Top toolbar — matches original element header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${phaseColors[phaseLabel] || 'bg-gray-100 text-gray-600'}`}>
          {phaseLabel}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-200 rounded text-gray-500">
            <svg className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-6 pt-3">
          {editing ? (
            <textarea value={val} onChange={e => setVal(e.target.value)}
              onBlur={() => { setEditing(false); onUpdate(val) }}
              autoFocus
              className="w-full text-sm text-gray-800 min-h-[80px] resize-y focus:outline-none bg-transparent border-0 p-0 leading-relaxed" />
          ) : (
            <div onClick={() => setEditing(true)}
              className="text-sm text-gray-800 cursor-text min-h-[40px] whitespace-pre-wrap hover:bg-gray-100/50 rounded leading-relaxed p-1 -m-1">
              {val || <span className="text-gray-400 italic">Klik om te bewerken...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LesTab({ lesText, setLesText, lessonOutline, lesdoel, condition, loaded, setLoaded, onPrev, onNext }: any) {
  // 20-second AI loading on first visit
  useEffect(() => {
    if (!loaded) {
      const t = setTimeout(() => setLoaded(true), 20000)
      return () => clearTimeout(t)
    }
  }, [loaded, setLoaded])

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

  // Assign phase label per block proportionally
  const phaseLabel = (i: number) => {
    const r = i / Math.max(blocks.length - 1, 1)
    if (r < 0.15) return 'Introductie'
    if (r < 0.55) return 'Instructie'
    if (r < 0.82) return 'Verwerking'
    return 'Afronding'
  }

  return (
    <div className="flex h-full overflow-hidden">
      <MaxLoader visible={!loaded} message="Max genereert de volledige lesinhoud voor je. Pak vast een kopje koffie! ☕" />

      <div className={`w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32 ${!loaded ? 'pointer-events-none' : ''}`}>
        <MetroLine step={3} />
        {/* Mobile lesdoel */}
        <div className="lg:hidden mb-4"><LesdoelCard lesdoel={lesdoel} /></div>
        <h1 className="text-3xl mb-4">Les</h1>
        <NudgeBox condition={condition} tab="les" />

        <div className="space-y-4">
          {blocks.map((block: string, i: number) => (
            <TextBlock key={i}
              content={block} onUpdate={v => updateBlock(i, v)}
              onDelete={() => deleteBlock(i)}
              onMoveUp={() => moveBlock(i, 'up')} onMoveDown={() => moveBlock(i, 'down')}
              isFirst={i === 0} isLast={i === blocks.length - 1}
              phaseLabel={phaseLabel(i)}
            />
          ))}

          <button onClick={addBlock}
            className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Tekstblok toevoegen
          </button>
        </div>

        <div className="h-16 w-full relative mt-8 flex justify-between">
          <Btn variant="outline" onClick={onPrev}><ChevLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext}>Volgende <ChevRight /></Btn>
        </div>
      </div>

      <ChatPanel lesdoel={lesdoel} message="Ik heb de lesinhoud gegenereerd. Klik op een tekstblok om het te bewerken. Controleer de inhoud goed voordat je de les deelt!" />
    </div>
  )
}

// ─── Voorvertoning Tab ─────────────────────────────────────────────────────────
function renderMd(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []; let k = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) { nodes.push(<div key={k++} className="h-2" />); continue }
    const md = line.replace(/\*\*(.+?)\*\*/g, (_, m) => `<strong>${m}</strong>`)
    if (line.startsWith('## ')) { nodes.push(<h2 key={k++} className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">{line.slice(3)}</h2>); continue }
    if (line.startsWith('### ')) { nodes.push(<h3 key={k++} className="text-lg font-semibold text-gray-800 mt-5 mb-2">{line.slice(4)}</h3>); continue }
    if (line.match(/^\d+\. /)) { nodes.push(<li key={k++} className="ml-6 list-decimal text-base text-gray-700 mb-1.5" dangerouslySetInnerHTML={{ __html: md.replace(/^\d+\. /, '') }} />); continue }
    if (line.startsWith('- ')) { nodes.push(<li key={k++} className="ml-6 list-disc text-base text-gray-700 mb-1.5" dangerouslySetInnerHTML={{ __html: md.slice(2) }} />); continue }
    nodes.push(<p key={k++} className="text-base text-gray-700 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: md }} />)
  }
  return nodes
}

function VoorvertoningTab({ lesText, lesdoel, condition, onPrev, onShare }: any) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
        <MetroLine step={4} />
        <div className="lg:hidden mb-6"><LesdoelCard lesdoel={lesdoel} /></div>
        <NudgeBox condition={condition} tab="voorvertoning" />

        <div className="flex items-center justify-between mb-8 overflow-hidden">
          <h1 className="text-3xl font-bold">Voorvertoning</h1>
          <Btn variant="primary" onClick={onShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Deel deze les
          </Btn>
        </div>

        {/* Preview card with white bg, border, shadow */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-8">
          {renderMd(lesText)}
        </div>

        <div className="flex justify-between">
          <Btn variant="outline" onClick={onPrev}><ChevLeft /> Vorige</Btn>
          <Btn variant="primary" onClick={onShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Deel deze les
          </Btn>
        </div>
      </div>

      <div className="hidden lg:block lg:w-2/5 p-6 bg-white overflow-y-auto">
        <LesdoelCard lesdoel={lesdoel} />
      </div>
    </div>
  )
}

// ─── Share Modal ───────────────────────────────────────────────────────────────
type Invite = { email: string; role: 'lezer' | 'bewerker' }

function ShareModal({ tab, setTab, onClose, onDeelMetCollega, onLesOpSlot, submitting, error, lesText }: {
  tab: 'students' | 'colleagues'; setTab: (t: 'students' | 'colleagues') => void
  onClose: () => void; onDeelMetCollega: () => void; onLesOpSlot: () => void
  submitting: boolean; error: string | null; lesText: string
}) {
  const [emailInput, setEmailInput]   = useState('')
  const [roleInput, setRoleInput]     = useState<'lezer' | 'bewerker'>('lezer')
  const [invites, setInvites]         = useState<Invite[]>([])
  const [emailError, setEmailError]   = useState('')

  const addInvite = () => {
    if (!emailInput.trim()) { setEmailError('Vul een e-mailadres in'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) { setEmailError('Ongeldig e-mailadres'); return }
    setInvites(prev => [...prev, { email: emailInput.trim(), role: roleInput }])
    setEmailInput(''); setEmailError('')
  }
  const removeInvite = (i: number) => setInvites(prev => prev.filter((_, idx) => idx !== i))

  // PDF download using browser print
  const handleDownloadPDF = () => {
    const content = lesText.replace(/## /g, '\n\n').replace(/### /g, '\n').replace(/\*\*/g, '').replace(/- /g, '• ')
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Les - De fotosynthese</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.7;color:#111}h1,h2{color:#039B96}@media print{body{margin:0}}</style></head><body><h1>De fotosynthese</h1><pre style="font-family:inherit;white-space:pre-wrap">${content}</pre></body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Kies een deelmethode</h2>

          {/* Tab switcher */}
          <div className="flex w-full mb-5">
            <button onClick={() => setTab('students')}
              className={`flex-1 py-2 text-sm font-medium rounded-l-md transition-colors ${tab === 'students' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Deel met doelgroep
            </button>
            <button onClick={() => setTab('colleagues')}
              className={`flex-1 py-2 text-sm font-medium rounded-r-md transition-colors ${tab === 'colleagues' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Deel met collega's
            </button>
          </div>

          {tab === 'students' && (
            <div className="space-y-5 text-sm text-gray-700">
              <p>Selecteer hoe je de les wilt delen met je leerlingen.</p>

              <div>
                <p className="font-bold mb-1">PDF download</p>
                <p className="text-gray-500 mb-2">Deel als downloadbaar PDF bestand</p>
                <Btn variant="default" className="w-full" onClick={handleDownloadPDF}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download PDF bestand
                </Btn>
              </div>

              <div>
                <p className="font-bold mb-1">Link met lescode</p>
                <p className="text-gray-500 mb-2">Zet de les op slot zodat je de link kan delen.</p>
                <Btn variant="default" className="w-full" onClick={onLesOpSlot}>
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

              {/* Add invite row */}
              <div className="flex gap-2 mb-2 items-start">
                <div className="flex-1">
                  <input type="email" value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') addInvite() }}
                    placeholder="E-mailadres"
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] ${emailError ? 'border-red-400' : 'border-gray-300'}`} />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>
                <select value={roleInput} onChange={e => setRoleInput(e.target.value as any)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#039B96] h-10">
                  <option value="lezer">Lezer</option>
                  <option value="bewerker">Bewerker</option>
                </select>
                <Btn variant="default" onClick={addInvite}>Toevoegen</Btn>
              </div>

              {/* Invite list */}
              {invites.length > 0 && (
                <div className="space-y-2 mb-4">
                  {invites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <div className="w-7 h-7 rounded-full bg-[#039B96]/20 flex items-center justify-center text-[#039B96] text-xs font-bold shrink-0">
                        {inv.email[0].toUpperCase()}
                      </div>
                      <span className="text-sm flex-1 truncate">{inv.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.role === 'bewerker' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {inv.role === 'bewerker' ? 'Bewerker' : 'Lezer'}
                      </span>
                      <button onClick={() => removeInvite(i)} className="text-gray-400 hover:text-red-500 p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {invites.length === 0 && (
                <p className="text-sm text-gray-400 mb-4">Voeg collega's toe om deze les met hen te delen.</p>
              )}

              {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">{error}</div>}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn variant="primary" onClick={onDeelMetCollega} disabled={submitting}>
                  {submitting ? (
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 22 6.477 22 12h-4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                  Delen met collega's
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Completion Screen ─────────────────────────────────────────────────────────
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
