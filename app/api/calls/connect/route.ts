import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pickCallProvider, type CallProviderName } from '@/lib/server/callProvider'
import { RtcTokenBuilder, RtcRole } from 'agora-token'

const TOKEN_TTL_SECONDS = 2 * 60 * 60 // 2 hours - plenty for one call

async function buildAgoraConnection(roomName: string, forUserId: string) {
  const appId = process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE
  if (!appId || !appCertificate) {
    throw new Error('Agora is not configured (AGORA_APP_ID / AGORA_APP_CERTIFICATE missing).')
  }
  // Agora needs a small numeric uid per participant, not the Supabase
  // UUID - it only has to be unique within this one channel, not tied to
  // the person's identity anywhere else, so a stable hash is enough.
  let hash = 0
  for (const ch of forUserId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const uid = (hash % 1000000000) + 1

  const now = Math.floor(Date.now() / 1000)
  const token = RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, roomName, uid, RtcRole.PUBLISHER,
    now + TOKEN_TTL_SECONDS, now + TOKEN_TTL_SECONDS
  )
  return { provider: 'agora' as const, appId, channel: roomName, token, uid }
}

async function ensureDailyRoom(roomName: string) {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) throw new Error('Daily is not configured (DAILY_API_KEY missing).')

  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  const existing = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, { headers })
  if (existing.ok) return

  const created = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: { max_participants: 2, eject_at_room_exp: true, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS },
    }),
  })
  // Someone else may have created it a split second earlier - that's fine.
  if (!created.ok && created.status !== 400) {
    const body = await created.text()
    throw new Error(`Could not create Daily room: ${body}`)
  }
}

async function buildDailyConnection(roomName: string, forUserId: string) {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) throw new Error('Daily is not configured (DAILY_API_KEY missing).')

  await ensureDailyRoom(roomName)

  const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: forUserId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      },
    }),
  })
  if (!res.ok) throw new Error(`Could not create Daily token: ${await res.text()}`)
  const data = await res.json()
  return { provider: 'daily' as const, roomUrl: `https://${process.env.DAILY_DOMAIN}.daily.co/${roomName}`, token: data.token }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { callId } = await request.json()
  if (!callId) return NextResponse.json({ error: 'callId is required' }, { status: 400 })

  const { data: call, error: fetchError } = await supabase
    .from('calls')
    .select('id, caller_id, callee_id, provider, room_name, status')
    .eq('id', callId)
    .single()

  if (fetchError || !call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  if (call.caller_id !== user.id && call.callee_id !== user.id) {
    return NextResponse.json({ error: 'Not a participant in this call' }, { status: 403 })
  }
  if (!['ringing', 'accepted'].includes(call.status)) {
    return NextResponse.json({ error: 'This call is no longer active' }, { status: 409 })
  }

  let provider = call.provider as CallProviderName | null
  let roomName = call.room_name as string | null

  if (!provider || !roomName) {
    provider = await pickCallProvider()
    roomName = `geolink-call-${call.id}`

    const admin = createAdminClient()
    // Only set it if it's still null - if the other participant's request
    // beat us here, this update just affects zero rows and we fall
    // through to re-reading below, so both sides end up agreeing on the
    // SAME provider/room no matter who got there first.
    await admin.from('calls').update({ provider, room_name: roomName }).eq('id', call.id).is('provider', null)

    const { data: refreshed } = await supabase.from('calls').select('provider, room_name').eq('id', call.id).single()
    if (refreshed?.provider && refreshed?.room_name) {
      provider = refreshed.provider as CallProviderName
      roomName = refreshed.room_name
    }
  }

  try {
    const connection = provider === 'daily'
      ? await buildDailyConnection(roomName, user.id)
      : await buildAgoraConnection(roomName, user.id)
    return NextResponse.json(connection)
  } catch (err: any) {
    console.error('[calls/connect] provider setup failed', provider, err)
    return NextResponse.json({ error: err?.message || 'Could not set up the call.' }, { status: 500 })
  }
}
