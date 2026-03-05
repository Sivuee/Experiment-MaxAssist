"use client"

import { useState, useRef, useEffect } from "react"
import { submitToFormspree } from "@/lib/formspree"
import { LESDOEL_SUGGESTION, LESPLAN_INTRO, CHAT_RESPONSES, STEPS } from "@/lib/predetermined-responses"
import { v4 as uuidv4 } from "uuid"

// ─── Types ────────────────────────────────────────────────────────────────────
interface LessonForm {
  onderwerp: string
  doelgroep: string
  referentieNiveau: string
  lesdoel: string
  lesduur: number | ""
}

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

// ─── Brand colors (matching the real app) ─────────────────────────────────────
const TEAL = "#039B96"
const PINK = "#F71E63"

// ─── Small reusable components ────────────────────────────────────────────────
function MetroLine({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className="flex flex-col items-center gap-1"
            style={{ minWidth: 80 }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white transition-all"
              style={{
                background: step >= s.id ? TEAL : "#e5e7eb",
                color: step >= s.id ? "white" : "#9ca3af",
              }}
            >
              {step > s.id ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                s.id
              )}
            </div>
            <span className="text-xs text-gray-500 text-center hidden md:block">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="flex-1 h-0.5 transition-all"
              style={{ background: step > s.id ? TEAL : "#e5e7eb", minWidth: 20 }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
      style={{ focusBorderColor: TEAL } as React.CSSProperties}
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  fullWidth,
  size = "md",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "outline" | "ghost" | "danger"
  disabled?: boolean
  fullWidth?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" }
  const variants = {
    primary: "text-white",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "text-white bg-red-600 hover:bg-red-700",
  }
  const primaryStyle = variant === "primary" ? { background: TEAL } : {}

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? "w-full" : ""}`}
      style={primaryStyle}
    >
      {children}
    </button>
  )
}

// ─── Chat sidebar ─────────────────────────────────────────────────────────────
function ChatSidebar({
  messages,
  onSend,
  isTyping,
}: {
  messages: ChatMessage[]
  onSend: (msg: string) => void
  isTyping: boolean
}) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const send = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <div className="flex flex-col h-full border-l bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center gap-3">
        <img src="/max-button.svg" alt="Max" className="w-8 h-8" />
        <div>
          <p className="font-semibold text-sm text-gray-800">Max</p>
          <p className="text-xs text-gray-500">AI-assistent</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <img src="/max-button.svg" alt="Max" className="w-6 h-6 mr-2 mt-1 flex-shrink-0" />
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "text-white rounded-tr-none" : "bg-white border rounded-tl-none text-gray-800"
              }`}
              style={m.role === "user" ? { background: TEAL } : {}}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <img src="/max-button.svg" alt="Max" className="w-6 h-6 mr-2 mt-1 flex-shrink-0" />
            <div className="bg-white border rounded-2xl rounded-tl-none px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Stel een vraag aan Max…"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40"
          style={{ background: TEAL }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 2L2 7l5 2 2 5 5-12z" fill="white" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── STEP 1: Lesson details ───────────────────────────────────────────────────
function Step1Setup({
  form,
  setForm,
  onNext,
  chatMessages,
  onChatSend,
  isTyping,
  onGenerateLesdoel,
  isGeneratingLesdoel,
}: {
  form: LessonForm
  setForm: (f: LessonForm) => void
  onNext: () => void
  chatMessages: ChatMessage[]
  onChatSend: (msg: string) => void
  isTyping: boolean
  onGenerateLesdoel: () => void
  isGeneratingLesdoel: boolean
}) {
  const canNext = form.onderwerp.trim().split(/\s+/).filter(Boolean).length >= 3 && form.doelgroep.trim()

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-0">
      {/* Main form */}
      <div className="flex-1 overflow-y-auto p-8 pb-32 max-w-2xl">
        <MetroLine step={1} />
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Lesdetails
        </h1>
        <p className="text-gray-500 text-sm mb-8">Vul de basisinformatie in om je les op te bouwen.</p>

        <div className="space-y-5">
          <div>
            <Label>
              Onderwerp <span className="text-gray-400 text-xs">(minimaal 3 woorden)</span>
            </Label>
            <Input
              value={form.onderwerp}
              onChange={(v) => setForm({ ...form, onderwerp: v })}
              placeholder="Bijv. Klimaatverandering en de broeikaswerking"
            />
          </div>

          <div>
            <Label>Doelgroep</Label>
            <Input
              value={form.doelgroep}
              onChange={(v) => setForm({ ...form, doelgroep: v })}
              placeholder="Bijv. VMBO-t klas 3, MBO niveau 2"
            />
          </div>

          <div>
            <Label>Referentieniveau</Label>
            <select
              value={form.referentieNiveau}
              onChange={(e) => setForm({ ...form, referentieNiveau: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {["1F", "2F", "3F", "4F", "A1", "A2", "B1", "B2", "C1", "C2"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Lesduur (minuten)</Label>
            <Input
              type="number"
              value={form.lesduur}
              onChange={(v) => setForm({ ...form, lesduur: v === "" ? "" : Number(v) })}
              placeholder="45"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Lesdoel</Label>
              <button
                onClick={onGenerateLesdoel}
                disabled={isGeneratingLesdoel || !form.onderwerp.trim()}
                className="text-xs flex items-center gap-1 disabled:opacity-40"
                style={{ color: TEAL }}
              >
                {isGeneratingLesdoel ? (
                  <span className="animate-pulse">Max genereert…</span>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M6 1v2M6 9v2M1 6h2M9 6h2M2.5 2.5l1.4 1.4M8.1 8.1l1.4 1.4M2.5 9.5l1.4-1.4M8.1 3.9l1.4-1.4"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Genereer met Max
                  </>
                )}
              </button>
            </div>
            <Textarea
              value={form.lesdoel}
              onChange={(v) => setForm({ ...form, lesdoel: v })}
              placeholder="Beschrijf wat leerlingen aan het einde van de les moeten kunnen of weten…"
              rows={4}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={onNext} disabled={!canNext}>
            Volgende stap
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="hidden lg:flex w-80 flex-col border-l">
        <ChatSidebar messages={chatMessages} onSend={onChatSend} isTyping={isTyping} />
      </div>
    </div>
  )
}

// ─── STEP 2: Lesplan ─────────────────────────────────────────────────────────
function Step2Plan({
  form,
  onNext,
  onPrev,
  chatMessages,
  onChatSend,
  isTyping,
}: {
  form: LessonForm
  onNext: () => void
  onPrev: () => void
  chatMessages: ChatMessage[]
  onChatSend: (msg: string) => void
  isTyping: boolean
}) {
  // Parse LESPLAN_INTRO into phases for display
  const phases = [
    { title: "Introductie (10 min)", icon: "🚀", color: "#EFF9F9", border: TEAL },
    { title: "Instructie (15 min)", icon: "📚", color: "#FFF5F8", border: PINK },
    { title: "Verwerking (15 min)", icon: "🔧", color: "#FFF8EC", border: "#F9703D" },
    { title: "Afronding (5 min)", icon: "✅", color: "#F0FFF4", border: "#22c55e" },
  ]

  const descriptions = [
    "Activeer voorkennis met een korte poll: "Wat weet jij al over klimaat?" Bespreek de uitkomsten klassikaal.",
    "Leg de broeikaswerking uit aan de hand van een visueel model. Focus op CO₂ en methaan als belangrijkste broeikasgassen.",
    "Leerlingen werken in tweetallen aan een opdracht: rangschik vijf menselijke activiteiten op klimaatimpact en onderbouw de keuze.",
    "Plenaire nabespreking. Elke leerling schrijft één ding op dat ze vandaag nieuw hebben geleerd (exit ticket).",
  ]

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-0">
      <div className="flex-1 overflow-y-auto p-8 pb-32">
        <MetroLine step={2} />
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Lesplan
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Max heeft een lesplan gegenereerd op basis van jouw lesdetails.
        </p>
        {form.lesdoel && (
          <div
            className="text-sm rounded-lg p-3 mb-6 border-l-4"
            style={{ background: "#EFF9F9", borderLeftColor: TEAL }}
          >
            <span className="font-medium text-gray-700">Lesdoel: </span>
            <span className="text-gray-600">{form.lesdoel}</span>
          </div>
        )}

        <div className="space-y-4">
          {phases.map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-4 border-l-4"
              style={{ background: p.color, borderLeftColor: p.border }}
            >
              <p className="font-semibold text-sm mb-1">
                {p.icon} {p.title}
              </p>
              <p className="text-sm text-gray-600">{descriptions[i]}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Vorige stap
          </Button>
          <Button onClick={onNext}>
            Volgende stap
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex w-80 flex-col border-l">
        <ChatSidebar messages={chatMessages} onSend={onChatSend} isTyping={isTyping} />
      </div>
    </div>
  )
}

// ─── STEP 3: Content building ─────────────────────────────────────────────────
function Step3Content({
  form,
  onNext,
  onPrev,
  chatMessages,
  onChatSend,
  isTyping,
}: {
  form: LessonForm
  onNext: () => void
  onPrev: () => void
  chatMessages: ChatMessage[]
  onChatSend: (msg: string) => void
  isTyping: boolean
}) {
  const elements = [
    {
      phase: "Introductie",
      type: "Tekst",
      preview:
        "Kijk om je heen: wat zie jij in jouw dagelijks leven dat te maken heeft met klimaat? Denk aan het weer, vervoer, eten en energie.",
    },
    {
      phase: "Instructie",
      type: "Tekst",
      preview:
        "De aarde wordt omgeven door een laag broeikasgassen. Zonlicht komt erdoorheen, maar warmte kan moeilijker ontsnappen — net als in een broeikas.",
    },
    {
      phase: "Verwerking",
      type: "Opdracht",
      preview:
        "Rangschik de volgende activiteiten van meest naar minst klimaatimpact: vliegen, autorijden, vlees eten, streamen, verwarmen. Onderbouw je keuze.",
    },
    {
      phase: "Afronding",
      type: "Exit ticket",
      preview:
        "Schrijf in één zin op: wat heb je vandaag geleerd over klimaatverandering dat je nog niet wist?",
    },
  ]

  return (
    <div className="flex h-[calc(100vh-5.5rem)] gap-0">
      <div className="flex-1 overflow-y-auto p-8 pb-32">
        <MetroLine step={3} />
        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Inhoud bouwen
        </h1>
        <p className="text-gray-500 text-sm mb-6">Max heeft lescontent gegenereerd. Je kunt dit bewerken.</p>

        <div className="space-y-4">
          {elements.map((el, i) => (
            <div key={i} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                    style={{ background: TEAL }}
                  >
                    {el.phase}
                  </span>
                  <span className="text-xs text-gray-500">{el.type}</span>
                </div>
                <button className="text-xs text-gray-400 hover:text-gray-600">Bewerken</button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{el.preview}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Vorige stap
          </Button>
          <Button onClick={onNext}>
            Voorvertoning bekijken
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex w-80 flex-col border-l">
        <ChatSidebar messages={chatMessages} onSend={onChatSend} isTyping={isTyping} />
      </div>
    </div>
  )
}

// ─── STEP 4: Preview & Lock ───────────────────────────────────────────────────
function Step4Preview({
  form,
  onPrev,
  onLock,
  isLocking,
}: {
  form: LessonForm
  onPrev: () => void
  onLock: () => void
  isLocking: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32 max-w-3xl mx-auto">
      <MetroLine step={4} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Voorvertoning
        </h1>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: TEAL }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="6" width="12" height="8" rx="1" stroke="white" strokeWidth="1.4" />
            <path d="M4 6V4a3 3 0 116 0v2" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Zet les op slot
        </button>
      </div>

      {/* Lesson preview card */}
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{form.onderwerp || "Geen onderwerp"}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {form.doelgroep} · {form.referentieNiveau} · {form.lesduur} min
          </p>
        </div>

        {form.lesdoel && (
          <div
            className="rounded-lg p-3 mb-4 border-l-4 text-sm"
            style={{ background: "#EFF9F9", borderLeftColor: TEAL }}
          >
            <span className="font-medium">Lesdoel:</span> {form.lesdoel}
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <span className="text-base">🚀</span>
            <div>
              <p className="font-medium">Introductie</p>
              <p className="text-gray-500">
                Poll over voorkennis klimaat → klassikale bespreking
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-base">📚</span>
            <div>
              <p className="font-medium">Instructie</p>
              <p className="text-gray-500">Uitleg broeikaswerking met visueel model</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-base">🔧</span>
            <div>
              <p className="font-medium">Verwerking</p>
              <p className="text-gray-500">Tweetallen: rangschik klimaatactiviteiten</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-base">✅</span>
            <div>
              <p className="font-medium">Afronding</p>
              <p className="text-gray-500">Exit ticket: wat heb je geleerd?</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onPrev}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Vorige stap
        </Button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#EFF9F9" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke={TEAL} strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke={TEAL} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Les op slot zetten?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              De les wordt vergrendeld. Leerlingen kunnen de les daarna niet meer bewerken.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  onLock()
                }}
                disabled={isLocking}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: TEAL }}
              >
                {isLocking ? "Vergrendelen…" : "Ja, vergrendel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Done screen ──────────────────────────────────────────────────────────────
function DoneScreen({ form }: { form: LessonForm }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "#EFF9F9" }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M8 20l8 8L32 12"
            stroke={TEAL}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
        Les op slot gezet!
      </h1>
      <p className="text-gray-500 max-w-md mb-2">
        Bedankt voor het deelnemen aan dit onderzoek. Je les <strong>"{form.onderwerp}"</strong> is vergrendeld en
        opgeslagen.
      </p>
      <p className="text-sm text-gray-400 mt-4">Je kunt dit venster nu sluiten.</p>
    </div>
  )
}

// ─── Main experiment orchestrator ────────────────────────────────────────────
export default function ExperimentPage() {
  const participantId = useRef(uuidv4())
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  const [form, setForm] = useState<LessonForm>({
    onderwerp: "",
    doelgroep: "",
    referentieNiveau: "B1",
    lesdoel: "",
    lesduur: 45,
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hoi! Ik ben Max, jouw AI-assistent. Ik help je bij het opbouwen van deze les. Stel gerust vragen of vraag om feedback!",
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [isGeneratingLesdoel, setIsGeneratingLesdoel] = useState(false)

  // Track step changes
  const track = async (event: string, extra?: object) => {
    await submitToFormspree({
      participant_id: participantId.current,
      timestamp: new Date().toISOString(),
      event,
      onderwerp: form.onderwerp,
      doelgroep: form.doelgroep,
      referentieNiveau: form.referentieNiveau,
      lesdoel: form.lesdoel,
      lesduur: typeof form.lesduur === "number" ? form.lesduur : undefined,
      step,
      ...extra,
    })
  }

  // Simulate typing delay for chat responses
  const simulateResponse = (response: string, delay = 1200) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setChatMessages((prev) => [...prev, { role: "assistant", text: response }])
    }, delay)
  }

  const handleChatSend = async (msg: string) => {
    setChatMessages((prev) => [...prev, { role: "user", text: msg }])
    await track("chat_message", { chat_message: msg })

    // Pick the best predetermined response
    const lower = msg.toLowerCase()
    let response = CHAT_RESPONSES.default
    if (lower.includes("lesdoel")) response = CHAT_RESPONSES.lesdoel
    else if (lower.includes("structuur") || lower.includes("lesplan")) response = CHAT_RESPONSES.structuur
    else if (lower.includes("inhoud") || lower.includes("tekst")) response = CHAT_RESPONSES.inhoud

    simulateResponse(response)
  }

  const handleGenerateLesdoel = async () => {
    setIsGeneratingLesdoel(true)
    await track("generate_lesdoel")
    setTimeout(() => {
      setForm((f) => ({ ...f, lesdoel: LESDOEL_SUGGESTION }))
      setIsGeneratingLesdoel(false)
      simulateResponse(
        "Ik heb een lesdoel gegenereerd op basis van het onderwerp en de doelgroep. Pas het gerust aan als je iets anders in gedachten hebt!"
      )
    }, 1800)
  }

  const goToStep = async (newStep: number) => {
    await track(`step_${newStep}`)
    setStep(newStep)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleLock = async () => {
    setIsLocking(true)
    await track("lesson_locked", { locked: true })
    setTimeout(() => {
      setIsLocking(false)
      setDone(true)
    }, 1200)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="h-14 border-b bg-white flex items-center px-6 gap-3">
          <img src="/logo.svg" alt="Max" className="h-7" />
        </nav>
        <DoneScreen form={form} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Nav */}
      <nav className="h-14 border-b bg-white flex items-center px-6 gap-3 z-10">
        <img src="/logo.svg" alt="Max" className="h-7" />
        <div className="flex-1" />
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Experiment</span>
      </nav>

      {/* Content */}
      <div className="flex-1">
        {step === 1 && (
          <Step1Setup
            form={form}
            setForm={setForm}
            onNext={() => goToStep(2)}
            chatMessages={chatMessages}
            onChatSend={handleChatSend}
            isTyping={isTyping}
            onGenerateLesdoel={handleGenerateLesdoel}
            isGeneratingLesdoel={isGeneratingLesdoel}
          />
        )}
        {step === 2 && (
          <Step2Plan
            form={form}
            onNext={() => goToStep(3)}
            onPrev={() => goToStep(1)}
            chatMessages={chatMessages}
            onChatSend={handleChatSend}
            isTyping={isTyping}
          />
        )}
        {step === 3 && (
          <Step3Content
            form={form}
            onNext={() => goToStep(4)}
            onPrev={() => goToStep(2)}
            chatMessages={chatMessages}
            onChatSend={handleChatSend}
            isTyping={isTyping}
          />
        )}
        {step === 4 && (
          <Step4Preview
            form={form}
            onPrev={() => goToStep(3)}
            onLock={handleLock}
            isLocking={isLocking}
          />
        )}
      </div>
    </div>
  )
}
