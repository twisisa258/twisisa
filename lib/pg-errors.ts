// Violação de UNIQUE no PostgreSQL (23505). O drizzle pode embrulhar o erro original em `cause`.
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, cause } = error as { code?: unknown; cause?: unknown }
  return code === '23505' || isUniqueViolation(cause)
}
