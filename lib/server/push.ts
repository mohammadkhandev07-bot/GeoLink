import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

let configured = false
function ensureConfigured() {
  if (configured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error('Push notifications are not configured (VAPID keys missing).')
  }
  webpush.setVapidDetails('mailto:support@geolink.app', publicKey, privateKey)
  configured = true
}

export interface PushPayload {
  title: string
  body: string
  url: string
  /** 'call' shows Accept/Decline actions and a distinct look in the service worker. */
  kind?: 'call' | 'message' | 'generic'
  tag?: string
  callId?: string
  chatId?: string
}

/**
 * Sends a Web Push notification to every device a user is subscribed on.
 * This is what makes a call or message notify someone even when GeoLink
 * isn't open in a browser tab - same mechanism WhatsApp Web / every other
 * PWA relies on (native OS notification, played with the OS's own sound;
 * a custom in-app ringtone only plays once the person opens the app - the
 * Notification API can't play a custom sound while the page is closed).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    ensureConfigured()
  } catch {
    return // Not configured - fail silently, this is a best-effort enhancement.
  }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err: any) {
        // 404/410 = the subscription is dead (user revoked permission,
        // uninstalled, etc.) - clean it up so we stop trying.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )
}
