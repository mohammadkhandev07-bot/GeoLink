'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// Pages that already have their own dedicated back arrow / header bar
// baked into the page itself - showing a second floating one on top of
// those would just duplicate what's already there. Everything else in
// the app gets this floating button so there's always a consistent way
// back, even on pages that don't otherwise have one.
const EXACT_EXCLUDE = new Set([
  '/chat/archive',
  '/delete-account',
  '/profile/edit',
  '/profile/suggestions',
  '/aperonix',
])

// Matches individual chat threads like /chat/abc123 (but not /chat or
// /chat/archive, which are handled separately above/below).
const CHAT_THREAD = /^\/chat\/[^/]+$/

export function BackButton() {
  const router = useRouter()
  const pathname = usePathname() || ''

  const isChatThread = CHAT_THREAD.test(pathname) && pathname !== '/chat/archive'
  if (EXACT_EXCLUDE.has(pathname) || isChatThread) return null

  const isReels = pathname === '/reels'

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/feed')
    }
  }

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      title="Go back"
      className={`fixed z-30 h-9 w-9 flex items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md hover:bg-black/65 active:scale-90 transition-all shadow-lg left-3 lg:left-[15.75rem] xl:left-[18.75rem] ${
        isReels ? 'top-3 lg:top-[4.25rem]' : 'top-[4.25rem]'
      }`}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  )
}
