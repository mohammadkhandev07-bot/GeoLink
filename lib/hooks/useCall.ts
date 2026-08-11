'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RTC_CONFIG, RING_TIMEOUT_MS } from '@/lib/utils/webrtc'
import { getAvatarUrl } from '@/lib/utils/helpers'

export type CallType = 'audio' | 'video'
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'cancelled' | 'busy'

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

interface PendingIce {
  candidate: RTCIceCandidateInit
}

/**
 * Drives one call end-to-end:
 *  - global listener for incoming calls (works from any page, not just chat)
 *  - the full WebRTC offer/answer/ICE dance over a Supabase Realtime
 *    broadcast channel scoped to the call's id
 *  - call lifecycle (ring timeout, accept, reject, cancel, hangup)
 *
 * Mounted once, high up in the tree (see CallProvider), so an incoming
 * call can interrupt whatever page the person is currently on.
 */
function describeCallError(err: any, context: 'media' | 'insert' | 'join'): string {
  if (context === 'media') {
    if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
      return 'Camera/microphone access was denied. Please allow access in your browser\'s site settings and try again.'
    }
    if (err?.name === 'NotFoundError') {
      return 'No camera or microphone was found on this device.'
    }
    if (err?.name === 'NotReadableError') {
      return 'Your camera/microphone is already in use by another app.'
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return 'This browser (or this connection) does not support calls. Calling needs a modern browser over HTTPS.'
    }
    return 'Could not access your camera/microphone.'
  }
  if (context === 'insert') {
    const msg = String(err?.message || '')
    if (msg.includes('does not exist') || msg.includes('schema cache') || err?.code === '42P01') {
      return 'Calling isn\'t set up on the server yet - the "calls" database table is missing. Run supabase-migration-calls.sql in the Supabase SQL Editor.'
    }
    if (err?.code === '42501' || msg.toLowerCase().includes('row-level security')) {
      return 'Calling is blocked by a database permission (RLS policy). Check that supabase-migration-calls.sql ran successfully.'
    }
    return 'Could not start the call. Please try again.'
  }
  return 'Could not connect the call.'
}

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

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const roleRef = useRef<'caller' | 'callee' | null>(null)
  const pendingIceRef = useRef<PendingIce[]>([])
  const remoteDescSetRef = useRef(false)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callRef = useRef<CallRow | null>(null)

  useEffect(() => { callRef.current = call }, [call])

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null }
  }
  const clearDurationTimer = () => {
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null }
  }

  // Full teardown - stops media, closes the peer connection, leaves the
  // signaling channel, and resets every piece of state back to idle. Used
  // whenever a call ends for ANY reason (hangup, reject, cancel, timeout,
  // error, or the connection just dropping).
  const cleanup = useCallback(() => {
    clearRingTimeout()
    clearDurationTimer()

    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null

    if (pcRef.current) {
      pcRef.current.ontrack = null
      pcRef.current.onicecandidate = null
      pcRef.current.onconnectionstatechange = null
      pcRef.current.close()
      pcRef.current = null
    }

    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current)
      callChannelRef.current = null
    }

    roleRef.current = null
    pendingIceRef.current = []
    remoteDescSetRef.current = false

    setLocalStream(null)
    setRemoteStream(null)
    setCall(null)
    setPeer(null)
    setPhase('idle')
    setIsMuted(false)
    setIsCameraOff(false)
    setCallDurationSec(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateCallStatus = useCallback(async (callId: string, patch: Partial<Pick<CallRow, 'status' | 'started_at' | 'ended_at'>>) => {
    await supabase.from('calls').update(patch).eq('id', callId)
  }, [])

  const getMedia = async (type: CallType) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('unsupported'), { name: 'UnsupportedError' })
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { facingMode: 'user' } : false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }

  const flushPendingIce = async () => {
    if (!pcRef.current) return
    for (const item of pendingIceRef.current) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(item.candidate)) } catch {}
    }
    pendingIceRef.current = []
  }

  const setupPeerConnection = (callId: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    pcRef.current = pc

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!)
    })

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
      setPhase('in-call')
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callChannelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON() },
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (callRef.current) endCall('ended')
      }
    }

    return pc
  }

  // Joins the per-call broadcast channel and wires up every signaling
  // event. Both caller and callee call this - `role` decides which events
  // they react to (caller reacts to answers, callee reacts to offers -
  // both react to ICE candidates and hangup).
  const joinCallChannel = (callId: string, role: 'caller' | 'callee') =>
    new Promise<void>((resolve) => {
      roleRef.current = role
      const channel = supabase.channel(`call:${callId}`, { config: { broadcast: { self: false } } })
      callChannelRef.current = channel

      channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (role !== 'callee' || !pcRef.current) return
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        remoteDescSetRef.current = true
        await flushPendingIce()
        const answer = await pcRef.current.createAnswer()
        await pcRef.current.setLocalDescription(answer)
        channel.send({ type: 'broadcast', event: 'answer', payload: { sdp: answer } })
      })

      channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (role !== 'caller' || !pcRef.current) return
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
        remoteDescSetRef.current = true
        await flushPendingIce()
      })

      channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (!pcRef.current || !remoteDescSetRef.current) {
          pendingIceRef.current.push({ candidate: payload.candidate })
          return
        }
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch {}
      })

      channel.on('broadcast', { event: 'hangup' }, () => {
        cleanup()
      })

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve()
      })
    })

  // ------------------------------------------------------------------
  // Outgoing call
  // ------------------------------------------------------------------
  const startCall = useCallback(async (calleeId: string, chatId: string | null, type: CallType, calleeProfile: PeerProfile) => {
    if (!currentUserId) return
    setError(null)
    let stream: MediaStream
    try {
      stream = await getMedia(type)
    } catch (err: any) {
      console.error('getMedia failed', err)
      const message = describeCallError(err, 'media')
      setError(message)
      alert(message)
      cleanup()
      return
    }

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

      await joinCallChannel(newCall.id, 'caller')
      const pc = setupPeerConnection(newCall.id)
      void pc
      void stream

      ringTimeoutRef.current = setTimeout(async () => {
        await updateCallStatus(newCall.id, { status: 'missed' })
        callChannelRef.current?.send({ type: 'broadcast', event: 'hangup', payload: {} })
        cleanup()
      }, RING_TIMEOUT_MS)
    } catch (err: any) {
      console.error('startCall failed', err)
      const message = describeCallError(err, 'insert')
      setError(message)
      alert(message)
      cleanup()
    }
  }, [currentUserId])

  const cancelOutgoing = useCallback(async () => {
    if (!call) return
    await updateCallStatus(call.id, { status: 'cancelled' })
    callChannelRef.current?.send({ type: 'broadcast', event: 'hangup', payload: {} })
    cleanup()
  }, [call, cleanup])

  // ------------------------------------------------------------------
  // Incoming call
  // ------------------------------------------------------------------
  const acceptIncoming = useCallback(async () => {
    if (!call) return
    clearRingTimeout()
    try {
      await getMedia(call.type)
      // Join the channel and get the offer listener wired up BEFORE
      // flipping status to accepted, so there's no race where the
      // caller's offer arrives before we're listening for it.
      await joinCallChannel(call.id, 'callee')
      setupPeerConnection(call.id)
      setPhase('connecting')
      await updateCallStatus(call.id, { status: 'accepted', started_at: new Date().toISOString() })
      setCall((prev) => (prev ? { ...prev, status: 'accepted' } : prev))
    } catch (err: any) {
      console.error('acceptIncoming failed', err)
      const message = describeCallError(err, 'media')
      setError(message)
      alert(message)
      await updateCallStatus(call.id, { status: 'rejected' })
      cleanup()
    }
  }, [call, cleanup])

  const rejectIncoming = useCallback(async () => {
    if (!call) return
    await updateCallStatus(call.id, { status: 'rejected' })
    cleanup()
  }, [call, cleanup])

  // ------------------------------------------------------------------
  // Caller side: once the callee accepts (seen via the calls-table
  // listener below), actually create + send the offer.
  // ------------------------------------------------------------------
  const sendOfferAsCaller = useCallback(async () => {
    if (!pcRef.current || !callChannelRef.current) return
    clearRingTimeout()
    setPhase('connecting')
    const offer = await pcRef.current.createOffer()
    await pcRef.current.setLocalDescription(offer)
    callChannelRef.current.send({ type: 'broadcast', event: 'offer', payload: { sdp: offer } })
  }, [])

  const endCall = useCallback(async (finalStatus: CallStatus = 'ended') => {
    const current = callRef.current
    if (current) {
      await updateCallStatus(current.id, { status: finalStatus, ended_at: new Date().toISOString() })
    }
    callChannelRef.current?.send({ type: 'broadcast', event: 'hangup', payload: {} })
    cleanup()
  }, [cleanup])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsMuted(!track.enabled)
  }, [])

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsCameraOff(!track.enabled)
  }, [])

  // Call duration timer, running once the peer connection is actually live.
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
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', row.caller_id)
            .single()
          setCall(row)
          setPeer(callerProfile as PeerProfile)
          setPhase('incoming-ringing')

          ringTimeoutRef.current = setTimeout(() => {
            cleanup()
          }, RING_TIMEOUT_MS)
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
        setCall(row)
        sendOfferAsCaller()
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
