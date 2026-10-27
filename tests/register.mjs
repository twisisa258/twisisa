// Permite que `node --test` importe ficheiros .ts sem extensão (como o resto do projecto: `from '../lib/x'`).
import { register } from 'node:module'
register('./resolve-ts.mjs', import.meta.url)
