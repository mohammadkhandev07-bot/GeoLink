/**
 * A small two-tone ringback/ringtone generated with the Web Audio API -
 * no external audio file to host or license. Works for both the incoming
 * call screen and the outgoing "ringing..." screen.
 */
let audioCtx: AudioContext | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

function beep(freq: number, startAt: number, duration: number) {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.15, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration)
}

export function startRingtone() {
  if (intervalId) return
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playPattern = () => {
      if (!audioCtx) return
      const now = audioCtx.currentTime
      beep(480, now, 0.4)
      beep(620, now + 0.45, 0.4)
    }
    playPattern()
    intervalId = setInterval(playPattern, 2000)
  } catch {
    // Autoplay/audio restrictions - fail silently, the visual UI still works.
  }
}

export function stopRingtone() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null }
}
