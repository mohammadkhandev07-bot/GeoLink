'use client'

// Uses the browser's native Web Speech API - no external API/key needed.
// Support varies by browser: best in Chrome/Edge, partial in Safari, and
// speech-to-text specifically isn't available in Firefox.

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      cachedVoices = existing
      resolve(existing)
      return
    }
    // Voices often load asynchronously on first page load.
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }
    // Fallback in case the event never fires (some browsers/OSes).
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500)
  })
}

// Picks the nicest-sounding female English voice available on this device,
// so Aperonix always speaks in a warm, "sweet girl" tone rather than
// whatever the system default happens to be.
function pickAperonixVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const preferredNames = [
    'Google US English Female', 'Google UK English Female', 'Samantha', 'Zira',
    'Microsoft Zira', 'Microsoft Aria', 'Victoria', 'Karen', 'Moira', 'Tessa',
  ]
  for (const name of preferredNames) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }
  // Fall back to anything explicitly flagged/named "female".
  const femaleMatch = voices.find(v => /female/i.test(v.name))
  if (femaleMatch) return femaleMatch
  // Last resort - any English voice at all.
  return voices.find(v => v.lang.startsWith('en')) || voices[0]
}

interface SpeakHandle {
  stop: () => void
}

export async function speakText(
  text: string,
  onEnd: () => void
): Promise<SpeakHandle> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd()
    return { stop: () => {} }
  }

  window.speechSynthesis.cancel()
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickAperonixVoice(voices)
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  // Slightly higher pitch + a touch slower than default reads as warmer and
  // friendlier rather than robotic.
  utterance.pitch = 1.15
  utterance.rate = 0.98
  utterance.onend = onEnd
  utterance.onerror = onEnd

  window.speechSynthesis.speak(utterance)
  return { stop: () => window.speechSynthesis.cancel() }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

interface VoiceInputHandlers {
  onInterim: (transcript: string) => void
  onFinal: (transcript: string) => void
  onEnd: () => void
  onError?: () => void
}

// Wraps the browser's SpeechRecognition object (typed loosely as `any`
// since it isn't part of the standard TS DOM lib) into a simple
// start/stop control the UI can drive directly.
export function createVoiceInput(handlers: VoiceInputHandlers) {
  const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognitionCtor) return null

  const recognition = new SpeechRecognitionCtor()
  recognition.lang = navigator.language || 'en-US'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  let finalTranscript = ''

  recognition.onresult = (event: any) => {
    let interim = ''
    finalTranscript = ''
    for (let i = 0; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) finalTranscript += transcript
      else interim += transcript
    }
    handlers.onInterim(finalTranscript + interim)
  }

  recognition.onerror = () => {
    handlers.onError?.()
  }

  recognition.onend = () => {
    handlers.onFinal(finalTranscript.trim())
    handlers.onEnd()
  }

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  }
}
