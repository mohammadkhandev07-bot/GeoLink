'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

// Lets people jump straight to their inbox instead of hunting for the tab
// themselves - covers the providers the vast majority of users are on.
function getEmailProviderLink(email: string): { name: string; url: string } | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  if (['gmail.com', 'googlemail.com'].includes(domain)) {
    return { name: 'Gmail', url: 'https://mail.google.com/mail/u/0/#search/from%3Asupabase' }
  }
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
    return { name: 'Outlook', url: 'https://outlook.live.com/mail/0/inbox' }
  }
  if (domain === 'yahoo.com') {
    return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' }
  }
  if (domain === 'icloud.com') {
    return { name: 'iCloud Mail', url: 'https://www.icloud.com/mail' }
  }
  return null
}

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const supabase = createClient()
  const router = useRouter()

  const startResendCooldown = () => {
    setResendCooldown(30)
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setError(error.message)
    else {
      setSent(true)
      startResendCooldown()
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setError(error.message)
    startResendCooldown()
  }

  const handleVerify = async () => {
    if (code.trim().length < 6) { setError('Please enter the 6-digit code.'); return }
    setVerifying(true)
    setError(null)

    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' })

    if (error) {
      setError(error.message)
      setVerifying(false)
      return
    }

    router.push('/feed')
  }

  return (
    <Card className="w-full max-w-sm shadow-xl text-center">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <Image src="/images/geolink-logo.png" alt="GeoLink" width={48} height={48} className="rounded-xl" />
        </div>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          {sent ? `A 6-digit verification code has been sent to ${email}` : 'Enter your email address to receive a verification code'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sent ? (
          <>
            <div className="text-left bg-muted/60 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                The code will arrive from <span className="font-medium text-foreground">&quot;Supabase Auth&quot;</span> — this is expected for now. Please check your inbox (and spam folder), then enter the 6-digit Supabase verification code below.
              </p>
            </div>
            {getEmailProviderLink(email) && (
              <a
                href={getEmailProviderLink(email)!.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
              >
                <Mail className="h-4 w-4" />
                Open {getEmailProviderLink(email)!.name}
              </a>
            )}
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-semibold"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="gradient" onClick={handleVerify} disabled={verifying || code.length < 6}>
              {verifying ? 'Verifying...' : 'Verify & Continue'}
            </Button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-pink-500 hover:underline disabled:text-muted-foreground disabled:no-underline block mx-auto"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get it? Resend code"}
            </button>
          </>
        ) : (
          <>
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" variant="gradient" onClick={handleSendCode} disabled={loading}>
              {loading ? 'Sending...' : 'Send Verification Code'}
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
