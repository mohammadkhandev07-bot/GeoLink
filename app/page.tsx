import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { MessageCircle, Users, Film, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/geolink-logo.png" alt="GeoLink" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              GeoLink
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="gradient">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="mb-6 flex justify-center">
          <Image src="/images/geolink-logo.png" alt="GeoLink" width={100} height={100} className="rounded-2xl shadow-2xl" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">
          Connect With The{' '}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            World
          </span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Share moments, discover stories, and connect with people around you. GeoLink brings you closer to what matters.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" variant="gradient" className="px-8">
              Get Started Free
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Log In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MessageCircle, title: 'Real-time Chat', desc: 'Instant messaging with live typing indicators and online status.' },
            { icon: Users, title: 'Follow System', desc: 'Follow friends or keep your account private with approval-based follows.' },
            { icon: Film, title: 'Reels', desc: 'Upload and watch short videos in a TikTok-style vertical feed.' },
            { icon: Zap, title: 'Instant Feed', desc: 'See posts from people you follow in real-time, always fresh.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border bg-card text-center">
              <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 mb-4">
                <Icon className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-md mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to join?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of users already on GeoLink.</p>
          <Link href="/signup">
            <Button size="lg" variant="gradient" className="w-full">
              Create Your Account
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© 2025 GeoLink. Made with ❤️</p>
      </footer>
    </div>
  )
}
