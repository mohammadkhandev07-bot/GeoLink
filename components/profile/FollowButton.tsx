'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useFollowStatus, useFollowUser, useUnfollowUser } from '@/lib/hooks/useFollow'

interface FollowButtonProps {
  targetUserId: string
  targetUsername: string
  isPrivate: boolean
  currentUserId?: string
}

export function FollowButton({ targetUserId, isPrivate, currentUserId }: FollowButtonProps) {
  const { data: followStatus } = useFollowStatus(currentUserId, targetUserId)
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()
  // React state updates aren't synchronous - a very fast double-click/tap can
  // fire handleFollow twice before `isPending` re-renders the disabled button,
  // causing duplicate follow/notification rows. This ref blocks that
  // immediately, with no render delay.
  const submittingRef = useRef(false)

  if (!currentUserId || currentUserId === targetUserId) return null

  const handleFollow = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      if (followStatus) {
        await unfollowUser.mutateAsync({ followerId: currentUserId, followingId: targetUserId })
      } else {
        await followUser.mutateAsync({ followerId: currentUserId, followingId: targetUserId, isPrivate })
      }
    } finally {
      submittingRef.current = false
    }
  }

  let label = 'Follow'
  let variant: 'default' | 'outline' | 'secondary' = 'default'

  if (followStatus?.status === 'accepted') {
    label = 'Following'
    variant = 'outline'
  } else if (followStatus?.status === 'pending') {
    label = 'Requested'
    variant = 'secondary'
  }

  return (
    <Button
      size="sm"
      variant={variant}
      onClick={handleFollow}
      disabled={followUser.isPending || unfollowUser.isPending}
      className={label === 'Follow' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 border-0' : ''}
    >
      {label}
    </Button>
  )
}
