'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from './LoadingSpinner'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed'>('loading')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const check = async () => {
      try {
        // Pehle local session check karo
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          setStatus('authed')
          return
        }

        // Session nahi mili - refresh try karo
        const { data: { session: refreshed } } = await supabase.auth.refreshSession()
        
        if (!mounted) return

        if (refreshed?.user) {
          setStatus('authed')
        } else {
          setStatus('unauthed')
          router.replace('/login')
        }
      } catch {
        if (mounted) {
          setStatus('unauthed')
          router.replace('/login')
        }
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) setStatus('authed')
      } else if (event === 'SIGNED_OUT') {
        setStatus('unauthed')
        router.replace('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'loading') return <PageLoader />
  if (status === 'unauthed') return null

  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'guest' | 'authed'>('loading')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      
      if (session?.user) {
        setStatus('authed')
        router.replace('/feed')
      } else {
        setStatus('guest')
      }
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' && session) {
        setStatus('authed')
        router.replace('/feed')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'loading') return <PageLoader />
  if (status === 'authed') return null

  return <>{children}</>
}
