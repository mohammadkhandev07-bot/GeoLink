import Link from 'next/link'
import Image from 'next/image'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={28} height={28} className="rounded-lg" />
            <span className="font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">GeoLink</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-sm dark:prose-invert">
        <h1 className="text-2xl font-bold mb-1">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using GeoLink, you agree to these Terms & Conditions and our Privacy Policy. If you don't agree, please don't use GeoLink.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">2. Your Account</h2>
            <p>You're responsible for keeping your login details secure and for all activity under your account. You must provide accurate information when signing up.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">3. Acceptable Use</h2>
            <p>You agree not to use GeoLink to post illegal content, harass others, impersonate someone else, spam, or attempt to disrupt or exploit the platform.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">4. Content You Post</h2>
            <p>You retain ownership of the photos, videos, and text you post. By posting, you give GeoLink permission to display and distribute that content within the app to the audience you've chosen with your privacy settings.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">5. Privacy Controls</h2>
            <p>GeoLink provides privacy controls for your posts, messages, and search visibility. You are responsible for configuring these to match your preferences.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">6. Termination</h2>
            <p>You may delete your account at any time. We may suspend or remove accounts that violate these terms.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">7. Disclaimer</h2>
            <p>GeoLink is provided "as is" without warranties of any kind. We aren't liable for content posted by users.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">8. Changes to These Terms</h2>
            <p>We may update these Terms from time to time. Continued use of GeoLink after changes means you accept the updated Terms.</p>
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t">
            This is a general template and not a substitute for legal advice. Consider having this reviewed by a qualified lawyer for your specific jurisdiction and use case.
          </p>
        </section>
      </main>
    </div>
  )
}
