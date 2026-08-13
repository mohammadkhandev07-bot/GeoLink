'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RING_TIMEOUT_MS } from '@/lib/utils/webrtc'
import { getAvatarUrl } from '@/lib/utils/helpers'

export type CallType = 'audio' | 'video'
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled' | 'busy'
export type CallProviderName = 'agora' | 'daily'

export interface CallRow {
  id: string
  chat_id: string | null
  caller_id: string
  callee_id: string
  type: CallType
  status: CallStatus
  created_at: string
  started_at: string | null
  ended_at: string | null
}

interface PeerProfile {
  id: string
  username: string
  avatar_url: string | null
}

export type CallPhase = 'idle' | 'outgoing-ringing' | 'incoming-ringing' | 'connecting' | 'in-call'

function describeCallError(err: any, context: 'media' | 'connect'): string {
  if (context === 'media') {
    if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
      return "Camera/microphone access was denied. Please allow access in your browser's site settings and try again."
    }
    if (err?.name === 'NotFoundError') return 'No camera or microphone was found on this device.'
    if (err?.name === 'NotReadableError') return 'Your camera/microphone is already in use by another app.'
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'This browser (or this connection) does not support calls. Calling needs a modern browser over HTTPS.'
    }
    return 'Could not access your camera/microphone.'
  }
  const msg = String(err?.message || '')
  if (msg.includes('AGORA_APP_ID') || msg.includes('AGORA_APP_CERTIFICATE')) {
    return 'Calling isn\'t fully set up yet - Agora API keys are missing from the server environment variables.'
  }
  if (msg.includes('DAILY_API_KEY') || msg.includes('DAILY_DOMAIN')) {
    return 'Calling isn\'t fully set up yet - Daily API keys are missing from the server environment variables.'
  }
  if (msg.includes('does not exist') || msg.includes('schema cache') || err?.code === '42P01') {
    return 'Calling isn\'t set up on the server yet - the "calls" database table is missing. Run supabase-migration-calls-v2.sql in the Supabase SQL Editor.'
  }
  return msg || 'Could not connect the call.'
}

/** Adds a track to a persistent MediaStream, replacing any existing track of the same kind. */
function upsertTrack(stream: MediaStream, track: MediaStreamTrack) {
  stream.getTracks().filter((t) => t.kind === track.kind).forEach((t) => stream.removeTrack(t))
  stream.addTrack(track)
}
function removeTracksOfKind(stream: MediaStream, kind: string) {
  stream.getTracks().filter((t) => t.kind === kind).forEach((t) => stream.removeTrack(t))
}

/**
 * Drives one call end-to-end:
 *  - global listener for incoming calls (works from any page, not just chat)
 *  - call lifecycle (ring timeout, accept, reject, cancel, hangup) via the
 *    "calls" Supabase table + realtime, same as before
 *  - the actual audio/video transport, via Agora.io (primary) or Daily.co
 *    (automatic fallback once Agora's free minutes for the month are used
 *    up) - see /api/calls/connect for how that's decided server-side
 *
 * Mounted once, high up in the tree (see CallProvider), so an incoming
 * call can interrupt whatever page the person is currently on.
 */
