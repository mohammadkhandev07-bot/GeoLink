'use client'

import Image from 'next/image'
import { Camera, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { FollowButton } from './FollowButton'
import { Profile } from '@/lib/types/database.types'
import { formatCount, getAvatarUrl } from '@/lib/utils/helpers'
import Link from 'next/link'

interface ProfileHeaderProps {
  profile: Profile
  currentUserId?: string
}

export function ProfileHeader({ profile, currentUserId }: ProfileHeaderProps) {
  const isOwn = currentUserId === profile.id

  return (
    <div>
      {/* Cover Photo */}
      <div className="relative h-32 sm:h-48 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
        {profile.cover_photo_url && (
          <Image
            src={profile.cover_photo_url}
            alt="Cover"
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-12 mb-3">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
              <AvatarFallback className="text-2xl">
                {profile.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex gap-2 mt-4">
            {isOwn ? (
              <Link href="/profile/edit">
                <Button variant="outline" size="sm">Edit Profile</Button>
              </Link>
            ) : (
              <FollowButton
                targetUserId={profile.id}
                targetUsername={profile.username}
                isPrivate={profile.is_private}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>

        {/* Name & Bio */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-lg">{profile.full_name || profile.username}</h1>
            {profile.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
            {profile.is_verified && (
              <span className="text-cyan-500 text-sm">✓</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="font-bold">{formatCount(profile.posts_count)}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{formatCount(profile.followers_count)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold">{formatCount(profile.following_count)}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>
    </div>
  )
}
