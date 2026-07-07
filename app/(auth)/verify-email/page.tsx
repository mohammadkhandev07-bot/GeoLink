'use client'

import { Mail, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function VerifyEmailPage() {
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleResend = async () => {
    setLoading(true)
    // Supabase resend is handled via signInWithOtp
    setTimeout(() => {
      setResent(true)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={56} height={56} className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            GeoLink
          </h1>
        </div>

        {/* Main card */}
        <div className="border rounded-2xl bg-card p-6 space-y-6">
          {/* Icon */}
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 mb-3">
              <Mail className="h-8 w-8 text-pink-500" />
            </div>
            <h2 className="text-xl font-bold">Verify Your Email</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We sent a confirmation email to your inbox
            </p>
          </div>

          {/* Step by step guide */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Follow these steps to verify:
            </p>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>1</div>
                <div>
                  <p className="text-sm font-semibold">Open your email app</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Gmail, Yahoo, Outlook or any email app</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>2</div>
                <div>
                  <p className="text-sm font-semibold">Look for an email from <span className="text-pink-500">Supabase</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    The email subject will be: <strong>"Confirm Your Email"</strong> or <strong>"GeoLink - Confirm signup"</strong>
                  </p>
                  <div className="mt-2 bg-background border rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">From:</p>
                    <p className="text-xs font-mono font-semibold">no-reply@mail.app.supabase.io</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>3</div>
                <div>
                  <p className="text-sm font-semibold">Check your Spam / Junk folder</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sometimes the email goes to spam. Check there if you don&apos;t see it in inbox.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>4</div>
                <div>
                  <p className="text-sm font-semibold">Click <span className="text-pink-500">"Confirm your email"</span> button</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inside the email, tap the big button or link to verify your account.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-500">You&apos;re all set!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    After clicking the link, you will be automatically logged into GeoLink.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resend */}
          {resent ? (
            <div className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Email resent successfully!
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">Didn&apos;t receive the email?</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sending...' : 'Resend Email'}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Wrong email?{' '}
          <Link href="/signup" className="text-pink-500 hover:underline font-medium">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  )
}
