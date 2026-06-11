'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleResend = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-sm shadow-xl text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <Image src="/images/geolink-logo.png" alt="GeoLink" width={48} height={48} className="rounded-xl" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>Enter your email to resend the verification link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sent ? (
          <div className="space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-sm text-muted-foreground">Verification email sent! Check your inbox.</p>
            <Button className="w-full" variant="gradient" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        ) : (
          <>
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="gradient" onClick={handleResend} disabled={loading}>
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
