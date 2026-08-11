import { useEffect } from 'react'

/**
 * Calls `onEscape` whenever the user presses the Escape key.
 * Drop this into any page that has a "Back" button and pass the
 * same handler you use for that button's onClick.
 *
 * Usage:
 *   const navigate = useNavigate()
 *   useEscapeBack(() => navigate('/'))
 */
export function useEscapeBack(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onEscape, enabled])
}
