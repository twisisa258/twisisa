import { cookies } from 'next/headers'
import { PREFS_COOKIE, parsePrefs } from '@/lib/simulator-prefs'

export async function getSimPrefs() {
  return parsePrefs((await cookies()).get(PREFS_COOKIE)?.value)
}
