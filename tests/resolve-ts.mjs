import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Resolve `@/x` (alias do projecto) e imports relativos sem extensão para ficheiros .ts/.tsx.
export async function resolve(specifier, context, nextResolve) {
  let target = specifier
  let base = context.parentURL
  if (specifier.startsWith('@/')) {
    target = path.join(root, specifier.slice(2))
    base = pathToFileURL(path.join(root, 'x')).href
  }
  if ((target.startsWith('.') || path.isAbsolute(target)) && !/\.[a-z]+$/i.test(target) && base) {
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      const url = path.isAbsolute(target) ? pathToFileURL(target + suffix) : new URL(target + suffix, base)
      if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context)
    }
  }
  return nextResolve(specifier, context)
}
