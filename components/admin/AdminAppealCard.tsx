'use client'

import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppealWithProfile, useReviewAppeal } from '@/lib/hooks/useAdmin'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'

export function AdminAppealCard({ appeal }: { appeal: AppealWithProfile }) {
  const reviewAppeal = useReviewAppeal()

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link href={`/profile/${appeal.profiles?.username}`} className="flex items-center gap-2 hover:underline">
          <Avatar className="h-6 w-6">
            <AvatarImage src={getAvatarUrl(appeal.profiles?.avatar_url)} />
            <AvatarFallback className="text-[9px]">{appeal.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{appeal.profiles?.username}</span>
        </Link>
        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(appeal.created_at)}</span>
      </div>

      <div className="flex gap-3">
        {/* Eslint-disable-next-line @next/next/no-img-element */}
        <img src={appeal.photo_url} alt="Appeal photo" className="h-20 w-20 rounded-xl object-cover border shrink-0" />
        <p className="text-sm bg-muted/60 rounded-lg px-3 py-2 flex-1">{appeal.letter}</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => reviewAppeal.mutate({ appealId: appeal.id, userId: appeal.user_id, approve: true })}
          disabled={reviewAppeal.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Approve & Unsuspend
        </button>
        <button
          onClick={() => reviewAppeal.mutate({ appealId: appeal.id, userId: appeal.user_id, approve: false })}
          disabled={reviewAppeal.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  )
}
