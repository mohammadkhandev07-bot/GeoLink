'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from './LoadingSpinner'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Pehle localStorage se session check karo
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setAuthed(true)
        setChecking(false)
      } else {
        // Session nahi hai - login pe bhejo
        router.replace('/login')
        setChecking(false)
      }
    }

    checkSession()

    // Auth state changes suno
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setAuthed(true)
          setChecking(false)
        } else if (event === 'SIGNED_OUT') {
          setAuthed(false)
          router.replace('/login')
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setAuthed(true)
          setChecking(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (checking) return <PageLoader />
  if (!authed) return <PageLoader />

  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Already logged in - feed pe bhejo
        router.replace('/feed')
        setChecking(false)
      } else {
        setIsGuest(true)
        setChecking(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.replace('/feed')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (checking) return <PageLoader />
  if (!isGuest) return <PageLoader />

  return <>{children}</>
}
