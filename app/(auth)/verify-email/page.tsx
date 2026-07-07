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
            <div className="text-left bg-muted/60 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What to do next</p>
              <ol className="text-sm space-y-1.5 list-decimal list-inside">
                <li>Open your email inbox (check the <span className="font-medium">Spam/Junk</span> folder too).</li>
                <li>
                  Look for an email from <span className="font-medium">&quot;Supabase Auth&quot;</span> or an address like{' '}
                  <span className="font-medium">noreply@mail.app.supabase.io</span> — this is expected, GeoLink uses Supabase to send verification emails.
                </li>
                <li>Open that email and click the verification link inside it.</li>
                <li>Come back here and log in to GeoLink.</li>
              </ol>
            </div>
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