export function useCallEngine(currentUserId?: string) {
  const supabase = createClient()

  const [phase, setPhase] = useState<CallPhase>('idle')
  const [call, setCall] = useState<CallRow | null>(null)
  const [peer, setPeer] = useState<PeerProfile | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callDurationSec, setCallDurationSec] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const localStreamObjRef = useRef<MediaStream>(new MediaStream())
  const remoteStreamObjRef = useRef<MediaStream>(new MediaStream())
  const agoraRef = useRef<{ client: any; audioTrack: any; videoTrack: any } | null>(null)
  const dailyRef = useRef<any>(null)
  const providerRef = useRef<CallProviderName | null>(null)
  const startedAtMsRef = useRef<number | null>(null)

  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callRef = useRef<CallRow | null>(null)
  const roleRef = useRef<'caller' | 'callee' | null>(null)

  useEffect(() => { callRef.current = call }, [call])

  const clearRingTimeout = () => { if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null } }
  const clearDurationTimer = () => { if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null } }

  const reportUsageAndCleanupTransport = useCallback(async () => {
    const activeCall = callRef.current
    const provider = providerRef.current
    if (activeCall && provider && startedAtMsRef.current) {
      const seconds = Math.round((Date.now() - startedAtMsRef.current) / 1000)
      try {
        await fetch('/api/calls/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: activeCall.id, durationSeconds: seconds }),
        })
      } catch { /* best-effort - never block hangup on this */ }
    }

    if (agoraRef.current) {
      const { client, audioTrack, videoTrack } = agoraRef.current
      try { audioTrack?.close() } catch {}
      try { videoTrack?.close() } catch {}
      try { await client.leave() } catch {}
      agoraRef.current = null
    }
    if (dailyRef.current) {
      try { await dailyRef.current.leave() } catch {}
      try { dailyRef.current.destroy() } catch {}
      dailyRef.current = null
    }
    providerRef.current = null
    startedAtMsRef.current = null
  }, [])

  // Full teardown - stops media, tears down whichever provider is active,
  // and resets every piece of state back to idle. Used whenever a call
  // ends for ANY reason (hangup, reject, cancel, timeout, error).
  const cleanup = useCallback(() => {
    clearRingTimeout()
    clearDurationTimer()
    void reportUsageAndCleanupTransport()

    localStreamObjRef.current.getTracks().forEach((t) => { t.stop(); localStreamObjRef.current.removeTrack(t) })
    remoteStreamObjRef.current.getTracks().forEach((t) => remoteStreamObjRef.current.removeTrack(t))

    roleRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setCall(null)
    setPeer(null)
    setPhase('idle')
    setIsMuted(false)
    setIsCameraOff(false)
    setCallDurationSec(0)
  }, [reportUsageAndCleanupTransport])

  const updateCallStatus = useCallback(async (callId: string, patch: Partial<Pick<CallRow, 'status' | 'started_at' | 'ended_at'>>) => {
    await supabase.from('calls').update(patch).eq('id', callId)
  }, [])

  // ------------------------------------------------------------------
  // Joins the actual audio/video transport (Agora or Daily, whichever
  // /api/calls/connect decides) once both sides have accepted the call.
  // ------------------------------------------------------------------
  const connectMedia = useCallback(async (activeCall: CallRow) => {
    setPhase('connecting')
    try {
      const res = await fetch('/api/calls/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCall.id }),
      })
      const info = await res.json()
      if (!res.ok) throw new Error(info?.error || 'Could not connect the call.')

      providerRef.current = info.provider

      if (info.provider === 'agora') {
        const { default: AgoraRTC } = await import('agora-rtc-sdk-ng')
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
        agoraRef.current = { client, audioTrack: null, videoTrack: null }

        client.on('user-published', async (remoteUser: any, mediaType: 'audio' | 'video') => {
          await client.subscribe(remoteUser, mediaType)
          const track = mediaType === 'audio' ? remoteUser.audioTrack : remoteUser.videoTrack
          if (track) {
            upsertTrack(remoteStreamObjRef.current, track.getMediaStreamTrack())
            setRemoteStream(remoteStreamObjRef.current)
            setPhase('in-call')
            if (!startedAtMsRef.current) startedAtMsRef.current = Date.now()
          }
        })
        client.on('user-unpublished', (_remoteUser: any, mediaType: 'audio' | 'video') => {
          removeTracksOfKind(remoteStreamObjRef.current, mediaType === 'audio' ? 'audio' : 'video')
        })
        client.on('user-left', () => cleanup())

        await client.join(info.appId, info.channel, info.token, info.uid)

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        upsertTrack(localStreamObjRef.current, audioTrack.getMediaStreamTrack())
        let videoTrack: any = null
        if (activeCall.type === 'video') {
          videoTrack = await AgoraRTC.createCameraVideoTrack()
          upsertTrack(localStreamObjRef.current, videoTrack.getMediaStreamTrack())
        }
        agoraRef.current.audioTrack = audioTrack
        agoraRef.current.videoTrack = videoTrack
        setLocalStream(localStreamObjRef.current)
        await client.publish([audioTrack, videoTrack].filter(Boolean))
      } else {
        const { default: Daily } = await import('@daily-co/daily-js')
        const call = Daily.createCallObject({ subscribeToTracksAutomatically: true })
        dailyRef.current = call

        call.on('track-started', (ev: any) => {
          if (!ev?.track) return
          const targetStream = ev.participant?.local ? localStreamObjRef.current : remoteStreamObjRef.current
          upsertTrack(targetStream, ev.track)
          if (ev.participant?.local) setLocalStream(localStreamObjRef.current)
          else {
            setRemoteStream(remoteStreamObjRef.current)
            setPhase('in-call')
            if (!startedAtMsRef.current) startedAtMsRef.current = Date.now()
          }
        })
        call.on('track-stopped', (ev: any) => {
          if (!ev?.track) return
          const targetStream = ev.participant?.local ? localStreamObjRef.current : remoteStreamObjRef.current
          targetStream.removeTrack(ev.track)
        })
        call.on('left-meeting', () => cleanup())
        call.on('error', (ev: any) => { console.error('[Daily] error', ev); setError(describeCallError(ev, 'connect')) })

        await call.join({ url: info.roomUrl, token: info.token })
        if (activeCall.type === 'audio') await call.setLocalVideo(false)
      }
    } catch (err: any) {
      console.error('connectMedia failed', err)
      const message = describeCallError(err, 'media')
      setError(message)
      await updateCallStatus(activeCall.id, { status: 'ended', ended_at: new Date().toISOString() })
      cleanup()
    }
  }, [cleanup, updateCallStatus])

  // ------------------------------------------------------------------
  // Outgoing call
  // ------------------------------------------------------------------
  const startCall = useCallback(async (calleeId: string, chatId: string | null, type: CallType, calleeProfile: PeerProfile) => {
    if (!currentUserId) return
    setError(null)
    roleRef.current = 'caller'
    try {
      const { data: newCall, error: insertError } = await supabase
        .from('calls')
        .insert({ chat_id: chatId, caller_id: currentUserId, callee_id: calleeId, type, status: 'ringing' })
        .select()
        .single()
      if (insertError || !newCall) throw insertError || new Error('Could not start call')

      setCall(newCall as CallRow)
      setPeer(calleeProfile)
      setPhase('outgoing-ringing')

      ringTimeoutRef.current = setTimeout(async () => {
        await updateCallStatus(newCall.id, { status: 'missed' })
        cleanup()
      }, RING_TIMEOUT_MS)
    } catch (err: any) {
      console.error('startCall failed', err)
      const message = describeCallError(err, 'connect')
      setError(message)
      cleanup()
    }
  }, [currentUserId, cleanup, updateCallStatus])

  const cancelOutgoing = useCallback(async () => {
    if (!call) return
    await updateCallStatus(call.id, { status: 'cancelled' })
    cleanup()
  }, [call, cleanup])

  // ------------------------------------------------------------------
  // Incoming call
  // ------------------------------------------------------------------
  const acceptIncoming = useCallback(async () => {
    if (!call) return
    clearRingTimeout()
    roleRef.current = 'callee'
    try {
      await updateCallStatus(call.id, { status: 'accepted', started_at: new Date().toISOString() })
      const acceptedCall = { ...call, status: 'accepted' as CallStatus }
      setCall(acceptedCall)
      await connectMedia(acceptedCall)
    } catch (err: any) {
      console.error('acceptIncoming failed', err)
      setError(describeCallError(err, 'media'))
      await updateCallStatus(call.id, { status: 'rejected' })
      cleanup()
    }
  }, [call, cleanup, connectMedia])

  const rejectIncoming = useCallback(async () => {
    if (!call) return
    await updateCallStatus(call.id, { status: 'rejected' })
    cleanup()
  }, [call, cleanup])

  const endCall = useCallback(async (finalStatus: CallStatus = 'ended') => {
    const current = callRef.current
    if (current) {
      await updateCallStatus(current.id, { status: finalStatus, ended_at: new Date().toISOString() })
    }
    cleanup()
  }, [cleanup])

  const toggleMute = useCallback(() => {
    const next = !isMuted
    setIsMuted(next)
    if (agoraRef.current?.audioTrack) agoraRef.current.audioTrack.setEnabled(!next)
    if (dailyRef.current) dailyRef.current.setLocalAudio(!next)
  }, [isMuted])

  const toggleCamera = useCallback(() => {
    const next = !isCameraOff
    setIsCameraOff(next)
    if (agoraRef.current?.videoTrack) agoraRef.current.videoTrack.setEnabled(!next)
    if (dailyRef.current) dailyRef.current.setLocalVideo(!next)
  }, [isCameraOff])

  // Call duration timer, running once the transport is actually live.
  useEffect(() => {
    if (phase === 'in-call') {
      const startedAt = call?.started_at ? new Date(call.started_at).getTime() : Date.now()
      durationIntervalRef.current = setInterval(() => {
        setCallDurationSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
      }, 1000)
    } else {
      clearDurationTimer()
    }
    return clearDurationTimer
  }, [phase, call?.started_at])

  // ------------------------------------------------------------------
  // Global listeners - work from anywhere in the app, not just the chat
  // page, so a call can ring while someone's browsing the feed.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`calls-listener:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` },
        async ({ payload }: any) => {
          const row = payload.new as CallRow
          if (row.status !== 'ringing') return
          roleRef.current = 'callee'
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', row.caller_id)
            .single()
          setCall(row)
          setPeer(callerProfile as PeerProfile)
          setPhase('incoming-ringing')

          ringTimeoutRef.current = setTimeout(() => cleanup(), RING_TIMEOUT_MS)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `caller_id=eq.${currentUserId}` },
        ({ payload }: any) => handleStatusUpdate(payload.new as CallRow)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` },
        ({ payload }: any) => handleStatusUpdate(payload.new as CallRow)
      )
      .subscribe()

    function handleStatusUpdate(row: CallRow) {
      if (!callRef.current || row.id !== callRef.current.id) return

      if (row.status === 'accepted' && roleRef.current === 'caller') {
        const acceptedCall = { ...callRef.current, status: 'accepted' as CallStatus }
        setCall(acceptedCall)
        connectMedia(acceptedCall)
        return
      }
      if (['rejected', 'missed', 'cancelled', 'busy', 'ended'].includes(row.status)) {
        cleanup()
      }
    }

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  return {
    phase,
    call,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callDurationSec,
    error,
    startCall,
    cancelOutgoing,
    acceptIncoming,
    rejectIncoming,
    hangup: () => endCall('ended'),
    toggleMute,
    toggleCamera,
  }
}

export function peerAvatar(peer: PeerProfile | null) {
  return getAvatarUrl(peer?.avatar_url ?? null)
}
