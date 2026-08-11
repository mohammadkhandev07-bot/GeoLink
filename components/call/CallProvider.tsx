'use client'

import { createContext, useContext, useMemo } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useCallEngine, peerAvatar, type CallType } from '@/lib/hooks/useCall'
import { showToast } from '@/components/shared/Toast'
import { IncomingCallModal } from './IncomingCallModal'
import { CallScreen } from './CallScreen'

interface StartCallPeer {
  id: string
  username: string
  avatar_url: string | null
}

interface CallContextValue {
  startCall: (peer: StartCallPeer, chatId: string | null, type: CallType) => Promise<void>
  isCallActive: boolean
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCallContext() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCallContext must be used within CallProvider')
  return ctx
}

/**
 * Mounted once near the root (see ResponsiveLayout) so a call can ring in
 * from anywhere in the app, not just the chat page. Renders the incoming
 * call screen and the active call screen as global overlays.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const engine = useCallEngine(user?.id)

  const startCall = async (peer: StartCallPeer, chatId: string | null, type: CallType) => {
    if (engine.phase !== 'idle') {
      showToast('You are already on a call.', 'error')
      return
    }
    await engine.startCall(peer.id, chatId, type, peer)
  }

  const value = useMemo<CallContextValue>(() => ({
    startCall,
    isCallActive: engine.phase !== 'idle',
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [engine.phase])

  const peerName = engine.peer?.username || 'Unknown'
  const peerAvatarUrl = peerAvatar(engine.peer)

  return (
    <CallContext.Provider value={value}>
      {children}

      {engine.phase === 'incoming-ringing' && engine.call && (
        <IncomingCallModal
          callerName={peerName}
          callerAvatar={peerAvatarUrl}
          type={engine.call.type}
          onAccept={engine.acceptIncoming}
          onReject={engine.rejectIncoming}
        />
      )}

      {(engine.phase === 'outgoing-ringing' || engine.phase === 'connecting' || engine.phase === 'in-call') && engine.call && (
        <CallScreen
          phase={engine.phase}
          type={engine.call.type}
          peerName={peerName}
          peerAvatar={peerAvatarUrl}
          localStream={engine.localStream}
          remoteStream={engine.remoteStream}
          isMuted={engine.isMuted}
          isCameraOff={engine.isCameraOff}
          callDurationSec={engine.callDurationSec}
          error={engine.error}
          onEnd={engine.phase === 'outgoing-ringing' ? engine.cancelOutgoing : engine.hangup}
          onToggleMute={engine.toggleMute}
          onToggleCamera={engine.toggleCamera}
        />
      )}
    </CallContext.Provider>
  )
}
