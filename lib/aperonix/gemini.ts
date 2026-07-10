// Shared helper for calling the Gemini API. Used by both the Aperonix
// chatbot and the "Generate" buttons in Create Post.
// Requires the GEMINI_API_KEY environment variable to be set (server-side only).

const GEMINI_MODEL = 'gemini-flash-latest'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export interface GeminiTextPart {
  text: string
}

export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string
    data: string // base64, no data: prefix
  }
}

export type GeminiPart = GeminiTextPart | GeminiInlineDataPart

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

export async function callGemini(systemPrompt: string, contents: GeminiMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set on the server. Add it in your hosting provider\'s Environment Variables.')
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Gemini API error (${response.status}): ${errText || response.statusText}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') ?? ''
  if (!text) throw new Error('Gemini returned an empty response.')
  return text.trim()
}
