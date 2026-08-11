/**
 * ICE server configuration for WebRTC calls.
 *
 * WebRTC tries every server in this list and automatically picks the best
 * working route on its own - it always prefers a direct/STUN connection
 * first (completely free, unlimited) and only falls back to relaying
 * through a TURN server when a direct connection isn't possible (strict
 * NAT, some corporate/mobile networks). If the call connects directly,
 * the TURN servers below are never touched at all.
 *
 * - STUN (Google's public servers): free, unlimited, no signup needed.
 * - TURN (Open Relay Project / Metered.ca free demo endpoint): free,
 *   shared public relay used as the fallback path. It's fine to ship with
 *   as-is, but it's a shared demo quota - for a production app with real
 *   traffic, swap in your own free TURN credentials from
 *   https://www.metered.ca/tools/openrelay/ (their free tier is generous
 *   and this is a drop-in swap, just replace the urls/username/credential
 *   below).
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 4,
}

export const RING_TIMEOUT_MS = 45_000
