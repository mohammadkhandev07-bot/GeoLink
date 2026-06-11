import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { FollowRequestsDialog } from '@/components/profile/FollowRequestsDialog'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single()
    isFollowing = follow?.status === 'accepted'
  }

  const isOwn = user?.id === profile.id

  return (
    <div className="max-w-xl mx-auto">
      <ProfileHeader profile={profile} currentUserId={user?.id} />
      {isOwn && profile.is_private && (
        <div className="px-4 pb-2">
          <FollowRequestsDialog userId={profile.id} />
        </div>
      )}
      <ProfileTabs
        profileId={profile.id}
        isPrivate={profile.is_private}
        isFollowing={isFollowing}
        isOwn={isOwn}
      />
    </div>
  )
}
