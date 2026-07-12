// Handles sending large video/image files to Gemini via its File API instead
// of inline base64 data. This is what lets Aperonix "watch" full videos
// (visuals + audio) without hitting Vercel's request body size limit - the
// file bytes are fetched server-side from Vercel Blob (where the browser
// already uploaded them directly) and streamed on to Gemini's own storage.
//
// The media is uploaded to Gemini ONCE per post-creation session and then
// reused for every "Generate" click (title/description/hashtags), instead of
// re-uploading the same video 3 times. A Gemini file is only usable with the
// exact API key that uploaded it, so the key index that succeeded is tracked
// and reused for the follow-up generate + cleanup calls.

import { getKeysForRole } from './gemini'

const FILES_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files'
const FILES_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const GENERATE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent'

interface GeminiFileInfo {
  name: string // e.g. "files/abc123"
  uri: string
  mimeType: string
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED'
}

async function uploadBytesToGemini(apiKey: string, bytes: ArrayBuffer, mimeType: string): Promise<GeminiFileInfo> {
  const numBytes = bytes.byteLength

  const startRes = await fetch(`${FILES_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(numBytes),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: `aperonix-${Date.now()}` } }),
  })

  if (!startRes.ok) throw new Error(`Gemini file upload could not start (${startRes.status})`)
  const uploadUrl = startRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL')

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(numBytes),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: bytes,
  })

  if (!uploadRes.ok) throw new Error(`Gemini file upload failed (${uploadRes.status})`)
  const data = await uploadRes.json()
  return data.file as GeminiFileInfo
}

async function waitUntilActive(apiKey: string, fileName: string, maxWaitMs = 45000): Promise<GeminiFileInfo> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${FILES_BASE_URL}/${fileName}?key=${apiKey}`)
    if (res.ok) {
      const data = (await res.json()) as GeminiFileInfo
      if (data.state === 'ACTIVE') return data
      if (data.state === 'FAILED') throw new Error('Gemini failed to process the uploaded file')
    }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  throw new Error('Timed out waiting for Gemini to finish processing the file')
}

/**
 * Uploads media bytes to Gemini and waits until it's ready to be analyzed.
 * Tries each available "generate" key in order until one works, and returns
 * which index succeeded so later calls (generate / delete) know which key to
 * use - a file uploaded with one key isn't visible to another key.
 */
export async function uploadMediaToGemini(bytes: ArrayBuffer, mimeType: string) {
  const keys = getKeysForRole('generate')
  if (keys.length === 0) {
    console.error('Aperonix: no Gemini API key configured for media uploads.')
    throw new Error('Try again later.')
  }

  for (let i = 0; i < keys.length; i++) {
    try {
      const file = await uploadBytesToGemini(keys[i], bytes, mimeType)
      const active = await waitUntilActive(keys[i], file.name)
      return { fileUri: active.uri, geminiFileName: active.name, mimeType: active.mimeType, keyIndex: i }
    } catch (err) {
      console.error(`Aperonix: media upload failed on key index ${i}, trying next if available.`, err)
    }
  }

  throw new Error('Try again later.')
}

/** Asks Gemini to analyze an already-uploaded file, using the same key that uploaded it. */
export async function generateFromUploadedFile(
  keyIndex: number,
  fileUri: string,
  mimeType: string,
  systemPrompt: string,
  promptText: string
) {
  const keys = getKeysForRole('generate')
  const apiKey = keys[keyIndex]
  if (!apiKey) throw new Error('Try again later.')

  const res = await fetch(`${GENERATE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [
            { fileData: { fileUri, mimeType } },
            { text: promptText },
          ],
        },
      ],
      generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini generation failed (${res.status})`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? ''
  if (!text) throw new Error('Gemini returned an empty response')
  return text.trim()
}

/** Best-effort deletion of a file previously uploaded to Gemini. */
export async function deleteUploadedFile(keyIndex: number, geminiFileName: string) {
  const keys = getKeysForRole('generate')
  const apiKey = keys[keyIndex]
  if (!apiKey) return
  try {
    await fetch(`${FILES_BASE_URL}/${geminiFileName}?key=${apiKey}`, { method: 'DELETE' })
  } catch {
    // best-effort only - not worth failing anything over
  }
}
