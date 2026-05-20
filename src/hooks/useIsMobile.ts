import { useEffect, useState } from 'react'

const MOBILE_MAX = 720

function getInitial(maxWidth: number): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(`(max-width: ${maxWidth}px)`).matches
}

export function useIsMobile(maxWidth: number = MOBILE_MAX): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => getInitial(maxWidth))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [maxWidth])

  return isMobile
}

export const MOBILE_BREAKPOINT = MOBILE_MAX
