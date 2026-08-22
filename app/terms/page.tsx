'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ScrollText } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: "By creating an account or using SociaLens, you agree to these Terms & Conditions and our Privacy Policy. If you don't agree, please don't use SociaLens.",
  },
  {
    title: 'Your Account',
    body: "You're responsible for keeping your login details secure and for all activity under your account. You must provide accurate information when signing up.",
  },
  {
    title: 'Acceptable Use',
    body: "You agree not to use SociaLens to post illegal content, harass others, impersonate someone else, spam, or attempt to disrupt or exploit the platform.",
  },
  {
    title: 'Content You Post',
    body: "You retain ownership of everything you post — photos, videos, and text. By posting, you give SociaLens permission to display and distribute that content to the audience you've chosen with your privacy settings.",
  },
  {
    title: 'Privacy Controls',
    body: 'SociaLens gives you controls for your posts, messages, and search visibility. Configuring these to match your preferences is your responsibility.',
  },
  {
    title: 'Termination',
    body: 'You may delete your account anytime. We may suspend or remove accounts that violate these Terms.',
  },
  {
    title: 'Disclaimer',
    body: 'SociaLens is provided "as is" without warranties of any kind. We are not liable for content posted by users.',
  },
  {
    title: 'Changes to These Terms',
    body: 'We may update these Terms occasionally. Continuing to use SociaLens after a change means you accept the update.',
  },
]

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">Terms &amp; Conditions</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terms &amp; Conditions</h1>
            <p className="text-xs text-muted-foreground">Last updated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-6 mb-8 leading-relaxed">
          These Terms & Conditions govern your use of SociaLens. Please read them carefully.
        </p>

        <div className="space-y-3">
          {SECTIONS.map((section, i) => (
            <div key={section.title} className="rounded-2xl border p-5">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-semibold text-pink-500">{String(i + 1).padStart(2, '0')}</span>
                <h2 className="font-semibold text-sm">{section.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8 pt-6 border-t leading-relaxed">
          This is a general template, not a substitute for legal advice. Consider having it reviewed by a qualified lawyer for your specific jurisdiction and use case. See also our{' '}
          <Link href="/privacy-policy" className="text-pink-500 hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  )
}
