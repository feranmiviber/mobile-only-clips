/**
 * Access code generation and validation
 */

export function generateAccessCode(): string {
  // Generate a 12-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  // Format as XXXX-XXXX-XXXX
  return code.match(/.{1,4}/g)?.join('-') || code
}

export function formatAccessCode(code: string): string {
  // Format as XXXX-XXXX-XXXX
  const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return cleaned.match(/.{1,4}/g)?.join('-') || cleaned
}

export function validateAccessCode(code: string): boolean {
  const cleaned = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return cleaned.length === 12 && /^[A-HJ-NP-Z2-9]+$/.test(cleaned)
}
