'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/') {
    return null
  }

  const goBack = () => {
    if (
      typeof document !== 'undefined' &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back()
      return
    }

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
