'use client'

import { useState, useEffect } from 'react'
import {
  EXPERIMENT_TEXT, BASELINE_TEXT, ERRORS, N_ERRORS, LESSON_LESDOEL
} from '@/lib/experiment-content'
import { levenshtein, countCorrectedErrors } from '@/lib/metrics'

// ─── Education levels ─────────────────────────────────────────────────────────
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

// ─── Shared primitives ────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled = false, variant = 'default', className = '' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost'; className?: string
}) {
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2'
  const v: Record<string, string> = {
    primary:   'bg-gradient-to-r from-[#E13AA1] hover:from-[#e13aa1c4] to-[#F63] hover:to-[#ff6633ce] text-white',
    default:   'border-2 border-[#F71E63] text-[#F71E63] bg-white hover:border-[#E13AA1] disabled:border-0 disabled:bg-slate-200 disabled:text-slate-600',
    secondary: 'bg-[#f4f4f5] text-[#18181b] hover:bg-[#e4e4e7]',
    outline:   'border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5]',
    ghost:     'hover:bg-[#f4f4f5] hover:text-[#18181b]',
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} ${className}`}>
      {children}
    </button>
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

function LesdoelCard({ lesdoel }: { lesdoel: string }) {
  return (
    <div className="rounded-lg bg-[#039B96] p-3 text-white text-sm w-full">
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
    <div className="mt-2 md:mt-0">
      <div className="relative p-5">
        <div className="ml-8 mr-10 absolute top-0 left-0 right-0 h-[6px] bg-[#FAFBFD] z-0" />
        <ul className="flex justify-between list-none p-0 m-0">
          {items.map(({ id, label }) => {
            const active = id === step, completed = id < step
            return (
              <li key={id} className="relative flex flex-col items-center">
                <span className={[
                  'absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 border-8 rounded-full flex items-center justify-center',
                  completed ? 'border-[#039B96] bg-[#039B96]' : active ? 'border-[#F9703D] bg-white' : 'border-slate-100 bg-slate-300',
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

function Section({ title, subtitle, toggle, children }: {
  title: string; subtitle?: string; toggle?: React.ReactNode; children?: React.ReactNode
}) {
  return (
    <div className="border-l-4 border-l-[#039B96] border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-base font-semibold">{title}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {toggle && <div className="shrink-0 mt-0.5">{toggle}</div>}
      </div>
      {children}
    </div>
  )
}

function EduBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2 rounded-md border-2 font-medium text-sm transition-all ${
        active ? 'border-[#039B96] bg-[#039B96]/10 text-[#039B96]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}>
      {label}
    </button>
  )
}

function ChevRight() {
  return <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
}
function ChevLeft() {
  return <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
}

// ─── Max Loader — fills parent (position:absolute), hiding ALL content behind ─
function MaxLoader({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#FAFBFD]">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-3xl font-bold mb-5">
          M
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Max is bezig...</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#039B96] animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function NudgeBox({ condition, tab }: { condition: string; tab: string }) {
  if (condition === 'baseline' || tab !== 'les') return null
  if (condition === 'nudge_accuracy') return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex gap-3">
      <span className="text-blue-500 text-lg shrink-0">🔍</span>
      <div>
        <p className="text-sm font-semibold text-blue-900">Controleer de inhoud nauwkeurig</p>
        <p className="text-sm text-blue-700">AI-gegenereerde tekst kan fouten bevatten. Lees de inhoud zorgvuldig door.</p>
      </div>
    </div>
  )
  if (condition === 'nudge_trust') return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex gap-3">
      <span className="text-green-500 text-lg shrink-0">✅</span>
      <div>
        <p className="text-sm font-semibold text-green-900">Kwaliteitsgecontroleerde inhoud</p>
        <p className="text-sm text-green-700">Deze les is gegenereerd met geavanceerde AI en doorloopt een kwaliteitscheck.</p>
      </div>
    </div>
  )
  return null
}

function ChatPanel({ lesdoel, message }: { lesdoel: string; message?: string }) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-2/5 p-6 bg-white overflow-y-auto gap-4">
      <LesdoelCard lesdoel={lesdoel} />
      <div className="flex-1 border border-gray-200 rounded-lg bg-white flex flex-col overflow-hidden min-h-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
          <span className="text-sm font-medium">Max</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] shrink-0 flex items-center justify-center text-white text-[10px] font-bold">M</div>
            <div className="bg-[#FAFBFD] rounded-xl rounded-bl-none px-4 py-3 text-sm text-gray-700 max-w-[85%]">
              {message || 'Hoi, ik ben Max, je AI-assistent.'}
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2">
          <input readOnly placeholder="Stel Max een vraag..."
            className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-2 bg-[#FAFBFD] focus:outline-none" />
          <button className="w-9 h-9 rounded-full bg-[#FAFBFD] border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function ExperimentPage() {
  const [appStep, setAppStep]           = useState<AppStep>('details')
  // Top-level tab: details | authoring (like original Lesdetails / Auteursomgeving)
  const [topTab, setTopTab]             = useState<'details' | 'authoring'>('details')
  // Inner authoring step
  const [activeTab, setActiveTab]       = useState<AuthoringTab>('lesplan')

  // LesDetails
  const [educatieNiveau, setEducatieNiveau]                   = useState('')
  const [educatieSpecifiekNiveau, setEducatieSpecifiekNiveau] = useState('')
  const [educatieSpecifiekeRichting, setEducatieSpecifiekeRichting] = useState('')
  const [customEducation, setCustomEducation]                 = useState('')
  const [customSubLevel, setCustomSubLevel]                   = useState('')
  const [onderwerp, setOnderwerp]                             = useState('')
  const [lesdoel, setLesdoel]                                 = useState('')
  const [showLesdoelInput, setShowLesdoelInput]               = useState(false)
  const [lesdoelLoading, setLesdoelLoading]                   = useState(false)
  const [referentieNiveau, setReferentieNiveau]               = useState('B1')
  const [kwalificatieEnabled, setKwalificatieEnabled]         = useState(false)
  const [educationStandards, setEducationStandards]           = useState<{ id: string; description: string; subject: string; expanded: boolean }[]>([])
  const [taxonomieEnabled, setTaxonomieEnabled]               = useState(false)
  const [selectedTaxonomie, setSelectedTaxonomie]             = useState('')
  const [selectedTaxNiveau, setSelectedTaxNiveau]             = useState('')
  const [detailsTab, setDetailsTab]                           = useState<'basis' | 'materiaal' | 'taal'>('basis')

  // Lesplan
  const [lesduur, setLesduur]           = useState<number | undefined>()
  const VERWERKING                      = 'Schrijf een samenvatting van de les in maximaal 150 woorden.'

  // Lesoverzicht
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

  // Les
  const [lesText, setLesText]     = useState(EXPERIMENT_TEXT)
  const [lesLoaded, setLesLoaded] = useState(false)

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

  const mainLevel    = EDU_LEVELS.find(l => l.id === educatieNiveau)
  const subLevel     = mainLevel?.subLevels?.find((s: any) => s.id === educatieSpecifiekNiveau) as any
  const subSubLevel  = subLevel?.subSubLevels?.find((s: any) => s.id === educatieSpecifiekeRichting)
  const doelgroepStr = educatieNiveau === 'Anders' ? (customEducation || 'Anders')
    : [mainLevel?.label, subLevel?.label, subSubLevel?.label].filter(Boolean).join(' - ')

  const wordCount      = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const isDetailsValid = !!educatieNiveau && wordCount >= 3 && lesdoel.trim().length > 0

  const handleSaveDetails = () => {
    if (!isDetailsValid) return
    setTopTab('authoring')
    setAppStep('authoring')
  }

  // Lesdoel: 2s fake thinking time
  const handleGenerateLesdoel = () => {
    if (wordCount < 3) return
    setLesdoelLoading(true)
    setLesdoel('')
    setShowLesdoelInput(false)
    setTimeout(() => {
      setLesdoel(LESSON_LESDOEL)
      setShowLesdoelInput(true)
      setLesdoelLoading(false)
    }, 2000)
  }

  const handleDeelMetCollega = async () => {
    setSubmitting(true); setSubmitError(null)
    const { corrected, uncorrected } = countCorrectedErrors(lesText, ERRORS)
    const lev = levenshtein(lesText, BASELINE_TEXT)
    try {
      const res = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
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
      setSubmitError('Er is iets misgegaan. Probeer het opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  if (appStep === 'completed') return <CompletionScreen />

  const activeLesdoel   = lesdoel || LESSON_LESDOEL
  const detailsComplete = isDetailsValid

  return (
    <div className="min-h-screen bg-[#FAFBFD]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar — logo only */}
        <aside className="hidden md:flex flex-col w-16 bg-white border-r border-gray-100 pt-5 items-center shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center text-white font-bold text-sm">M</div>
        </aside>

        <main className="flex-1 overflow-hidden flex flex-col">

          {/* ── Top navigation: Lesdetails | Auteursomgeving ── */}
          <div className="bg-white border-b border-gray-200 px-4 flex items-end shrink-0">
            <button onClick={() => setTopTab('details')}
              className={`px-6 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                topTab === 'details' ? 'border-[#039B96] bg-white text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              Lesdetails
            </button>

            <div className="relative group">
              <button onClick={() => { if (detailsComplete) setTopTab('authoring') }}
                disabled={!detailsComplete}
                className={`px-6 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-all disabled:cursor-not-allowed ${
                  topTab === 'authoring'
                    ? 'border-[#039B96] bg-white text-gray-900'
                    : detailsComplete
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      : 'border-transparent text-gray-400 opacity-50'
                }`}>
                Auteursomgeving
              </button>
              {!detailsComplete && (
                <div className="absolute left-0 top-full mt-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  Vul eerst de lesdetails in
                </div>
              )}
            </div>
          </div>

          {/* ── Content area ── */}
          <div className="flex-1 overflow-hidden relative">

            {topTab === 'details' && (
              <LesDetailsTab
                educatieNiveau={educatieNiveau} setEducatieNiveau={setEducatieNiveau}
                educatieSpecifiekNiveau={educatieSpecifiekNiveau} setEducatieSpecifiekNiveau={setEducatieSpecifiekNiveau}
                educatieSpecifiekeRichting={educatieSpecifiekeRichting} setEducatieSpecifiekeRichting={setEducatieSpecifiekeRichting}
                customEducation={customEducation} setCustomEducation={setCustomEducation}
                customSubLevel={customSubLevel} setCustomSubLevel={setCustomSubLevel}
                onderwerp={onderwerp} setOnderwerp={setOnderwerp}
                lesdoel={lesdoel} setLesdoel={setLesdoel}
                showLesdoelInput={showLesdoelInput} setShowLesdoelInput={setShowLesdoelInput}
                lesdoelLoading={lesdoelLoading} onGenerateLesdoel={handleGenerateLesdoel}
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

            {topTab === 'authoring' && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Inner sub-tabs */}
                <div className="bg-white border-b border-gray-100 px-4 flex gap-0 shrink-0">
                  {(['lesplan', 'lesoverzicht', 'les', 'voorvertoning'] as AuthoringTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 text-xs font-medium border-b-2 transition-all ${
                        activeTab === tab ? 'border-[#F9703D] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-hidden relative">
                  {activeTab === 'lesplan' && (
                    <LesplanTab lesduur={lesduur} setLesduur={setLesduur}
                      verwerkingOpdracht={VERWERKING} lesdoel={activeLesdoel}
                      onNext={() => setActiveTab('lesoverzicht')} />
                  )}
                  {activeTab === 'lesoverzicht' && (
                    <LesoverzichtTab
                      lessonOutline={lessonOutline} setLessonOutline={setLessonOutline}
                      lesdoel={activeLesdoel}
                      loaded={lesoverzichtLoaded} setLoaded={setLesoverzichtLoaded}
                      onPrev={() => setActiveTab('lesplan')}
                      onNext={() => setActiveTab('les')} />
                  )}
                  {activeTab === 'les' && (
                    <LesTab lesText={lesText} setLesText={setLesText}
                      lessonOutline={lessonOutline} lesdoel={activeLesdoel} condition={condition}
                      loaded={lesLoaded} setLoaded={setLesLoaded}
                      onPrev={() => setActiveTab('lesoverzicht')}
                      onNext={() => setActiveTab('voorvertoning')} />
                  )}
                  {activeTab === 'voorvertoning' && (
                    <VoorvertoningTab lesText={lesText} lesdoel={activeLesdoel} condition={condition}
                      onPrev={() => setActiveTab('les')}
                      onShare={() => { setShareTab('students'); setShareModalOpen(true) }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {shareModalOpen && (
        <ShareModal tab={shareTab} setTab={setShareTab}
          onClose={() => setShareModalOpen(false)}
          onDeelMetCollega={handleDeelMetCollega}
          onLesOpSlot={() => { setShareModalOpen(false); setAppStep('completed') }}
          submitting={submitting} error={submitError} lesText={lesText} />
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
  showLesdoelInput, setShowLesdoelInput, lesdoelLoading, onGenerateLesdoel,
  referentieNiveau, setReferentieNiveau, kwalificatieEnabled, setKwalificatieEnabled,
  educationStandards, setEducationStandards, taxonomieEnabled, setTaxonomieEnabled,
  selectedTaxonomie, setSelectedTaxonomie, selectedTaxNiveau, setSelectedTaxNiveau,
  detailsTab, setDetailsTab, doelgroepStr, isValid, onSave }: any) {

  const wordCount    = onderwerp.trim().split(/\s+/).filter(Boolean).length
  const progress     = [!!educatieNiveau, wordCount >= 3, lesdoel.trim().length > 0].filter(Boolean).length
  const mainLevel    = EDU_LEVELS.find(l => l.id === educatieNiveau)
  const subLevels    = mainLevel?.subLevels || []
  const subLevel     = subLevels.find((s: any) => s.id === educatieSpecifiekNiveau) as any
  const subSubLevels = (subLevel as any)?.subSubLevels || []

  const handleAddStandard = () =>
    setEducationStandards((prev: any[]) => [...prev, { id: Date.now().toString(), description: '', subject: '', expanded: true }])
  const removeStandard = (id: string) =>
    setEducationStandards((prev: any[]) => prev.filter((s: any) => s.id !== id))
  const updateStandard = (id: string, field: string, val: string) =>
    setEducationStandards((prev: any[]) => prev.map((s: any) => s.id === id ? { ...s, [field]: val } : s))
  const toggleExpand = (id: string) =>
    setEducationStandards((prev: any[]) => prev.map((s: any) => s.id === id ? { ...s, expanded: !s.expanded } : s))

  const completionText = !educatieNiveau ? 'Selecteer de doelgroep'
    : wordCount < 3 ? 'Vul het onderwerp in (minimaal 3 woorden)'
    : !lesdoel.trim() ? 'Vul het lesdoel in'
    : 'Alle basisinformatie is ingevuld ✓'

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-6 md:p-10 pb-32">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-[#039B96] mb-1">Lesdetails</h2>
          <p className="text-sm text-gray-500">Vul de basisinformatie in om je les te maken</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
          <div className="bg-[#039B96] h-1.5 rounded-full transition-all duration-300" style={{ width: `${(progress / 3) * 100}%` }} />
        </div>
        <div className="flex border-b border-gray-200 mb-6">
          {(['basis', 'materiaal', 'taal'] as const).map(tab => (
            <button key={tab} onClick={() => setDetailsTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${detailsTab === tab ? 'text-[#039B96] border-b-2 border-[#039B96]' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab === 'basis' ? 'Basisinformatie' : tab === 'materiaal' ? 'Bronmateriaal' : 'Taalinstellingen'}
            </button>
          ))}
        </div>

        {detailsTab === 'basis' && (
          <div className="space-y-6">
            {/* Voor wie */}
            <Section title="Voor wie is deze les?">
              <div className="grid grid-cols-5 gap-2 mt-3">
                {EDU_LEVELS.map(level => (
                  <EduBtn key={level.id} label={level.label} active={educatieNiveau === level.id}
                    onClick={() => { setEducatieNiveau(level.id); setEducatieSpecifiekNiveau(''); setEducatieSpecifiekeRichting('') }} />
                ))}
              </div>
              {educatieNiveau && educatieNiveau !== 'Anders' && subLevels.length > 0 && (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specifiek niveau</label>
                  <div className="flex flex-wrap gap-2">
                    {subLevels.map((sub: any) => (
                      <EduBtn key={sub.id} label={sub.label} active={educatieSpecifiekNiveau === sub.id}
                        onClick={() => { setEducatieSpecifiekNiveau(sub.id); setEducatieSpecifiekeRichting(''); setCustomSubLevel('') }} />
                    ))}
                  </div>
                  {educatieSpecifiekNiveau === 'anders' && (
                    <input type="text" value={customSubLevel} onChange={e => setCustomSubLevel(e.target.value)}
                      placeholder="Beschrijf het niveau..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                  )}
                </div>
              )}
              {educatieSpecifiekNiveau && educatieSpecifiekNiveau !== 'anders' && subSubLevels.length > 0 && (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specifieke richting</label>
                  <div className="flex flex-wrap gap-2">
                    {subSubLevels.map((sub: any) => (
                      <EduBtn key={sub.id} label={sub.label} active={educatieSpecifiekeRichting === sub.id}
                        onClick={() => setEducatieSpecifiekeRichting(sub.id)} />
                    ))}
                  </div>
                </div>
              )}
              {educatieNiveau === 'Anders' && (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Specificeer doelgroep</label>
                  <input type="text" value={customEducation} onChange={e => setCustomEducation(e.target.value)}
                    placeholder="bijv. Volwassenenonderwijs, Bedrijfstraining..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                </div>
              )}
              {doelgroepStr && <p className="text-xs text-[#039B96] font-medium mt-2">✓ Doelgroep: {doelgroepStr}</p>}
            </Section>

            {/* Onderwerp */}
            <Section title="Waar gaat de les over?">
              <input type="text" value={onderwerp} onChange={e => setOnderwerp(e.target.value)}
                placeholder="bijv. het herkennen van stijlfiguren in poëzie, snelheid, afstand en tijd berekenen"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] mt-3" />
              {onderwerp.trim().length > 0 && wordCount < 3 && <p className="text-xs text-red-500 mt-1">Vul minimaal 3 woorden in</p>}
              {wordCount >= 3 && <p className="text-xs text-green-600 mt-1">✓ Onderwerp ingevuld</p>}
            </Section>

            {/* Kwalificatie-eisen */}
            <Section title="Kwalificatie-eisen"
              subtitle="Officiële eindtermen of exameneisen uit syllabi, examenprogramma's of andere kwalificatiedocumenten."
              toggle={<Toggle checked={kwalificatieEnabled} onChange={setKwalificatieEnabled} />}>
              {kwalificatieEnabled && (
                <>
                  <Btn variant="default" className="w-full mt-3" onClick={handleAddStandard}>
                    + Kwalificatie-eis toevoegen
                  </Btn>
                  {educationStandards.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-gray-700">Nog geen kwalificatie-eisen toegevoegd.</p>
                    </div>
                  )}
                  <div className="space-y-3 mt-3">
                    {educationStandards.map((std: any) => (
                      <div key={std.id} className="border border-gray-200 border-l-4 border-l-[#039B96] rounded-lg overflow-hidden">
                        <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(std.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{std.subject || 'Kwalificatie-eis'}</div>
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{std.description || 'Nog geen beschrijving'}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span onClick={e => { e.stopPropagation(); removeStandard(std.id) }}>
                              <Btn variant="secondary" className="h-8 px-3 text-xs text-red-600">Verwijderen</Btn>
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${std.expanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </div>
                        </div>
                        {std.expanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Exacte kwalificatie-eis</label>
                              <textarea value={std.description} onChange={e => updateStandard(std.id, 'description', e.target.value)}
                                placeholder="Beschrijf exact wat deze kwalificatie-eis inhoudt."
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] min-h-[80px]" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Vak / opleiding / domein (optioneel)</label>
                              <input type="text" value={std.subject} onChange={e => updateStandard(std.id, 'subject', e.target.value)}
                                placeholder="bijv. Nederlands, Zorg & Welzijn, MBO Verpleegkunde"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Section>

            {/* Leertaxonomie */}
            <Section title="Leertaxonomie" subtitle="Welke leertaxonomie en welk niveau wil je gebruiken als ontwerpkader?"
              toggle={<Toggle checked={taxonomieEnabled} onChange={setTaxonomieEnabled} />}>
              {taxonomieEnabled && (
                <div className="space-y-4 mt-3">
                  {TAXONOMIES.map(tax => (
                    <div key={tax.label}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{tax.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {tax.levels.map(lvl => (
                          <EduBtn key={lvl} label={lvl}
                            active={selectedTaxNiveau === lvl && selectedTaxonomie === tax.label}
                            onClick={() => { setSelectedTaxonomie(tax.label); setSelectedTaxNiveau(lvl) }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Lesdoel */}
            <Section title="Wat moeten leerlingen kunnen na de les?">
              {/* Inline thinking indicator */}
              {lesdoelLoading && (
                <div className="flex items-center gap-3 py-3 px-4 bg-[#FAFBFD] rounded-lg border border-gray-200 mt-3 mb-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#039B96] animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">Max is aan het nadenken...</span>
                </div>
              )}
              <div className="flex gap-3 mt-3">
                <Btn variant="primary" className="flex-1" disabled={wordCount < 3 || lesdoelLoading}
                  onClick={onGenerateLesdoel}>
                  {lesdoelLoading ? 'Bezig...' : 'Laat AI een lesdoel maken'}
                </Btn>
                <Btn variant="secondary" className="flex-1" onClick={() => setShowLesdoelInput(true)}>
                  Zelf invullen
                </Btn>
              </div>
              {wordCount < 3 && <p className="text-xs text-gray-400 mt-2">Vul eerst het onderwerp in (minimaal 3 woorden).</p>}
              {(showLesdoelInput || lesdoel) && !lesdoelLoading && (
                <div className="space-y-1 mt-3">
                  <textarea value={lesdoel} onChange={e => setLesdoel(e.target.value.slice(0, 1000))}
                    placeholder="bijv. Leerlingen kunnen de factoren die fotosynthese beïnvloeden uitleggen..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] min-h-[80px]" />
                  {lesdoel.trim().length > 0 && <p className="text-xs text-green-600">✓ Lesdoel ingevuld</p>}
                </div>
              )}
            </Section>
          </div>
        )}

        {detailsTab === 'materiaal' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">Voeg een feitenkader toe; Max toetst erop dat gegenereerd lesmateriaal niet conflicteert met de inhoud die hier staat.</p>
            </div>
            <Btn variant="default" className="w-full">+ Feitenkader toevoegen</Btn>
          </div>
        )}

        {detailsTab === 'taal' && (
          <Section title="Op welk taalniveau?">
            <div className="grid grid-cols-4 gap-2 mt-3 mb-2">
              {['1F','2F','3F','4F'].map(n => <EduBtn key={n} label={n} active={referentieNiveau === n} onClick={() => setReferentieNiveau(n)} />)}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {['A1','A2','B1','B2','C1','C2'].map(n => <EduBtn key={n} label={n} active={referentieNiveau === n} onClick={() => setReferentieNiveau(n)} />)}
            </div>
          </Section>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
          <div className="text-sm text-gray-600">{completionText}</div>
          <Btn variant="default" onClick={onSave} disabled={!isValid}>Opslaan</Btn>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-2/5 p-6 bg-white overflow-y-auto gap-4">
        <LesdoelCard lesdoel={lesdoel} />
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
function LesplanTab({ lesduur, setLesduur, verwerkingOpdracht, lesdoel, onNext }: any) {
  const canNext = lesduur !== undefined && lesduur >= 10 && lesduur <= 300
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-6 md:p-10 pb-32">
        <MetroLine step={1} />
        <div className="space-y-6">
          <Section title="Verwerkingsopdracht" subtitle="Kies een opdracht voor deze fase">
            <div className="border-2 border-[#039B96] bg-[#039B96]/5 rounded-lg px-4 py-3 flex items-center gap-3 mt-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#039B96] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#039B96]" />
              </div>
              <p className="text-sm text-gray-700">{verwerkingOpdracht}</p>
            </div>
          </Section>
          <Section title="Lesduur" subtitle="Hoe lang duurt de les? (in minuten)">
            <input type="number" value={lesduur ?? ''} min={10} max={300}
              onChange={e => { const v = e.target.value; if (v === '') { setLesduur(undefined); return }; const n = parseInt(v, 10); if (!isNaN(n)) setLesduur(n) }}
              placeholder="bijv. 45"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] mt-3" />
            {lesduur !== undefined && (lesduur < 10 || lesduur > 300) && <p className="text-xs text-red-500 mt-1">Tussen 10 en 300 minuten</p>}
          </Section>
        </div>
        <div className="flex justify-end mt-8">
          <Btn variant="default" onClick={onNext} disabled={!canNext}>Volgende <ChevRight /></Btn>
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

function LesoverzichtTab({ lessonOutline, setLessonOutline, lesdoel, loaded, setLoaded, onPrev, onNext }: any) {
  useEffect(() => {
    if (!loaded) { const t = setTimeout(() => setLoaded(true), 15000); return () => clearTimeout(t) }
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
    <div className="flex h-full overflow-hidden relative">
      {/* Loader covers the entire pane */}
      <MaxLoader visible={!loaded} message="Max maakt de lesstructuur voor je. Pak vast een kopje koffie! ☕" />

      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-6 md:p-10 pb-32">
        <MetroLine step={2} />
        <h1 className="text-3xl font-bold mb-1">Lesoverzicht</h1>
        <p className="text-sm text-gray-500 mb-6">Bepaal de opbouw van je les door de onderwerpen per fase te ordenen.</p>
        <div className="space-y-5">
          {(Object.keys(PHASE_TITLES) as OutlinePhase[]).map(phase => {
            const { active, topics } = lessonOutline[phase]
            return (
              <div key={phase} className={`rounded-lg border-2 ${active ? 'border-gray-900' : 'border-gray-200 bg-gray-50/50'}`}>
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-lg font-semibold ${!active ? 'text-gray-400' : ''}`}>{PHASE_TITLES[phase]}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{PHASE_DESCS[phase]}</p>
                  </div>
                  <div className="flex rounded-md bg-gray-100 p-0.5 shrink-0">
                    <button onClick={() => !active && toggle(phase)}
                      className={`rounded px-3 py-1.5 text-sm transition-colors ${active ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>Gebruiken</button>
                    <button onClick={() => active && toggle(phase)}
                      className={`rounded px-3 py-1.5 text-sm transition-colors ${!active ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>Niet gebruiken</button>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  {active ? (
                    <div className="space-y-2">
                      {topics.map((topic: any, idx: number) => (
                        <div key={topic.id} className="rounded-xl border border-input bg-gray-50 p-3 flex items-center gap-2">
                          <input defaultValue={topic.title} onBlur={e => updateTopic(phase, topic.id, e.target.value)}
                            className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#039B96]" />
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
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
        <div className="flex justify-between mt-8">
          <Btn variant="outline" onClick={onPrev}><ChevLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext} disabled={!hasActive}>Volgende <ChevRight /></Btn>
        </div>
      </div>
      <ChatPanel lesdoel={lesdoel} message="Ik heb de lesstructuur gegenereerd. Je kunt fasen in- of uitschakelen en onderwerpen aanpassen." />
    </div>
  )
}

// ─── Les Tab — phase cards like original step3 ────────────────────────────────
const PHASE_META: Record<OutlinePhase, { title: string; desc: string }> = {
  introductie: { title: 'Introductie', desc: 'Activeer voorkennis en introduceer het onderwerp van de les.' },
  instructie:  { title: 'Instructie',  desc: 'Leg de lesstof uit en demonstreer nieuwe kennis en vaardigheden.' },
  verwerking:  { title: 'Verwerking',  desc: 'Laat leerlingen actief aan de slag gaan met de lesstof.' },
  afronding:   { title: 'Afronding',   desc: 'Evalueer het leerproces en rond de les af.' },
}

/** Fake tiptap-style toolbar matching original screenshot */
function EditorToolbar() {
  const TBtn = ({ label, icon, bold, italic, strike, mono, active }: {
    label?: string; icon?: React.ReactNode
    bold?: boolean; italic?: boolean; strike?: boolean; mono?: boolean; active?: boolean
  }) => (
    <button type="button"
      className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors hover:bg-gray-100 ${active ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
      {icon || <span className={`text-xs leading-none ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''} ${strike ? 'line-through' : ''} ${mono ? 'font-mono' : ''}`}>{label}</span>}
    </button>
  )
  const ico = (d: string) => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} /></svg>
  return (
    <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-gray-100 bg-white">
      {/* AI sparkle */}
      <button className="w-7 h-7 rounded-md bg-gradient-to-r from-[#E13AA1] to-[#F63] flex items-center justify-center mr-1">
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
      </button>
      <TBtn label="Σ" mono />
      <TBtn label="B" bold /><TBtn label="I" italic /><TBtn label="S" strike /><TBtn label="T" />
      <TBtn label="H1" active /><TBtn label="H₂" /><TBtn label="H₃" />
      <TBtn icon={ico('M4 6h16M4 12h8M4 18h16')} />
      <TBtn icon={ico('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')} />
      <TBtn icon={ico('M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1')} />
      <TBtn icon={ico('M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z')} />
      <TBtn icon={ico('M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6')} />
      <TBtn icon={ico('M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6')} />
      <TBtn icon={ico('M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01')} />
      <TBtn icon={ico('M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z')} />
    </div>
  )
}

/** Single text block element — matches original "Alleen tekst" card with tiptap toolbar */
function TextBlock({ content, onUpdate }: { content: string; onUpdate: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(content)
  return (
    <div className="rounded-xl border border-input bg-gray-50 overflow-hidden">
      {/* "Alleen tekst" header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <button className="flex items-center gap-1.5 text-xs text-gray-600 font-medium bg-white border border-gray-200 rounded-md px-2.5 py-1.5 hover:bg-gray-50">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" /></svg>
          Alleen tekst
        </button>
        <button className="text-gray-400 hover:text-gray-600 p-1" title="Bijlage toevoegen">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
      </div>
      {/* Tiptap-style toolbar */}
      <EditorToolbar />
      {/* Content */}
      <div className="p-5 bg-white">
        {editing ? (
          <textarea value={val} onChange={e => setVal(e.target.value)}
            onBlur={() => { setEditing(false); onUpdate(val) }}
            autoFocus
            className="w-full text-sm text-gray-800 min-h-[80px] resize-none focus:outline-none bg-transparent border-0 p-0 leading-relaxed" />
        ) : (
          <div onClick={() => setEditing(true)}
            className="text-sm text-gray-800 cursor-text min-h-[60px] whitespace-pre-wrap leading-relaxed">
            {val || <span className="text-gray-400 italic">Klik om te bewerken...</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/** Phase card — matches original Card: bold title, description, collapse chevron */
function PhaseCard({ phase, blocks, onUpdate, visible, onToggle }: {
  phase: OutlinePhase; blocks: string[]; onUpdate: (b: string[]) => void; visible: boolean; onToggle: () => void
}) {
  const meta = PHASE_META[phase]
  return (
    <div className={`rounded-xl border-2 overflow-hidden bg-white ${visible ? 'border-primary' : 'border-gray-200'}`}
      style={{ borderColor: visible ? undefined : undefined }}>
      {/* Clickable header — like original CardHeader */}
      <div
        className="flex items-start justify-between px-6 py-5 cursor-pointer hover:bg-gray-50/50 transition-colors relative pr-14"
        onClick={onToggle}>
        <div>
          <h2 className="text-xl font-semibold leading-none tracking-tight">{meta.title}</h2>
          <p className="text-sm text-muted-foreground mt-1.5">{meta.desc}</p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500">
          {visible
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
        </div>
      </div>
      {/* Content — only when expanded */}
      {visible && (
        <div className="px-6 pb-6 space-y-4">
          {blocks.map((block, i) => (
            <TextBlock key={i} content={block}
              onUpdate={v => { const nb = [...blocks]; nb[i] = v; onUpdate(nb) }} />
          ))}
        </div>
      )}
    </div>
  )
}

function buildPhaseBlocks(text: string, outline: any): Record<OutlinePhase, string[]> {
  const all    = text.split('\n\n').filter(b => b.trim().length > 0)
  const phases: OutlinePhase[] = ['introductie', 'instructie', 'verwerking', 'afronding']
  const active = phases.filter(p => outline[p].active)
  const result: Record<OutlinePhase, string[]> = { introductie: [], instructie: [], verwerking: [], afronding: [] }
  if (!active.length || !all.length) return result
  const per = Math.ceil(all.length / active.length)
  active.forEach((phase, i) => { result[phase] = all.slice(i * per, (i + 1) * per) })
  return result
}

function LesTab({ lesText, setLesText, lessonOutline, lesdoel, condition, loaded, setLoaded, onPrev, onNext }: any) {
  useEffect(() => {
    if (!loaded) { const t = setTimeout(() => setLoaded(true), 20000); return () => clearTimeout(t) }
  }, [loaded, setLoaded])

  const phases: OutlinePhase[] = ['introductie', 'instructie', 'verwerking', 'afronding']
  const [phaseBlocks, setPhaseBlocks] = useState<Record<OutlinePhase, string[]>>(() => buildPhaseBlocks(lesText, lessonOutline))
  const [visiblePhases, setVisiblePhases] = useState<Set<OutlinePhase>>(new Set(phases.filter(p => lessonOutline[p].active)))

  const updatePhase = (phase: OutlinePhase, blocks: string[]) => {
    const next = { ...phaseBlocks, [phase]: blocks }
    setPhaseBlocks(next)
    setLesText(phases.flatMap(p => next[p]).join('\n\n'))
  }
  const togglePhase = (phase: OutlinePhase) => setVisiblePhases(prev => {
    const s = new Set(prev); if (s.has(phase)) s.delete(phase); else s.add(phase); return s
  })

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* MaxLoader hides everything */}
      <MaxLoader visible={!loaded} message="Max genereert de volledige lesinhoud voor je. Pak vast een kopje koffie! ☕" />

      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-6 md:p-10 pb-32">
        <MetroLine step={3} />
        <div className="lg:hidden mb-4"><LesdoelCard lesdoel={lesdoel} /></div>
        <NudgeBox condition={condition} tab="les" />

        {/* Phase cards matching original step3 */}
        <div className="space-y-5">
          {phases.filter(p => lessonOutline[p].active).map(phase => (
            <PhaseCard key={phase} phase={phase}
              blocks={phaseBlocks[phase]}
              onUpdate={b => updatePhase(phase, b)}
              visible={visiblePhases.has(phase)}
              onToggle={() => togglePhase(phase)} />
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Btn variant="outline" onClick={onPrev}><ChevLeft /> Vorige</Btn>
          <Btn variant="default" onClick={onNext}>Volgende <ChevRight /></Btn>
        </div>
      </div>

      <ChatPanel lesdoel={lesdoel} message="Ik heb de lesinhoud gegenereerd. Klik op een fase om deze te openen en te bewerken. Controleer de inhoud goed!" />
    </div>
  )
}

// ─── Voorvertoning ────────────────────────────────────────────────────────────
function renderMd(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []; let k = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) { nodes.push(<div key={k++} className="h-2" />); continue }
    const raw = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    if (line.startsWith('## '))  { nodes.push(<h2 key={k++} className="text-2xl font-bold text-gray-900 mt-8 mb-3 first:mt-0">{line.slice(3)}</h2>); continue }
    if (line.startsWith('### ')) { nodes.push(<h3 key={k++} className="text-lg font-semibold text-gray-800 mt-5 mb-2">{line.slice(4)}</h3>); continue }
    if (line.match(/^\d+\. /)) { nodes.push(<li key={k++} className="ml-6 list-decimal text-base text-gray-700 mb-1.5" dangerouslySetInnerHTML={{ __html: raw.replace(/^\d+\. /, '') }} />); continue }
    if (line.startsWith('- '))  { nodes.push(<li key={k++} className="ml-6 list-disc text-base text-gray-700 mb-1.5" dangerouslySetInnerHTML={{ __html: raw.slice(2) }} />); continue }
    nodes.push(<p key={k++} className="text-base text-gray-700 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: raw }} />)
  }
  return nodes
}

function VoorvertoningTab({ lesText, lesdoel, condition, onPrev, onShare }: any) {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full lg:w-3/5 border-r bg-white overflow-y-auto p-6 md:p-10 pb-32">
        <MetroLine step={4} />
        <div className="lg:hidden mb-6"><LesdoelCard lesdoel={lesdoel} /></div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Voorvertoning</h1>
          <Btn variant="primary" onClick={onShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Deel deze les
          </Btn>
        </div>
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
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput]   = useState<'lezer' | 'bewerker'>('lezer')
  const [invites, setInvites]       = useState<Invite[]>([])
  const [emailError, setEmailError] = useState('')

  const addInvite = () => {
    if (!emailInput.trim()) { setEmailError('Vul een e-mailadres in'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) { setEmailError('Ongeldig e-mailadres'); return }
    setInvites(prev => [...prev, { email: emailInput.trim(), role: roleInput }])
    setEmailInput(''); setEmailError('')
  }

  const handlePDF = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const content = lesText.replace(/\*\*/g, '').replace(/## /g, '\n\n').replace(/### /g, '\n').replace(/^- /gm, '• ')
    w.document.write(`<html><head><title>Les</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.7}h1,h2{color:#039B96}@media print{body{margin:0}}</style></head><body><pre style="font-family:inherit;white-space:pre-wrap">${content}</pre></body></html>`)
    w.document.close(); setTimeout(() => { w.focus(); w.print() }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Kies een deelmethode</h2>
          <div className="flex w-full mb-5">
            <button onClick={() => setTab('students')} className={`flex-1 py-2 text-sm font-medium rounded-l-md transition-colors ${tab === 'students' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Deel met doelgroep</button>
            <button onClick={() => setTab('colleagues')} className={`flex-1 py-2 text-sm font-medium rounded-r-md transition-colors ${tab === 'colleagues' ? 'bg-[#F71E63] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Deel met collega&apos;s</button>
          </div>

          {tab === 'students' && (
            <div className="space-y-4 text-sm text-gray-700">
              <p>Selecteer hoe je de les wilt delen met je leerlingen.</p>
              <div>
                <p className="font-bold mb-1">PDF download</p>
                <p className="text-gray-500 mb-2">Deel als downloadbaar PDF bestand</p>
                <Btn variant="default" className="w-full" onClick={handlePDF}>
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
              <div className="flex justify-end"><Btn variant="secondary" onClick={onClose}>Annuleren</Btn></div>
            </div>
          )}

          {tab === 'colleagues' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Deel de les met je collega&apos;s.</p>
              <div className="flex gap-2 mb-2 items-start">
                <div className="flex-1">
                  <input type="email" value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') addInvite() }}
                    placeholder="E-mailadres"
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#039B96] ${emailError ? 'border-red-400' : 'border-gray-300'}`} />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>
                <select value={roleInput} onChange={e => setRoleInput(e.target.value as 'lezer' | 'bewerker')}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white h-10 focus:outline-none focus:ring-2 focus:ring-[#039B96]">
                  <option value="lezer">Lezer</option>
                  <option value="bewerker">Bewerker</option>
                </select>
                <Btn variant="default" onClick={addInvite}>Toevoegen</Btn>
              </div>
              {invites.length > 0 && (
                <div className="space-y-2 mb-4 mt-2">
                  {invites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                      <div className="w-7 h-7 rounded-full bg-[#039B96]/20 flex items-center justify-center text-[#039B96] text-xs font-bold shrink-0">{inv.email[0].toUpperCase()}</div>
                      <span className="text-sm flex-1 truncate">{inv.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.role === 'bewerker' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{inv.role === 'bewerker' ? 'Bewerker' : 'Lezer'}</span>
                      <button onClick={() => setInvites(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {invites.length === 0 && <p className="text-sm text-gray-400 mb-4">Voeg collega&apos;s toe om deze les met hen te delen.</p>}
              {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">{error}</div>}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn variant="primary" onClick={onDeelMetCollega} disabled={submitting}>
                  {submitting
                    ? <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 6.477 12 12h-4z"/></svg>
                    : <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  Delen met collega&apos;s
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
