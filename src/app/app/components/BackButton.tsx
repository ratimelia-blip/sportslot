'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  // The home page doesn't need a back button
  if (pathname === '/') {
    return null
  }

  const goBack = () => {
    // If the user came from another SportSlot page,
    // use normal browser-style back navigation.
    if (
      typeof document !== 'undefined' &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back()
      return
    }

    // If the page was opened directly,
    // return to the SportSlot home page.
    router.push('/')
  }

  return (
    <button
      onClick={goBack}
      className="btn"
      style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      ← Back
    </button>
  )
}
