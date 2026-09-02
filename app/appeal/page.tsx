'use client'

import { useRouter } from 'next/navigation'
import { FileClock } from 'lucide-react'

// Full appeal form (photo + face check, letter, password confirm) lands
// here in the next pass - this placeholder just keeps the link from the
// Suspension screen from 404ing in the meantime.
export default function AppealPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <FileClock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold">Appeal form coming soon</h1>
        <p className="text-sm text-muted-foreground">
          This page is still being built. Check back shortly to submit your appeal.
        </p>
        <button onClick={() => router.back()} className="text-sm text-pink-500 font-medium">
          Go back
        </button>
      </div>
    </div>
  )
}
