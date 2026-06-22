export type AppMode = 'educational' | 'personal' | 'business'

const KEY = 'pm_mode'

export function getMode(): AppMode | null {
  const v = localStorage.getItem(KEY)
  if (v === 'educational' || v === 'personal' || v === 'business') return v
  return null
}

export function setMode(mode: AppMode): void {
  localStorage.setItem(KEY, mode)
}

export function clearMode(): void {
  localStorage.removeItem(KEY)
}
