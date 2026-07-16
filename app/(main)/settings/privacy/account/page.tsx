'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Lock, Image as ImageIcon, MessageCircle, Search, Users, X, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { PageLoader } from '@/components/shared/LoadingSpinner'

type PrivacyLevel = 'everyone' | 'followers' | 'following' | 'selected' | 'none'
type Category = 'post' | 'message' | 'search'

const LEVEL_OPTIONS: { value: PrivacyLevel; label: string; hint: string }[] = [
  { value: 'everyone', label: 'Everyone', hint: 'Anyone on GeoLink' },
  { value: 'followers', label: 'Followers', hint: 'People who follow you' },
  { value: 'following', label: 'Following', hint: 'People you follow' },
  { value: 'selected', label: 'Selected People', hint: 'Only people you pick' },
  { value: 'none', label: 'No One', hint: 'Nobody at all' },
]

interface Profile {
  id: string
  username: string
  avatar_url: string | null
}

function PrivacySection({
  icon,
  title,
  description,
  value,
  onChange,
  category,
  userId,
}: {
  icon: React.ReactNode
  title: string
  description: string
  value: PrivacyLevel
  onChange: (v: PrivacyLevel) => void
  category: Category
  userId: string
}) {
  const supabase = createClient()
  const [showPicker, setShowPicker] = useState(false)
  const [selected, setSelected] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Profile[]>([])

  useEffect(() => {
    if (value !== 'selected') return
    const load = async () => {
      const { data } = await supabase
        .from('privacy_selected_users')
        .select('selected_user_id, profiles!privacy_selected_users_selected_user_id_fkey(id, username, avatar_url)')
        .eq('owner_id', userId)
        .eq('category', category)
      const people = (data || []).map((r: any) => r.profiles).filter(Boolean)
      setSelected(people)
    }
    load()
  }, [value, category, userId])

  useEffect(() => {
    if (!showPicker || !search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${search.trim()}%`)
        .neq('id', userId)
        .limit(10)
      setResults((data as Profile[]) || [])
    }, 250)
    return () => clearTimeout(t)
  }, [search, showPicker, userId])

  const addPerson = async (p: Profile) => {
    await supabase.from('privacy_selected_users').insert({ owner_id: userId, category, selected_user_id: p.id })
    setSelected(prev => [...prev, p])
  }

  const removePerson = async (p: Profile) => {
    await supabase.from('privacy_selected_users').delete().eq('owner_id', userId).eq('category', category).eq('selected_user_id', p.id)
    setSelected(prev => prev.filter(s => s.id !== p.id))
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {LEVEL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-colors ${
                value === opt.value ? 'border-pink-500 bg-pink-500/5' : 'border-transparent hover:bg-accent'
              }`}
            >
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.hint}</p>
              </div>
              {value === opt.value && <Check className="h-4 w-4 text-pink-500 shrink-0" />}
            </button>
          ))}
        </div>

        {value === 'selected' && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs font-semibold text-pink-500 hover:text-pink-600"
            >
              Manage selected people ({selected.length})
            </button>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selected.map(p => (
                  <span key={p.id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1">
                    <Avatar className="h-5 w-5"><AvatarImage src={getAvatarUrl(p.avatar_url)} /><AvatarFallback className="text-[9px]">{p.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                    <span className="text-xs">{p.username}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showPicker && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-card rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-semibold text-sm">Selected people</p>
              <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3 border-b">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search username..."
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-transparent focus:border-pink-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {selected.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-1">Selected</p>
                  {selected.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl">
                      <Avatar className="h-8 w-8"><AvatarImage src={getAvatarUrl(p.avatar_url)} /><AvatarFallback>{p.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <span className="flex-1 text-sm">{p.username}</span>
                      <button onClick={() => removePerson(p)} className="text-xs text-red-500">Remove</button>
                    </div>
                  ))}
                </>
              )}
              {results.filter(r => !selected.some(s => s.id === r.id)).map(p => (
                <button key={p.id} onClick={() => addPerson(p)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent text-left">
                  <Avatar className="h-8 w-8"><AvatarImage src={getAvatarUrl(p.avatar_url)} /><AvatarFallback>{p.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                  <span className="flex-1 text-sm">{p.username}</span>
                  <span className="text-xs text-pink-500">Add</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function AccountPrivacyPage() {
  const { user, profile, loading } = useUser()
  const supabase = createClient()
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [postPrivacy, setPostPrivacy] = useState<PrivacyLevel>('everyone')
  const [messagePrivacy, setMessagePrivacy] = useState<PrivacyLevel>('everyone')
  const [searchPrivacy, setSearchPrivacy] = useState<PrivacyLevel>('everyone')

  useEffect(() => {
    if (!profile) return
    setPostPrivacy((profile as any).post_privacy || 'everyone')
    setMessagePrivacy((profile as any).message_privacy || 'everyone')
    setSearchPrivacy((profile as any).search_privacy || 'everyone')
  }, [profile])

  const togglePrivateAccount = async () => {
    if (!user || !profile) return
    setPrivacyLoading(true)
    await supabase.from('profiles').update({ is_private: !profile.is_private }).eq('id', user.id)
    setPrivacyLoading(false)
  }

  const updateField = async (field: 'post_privacy' | 'message_privacy' | 'search_privacy', value: PrivacyLevel) => {
    if (!user) return
    if (field === 'post_privacy') setPostPrivacy(value)
    if (field === 'message_privacy') setMessagePrivacy(value)
    if (field === 'search_privacy') setSearchPrivacy(value)
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
  }

  if (loading) return <PageLoader />
  if (!profile || !user) return null

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings/privacy" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Account Privacy</h1>
      </div>

      <Card>
        <CardContent className="pt-4 divide-y">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide pb-2">Private Account</p>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  New followers need your approval before they can follow you.
                </p>
              </div>
            </div>
            <Switch checked={profile.is_private} onCheckedChange={togglePrivateAccount} disabled={privacyLoading} />
          </div>
        </CardContent>
      </Card>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Post Privacy</p>
        <PrivacySection
          icon={<ImageIcon className="h-5 w-5" />}
          title="Who can see your posts"
          description="Choose who gets to see the photos, reels, and text posts you share"
          value={postPrivacy}
          onChange={v => updateField('post_privacy', v)}
          category="post"
          userId={user.id}
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Message Privacy</p>
        <PrivacySection
          icon={<MessageCircle className="h-5 w-5" />}
          title="Who can message you"
          description="Choose who's allowed to start a conversation with you"
          value={messagePrivacy}
          onChange={v => updateField('message_privacy', v)}
          category="message"
          userId={user.id}
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 px-1">Search Result Privacy</p>
        <PrivacySection
          icon={<Search className="h-5 w-5" />}
          title="Who can find you in search"
          description="Choose who can find your account through Explore and Search"
          value={searchPrivacy}
          onChange={v => updateField('search_privacy', v)}
          category="search"
          userId={user.id}
        />
      </div>
    </div>
  )
}
