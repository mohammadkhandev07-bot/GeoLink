'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { PageLoader } from './LoadingSpinner'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader />

  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/feed')
    }
  }, [user, loading, router])

  if (loading) return <PageLoader />
  if (user) return <PageLoader />

  return <>{children}</>
}
