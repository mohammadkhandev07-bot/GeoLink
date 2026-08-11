// components/call/CallProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPeerConnection } from '@/lib/utils/webrtc';
import { createClient } from '@/lib/supabase/client';

interface CallContextType {
  // Updated to accept 3 arguments as expected by page.tsx
  startCall: (targetUser: any, chatId: string, type: 'audio' | 'video' | boolean) => Promise<void>;
  endCall: () => void;
  acceptCall: () => Promise<void>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: 'idle' | 'calling' | 'incoming' | 'connected';
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<any>(null);
  
  // Supabase client initialized correctly
  const supabase = createClient();

  // Remote Stream Buffer handling function
  const handleAddIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnection.current && peerConnection.current.remoteDescription) {
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      // Guard: Queue candidates if remote SDP isn't ready yet
      iceCandidatesQueue.current.push(candidate);
    }
  };

  // Queue me pade ICE candidates ko flush kar
  const processBufferedCandidates = async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  };

  // 1. Call Start Karna (Updated with 3 parameters)
  const startCall = async (targetUser: any, chatId: string, type: 'audio' | 'video' | boolean) => {
    setCallState('calling');

    // Parse video type and receiver ID safely
    const isVideo = type === 'video' || type === true;
    const receiverId = typeof targetUser === 'string' ? targetUser : (targetUser?.id || targetUser?._id);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo,
    });
    setLocalStream(stream);

    // Setup Supabase Signaling Room using chatId or receiverId
    const channel = supabase.channel(`call:${chatId || receiverId}`);
    channelRef.current = channel;

    const pc = createPeerConnection(
      (candidate) => {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate },
        });
      },
      (remoteMediaStream) => {
        setRemoteStream(remoteMediaStream);
        setCallState('connected');
      }
    );

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    peerConnection.current = pc;

    channel
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await processBufferedCandidates();
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        await handleAddIceCandidate(payload.candidate);
      })
      .on('broadcast', { event: 'end-call' }, () => {
        cleanupCall();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { sdp: offer },
          });
        }
      });
  };

  // 2. Call Cut Karna (Clean-Up)
  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    iceCandidatesQueue.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
  };

  const endCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: {},
      });
    }
    cleanupCall();
  };

  return (
    <CallContext.Provider
      value={{
        startCall,
        endCall,
        acceptCall: async () => {}, // Receiver logic binding
        localStream,
        remoteStream,
        callState,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

// Exporting as useCallContext to match your page.tsx import
export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCallContext must be used within CallProvider');
  return context;
};
