type Guard = (to: string) => boolean
let guard: Guard | null = null

export function setGuard(g: Guard | null) {
  guard = g
}

export function tryLeave(to: string) {
  if (!guard) return true
  try {
    return guard(to)
  } catch {
    return true
  }
}
