'use client'

import { useUser } from '@/lib/hooks/useUser'
import { ChatList } from '@/components/chat/ChatList'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Edit } from 'lucide-react'

export default function ChatPage() {
  const { user, loading } = useUser()

  if (loading) return <PageLoader />
  if (!user) return null

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-14 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <button className="text-muted-foreground hover:text-foreground">
          <Edit className="h-5 w-5" />
        </button>
      </div>
      <ChatList currentUserId={user.id} />
    </div>
  )
}
