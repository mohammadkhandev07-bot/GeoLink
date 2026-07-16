import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPolicyPage() {
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
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="font-semibold text-base mb-2">1. Information We Collect</h2>
            <p>When you use GeoLink, we collect information you provide directly, such as your username, email address, profile details, and any content you post (photos, videos, text, comments, and messages). We also collect basic usage information, like when you log in and how you interact with posts, to keep the app working properly.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">2. How We Use Your Information</h2>
            <p>We use your information to operate GeoLink's core features: showing you a feed, letting you follow people, sending messages, and displaying your posts to the audience you choose. We do not sell your personal information to third parties.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">3. Your Privacy Controls</h2>
            <p>GeoLink gives you control over who can see your posts, who can message you, and who can find your account in search - you can set each of these to Everyone, Followers, Following, Selected People, or No One at any time from Settings → Privacy Settings → Account Privacy.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">4. Data Sharing</h2>
            <p>We only share your information with service providers that help us run GeoLink (such as our hosting and database providers), and only to the extent needed to provide the service. We may disclose information if required by law.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">5. Data Retention & Deletion</h2>
            <p>You can delete your account at any time from Settings → General Settings → Delete Account. When you do, your profile and posts are removed from the platform.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">6. Children's Privacy</h2>
            <p>GeoLink is not intended for children under the minimum age required by your local law. We do not knowingly collect information from children below that age.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Continued use of GeoLink after changes means you accept the updated policy.</p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">8. Contact</h2>
            <p>If you have questions about this Privacy Policy, please reach out through the contact details provided on GeoLink.</p>
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t">
            This is a general template and not a substitute for legal advice. Consider having this reviewed by a qualified lawyer for your specific jurisdiction and use case.
          </p>
        </section>
      </main>
    </div>
  )
}
