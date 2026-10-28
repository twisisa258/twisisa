import type { AttemptMode } from '@/lib/simulator-shared'

export const PREFS_COOKIE = 'sim_prefs'

export const PREF_OPTIONS = {
  practiceSize: [10, 20, 40],
  quickSize: [5, 10, 20],
  quickSeconds: [60, 90, 120],
} as const

export type SimPrefs = {
  practiceSize: (typeof PREF_OPTIONS.practiceSize)[number]
  quickSize: (typeof PREF_OPTIONS.quickSize)[number]
  quickSeconds: (typeof PREF_OPTIONS.quickSeconds)[number]
  sound: boolean
  haptics: boolean
}

export const DEFAULT_PREFS: SimPrefs = { practiceSize: 40, quickSize: 10, quickSeconds: 90, sound: false, haptics: true }

function pick<T extends number>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

export function parsePrefs(raw: unknown): SimPrefs {
  let data: Record<string, unknown> = {}
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>
  } catch {}
  return {
    practiceSize: pick(PREF_OPTIONS.practiceSize, data.practiceSize, DEFAULT_PREFS.practiceSize),
    quickSize: pick(PREF_OPTIONS.quickSize, data.quickSize, DEFAULT_PREFS.quickSize),
    quickSeconds: pick(PREF_OPTIONS.quickSeconds, data.quickSeconds, DEFAULT_PREFS.quickSeconds),
    sound: typeof data.sound === 'boolean' ? data.sound : DEFAULT_PREFS.sound,
    haptics: typeof data.haptics === 'boolean' ? data.haptics : DEFAULT_PREFS.haptics,
  }
}

export const sessionSize = (mode: AttemptMode, prefs: SimPrefs, revisionSize: number) =>
  mode === 'pratica' ? prefs.practiceSize : mode === 'rapido' ? prefs.quickSize : revisionSize
