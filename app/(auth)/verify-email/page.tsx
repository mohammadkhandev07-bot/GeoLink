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
          {sent ? `Enter the 6-digit code sent to ${email}` : 'Enter your email to get a verification code'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sent ? (
          <>
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
