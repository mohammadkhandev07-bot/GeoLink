'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface SignupForm {
  email: string
  password: string
  username: string
  full_name: string
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>()

  const onSubmit = async (data: SignupForm) => {
    if (!agreedToTerms) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Signup karo
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: {
            username: data.username,
            full_name: data.full_name,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Signup failed. Please try again.')
        setLoading(false)
        return
      }

      // 2. Profile manually insert karo
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          username: data.username.toLowerCase().trim(),
          full_name: data.full_name.trim(),
          bio: null,
          avatar_url: null,
          cover_photo_url: null,
          is_private: false,
          is_verified: false,
          accepted_terms_at: new Date().toISOString(),
          posts_count: 0,
          followers_count: 0,
          following_count: 0,
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        // Profile error ignore karo - trigger se ban jayega
      }

      setSent(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    }

    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-3xl">✉️</div>
          </div>
          <CardTitle>Check your email!</CardTitle>
          <CardDescription>
            We sent a verification link to your email. Please verify to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <Button
            variant="gradient"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Go to Login
          </Button>
          <Link href="/verify-email">
            <Button variant="ghost" className="w-full text-sm">
              Resend verification email
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Image
            src="/images/geolink-logo.png"
            alt="GeoLink"
            width={56}
            height={56}
            className="rounded-xl"
          />
        </div>
        <CardTitle className="text-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          Create Account
        </CardTitle>
        <CardDescription>Join GeoLink today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Input
              {...register('full_name', { required: 'Full name is required' })}
              placeholder="Full Name"
            />
            {errors.full_name && (
              <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'Min 3 characters' },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: 'Only letters, numbers, underscores',
                },
              })}
              placeholder="Username"
            />
            {errors.username && (
              <p className="text-xs text-destructive mt-1">{errors.username.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register('email', { required: 'Email is required' })}
              type="email"
              placeholder="Email"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="relative">
            <Input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
              })}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 8 chars)"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              I agree to GeoLink's{' '}
              <Link href="/terms" target="_blank" className="text-pink-500 hover:underline">Terms &amp; Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy-policy" target="_blank" className="text-pink-500 hover:underline">Privacy Policy</Link>.
            </span>
          </label>

          <Button
            type="submit"
            className="w-full"
            variant="gradient"
            disabled={loading || !agreedToTerms}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-pink-500 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
