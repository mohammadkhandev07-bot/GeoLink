import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/server/push'

/**
 * Called right after a chat message is inserted (client-side) to notify
 * The recipient even if they don't have GeoLink open in a tab right now.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId } = await request.json()
  if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

  const { data: message } = await supabase
    .from('messages')
    .select('id, sender_id, content, media_type, sticker, chat_id, chats(participant1_id, participant2_id)')
    .eq('id', messageId)
    .single()

  if (!message || message.sender_id !== user.id) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  const chat = message.chats as any
  const recipientId = chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', user.id)
    .single()

  const senderName = senderProfile?.full_name || senderProfile?.username || 'Someone'
  const preview =
    message.sticker ? `${message.sticker} Sticker`
    : message.media_type === 'image' ? '📷 Photo'
    : message.media_type === 'video' ? '🎬 Video'
    : message.media_type === 'audio' ? '🎤 Voice message'
    : message.content?.slice(0, 120) || 'New message'

  await sendPushToUser(recipientId, {
    title: senderName,
    body: preview,
    url: `/chat/${message.chat_id}`,
    kind: 'message',
    tag: `chat-${message.chat_id}`,
    chatId: message.chat_id,
  })

  return NextResponse.json({ ok: true })
}
