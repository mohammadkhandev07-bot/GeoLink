'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: "When you use GeoLink, we collect information you provide directly — your username, email, profile details, and anything you post: photos, videos, text, comments, and messages. We also collect basic usage data, like login times and how you interact with posts, to keep the app running smoothly.",
  },
  {
    title: 'How We Use Your Information',
    body: "Your information powers GeoLink's core features — your feed, following people, messaging, and showing your posts to the audience you choose. We never sell your personal information to third parties.",
  },
  {
    title: 'Your Privacy Controls',
    body: "You're in control. From Settings → Privacy Settings → Account Privacy, you decide exactly who can see your posts, who can message you, and who can find your account in search — Everyone, Followers, Following, Selected People, or No One.",
  },
  {
    title: 'Data Sharing',
    body: 'We only share information with service providers that help run GeoLink, like hosting and database providers, and only as much as needed. We may disclose information if required by law.',
  },
  {
    title: 'Data Retention & Deletion',
    body: 'You can delete your account anytime from Settings → General Settings → Delete Account. Doing so removes your profile and posts from the platform.',
  },
  {
    title: "Children's Privacy",
    body: "GeoLink isn't intended for children under the minimum age required by your local law, and we don't knowingly collect information from anyone below that age.",
  },
  {
    title: 'Changes to This Policy',
    body: 'We may update this Privacy Policy occasionally. Continuing to use GeoLink after a change means you accept the update.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy? Reach out through the contact details provided on GeoLink.',
  },
]

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold">Privacy Policy</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground">Last updated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-6 mb-8 leading-relaxed">
          This Privacy Policy explains what information GeoLink collects, how it's used, and the controls you have over your own data.
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
          <Link href="/terms" className="text-pink-500 hover:underline">Terms &amp; Conditions</Link>.
        </p>
      </main>
    </div>
  )
}
