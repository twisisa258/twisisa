let context: AudioContext | null = null

export function cue(correct: boolean, prefs: { sound: boolean; haptics: boolean }) {
  if (prefs.haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(correct ? 25 : [40, 60, 40])
  if (!prefs.sound) return
  try {
    context ??= new AudioContext()
    const ctx = context
    const start = ctx.currentTime
    ;(correct ? [660, 880] : [220]).forEach((frequency, i) => {
      const at = start + i * 0.1
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.2)
    })
  } catch {}
}
