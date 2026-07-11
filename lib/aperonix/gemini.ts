import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { callGemini, extractText, extractFunctionCall, GeminiMessage, GeminiTool } from '@/lib/aperonix/gemini'
import { APERONIX_SYSTEM_PROMPT } from '@/lib/aperonix/systemPrompt'

interface ChatHistoryItem {
  role: 'user' | 'model'
  content: string
}

const SEARCH_TOOL: GeminiTool = {
  functionDeclarations: [
    {
      name: 'search_geolink_profiles',
      description: 'Searches GeoLink\'s user profiles by username or full name. Use this whenever the user asks you to check, find, or search for a specific person/profile on GeoLink (e.g. "is there a profile named Uzair on GeoLink?").',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'The username or name to search for' },
        },
        required: ['query'],
      },
    },
  ],
}

async function searchProfiles(query: string) {
  if (!query?.trim()) return { matches: [] }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('profiles')
    .select('username, full_name, bio, is_private')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(5)

  if (error || !data || data.length === 0) return { matches: [] }

  // Privacy rule: for private accounts, we never even hand the model their
  // username, name, or a link - only a flag saying a private match exists.
  const matches = data.map(p => {
    if (p.is_private) {
      return {
        private: true,
        note: 'A private account matched this search. Do NOT reveal its username, name, bio, or any link to it - just tell the user a private account matched but you can\'t share details about private accounts.',
      }
    }
    return {
      private: false,
      username: p.username,
      full_name: p.full_name || undefined,
      bio: p.bio || undefined,
      how_to_find: `Tell the user they can find this person by searching "@${p.username}" in GeoLink's search bar.`,
    }
  })

  return { matches }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, newMessage } = (await request.json()) as {
      messages: ChatHistoryItem[]
      newMessage: string
    }

    if (!newMessage?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Keep only the last 20 turns of history so the request doesn't grow unbounded.
    const trimmedHistory = (messages || []).slice(-20)

    const contents: GeminiMessage[] = [
      ...trimmedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user' as const, parts: [{ text: newMessage }] },
    ]

    // Step 1: ask Gemini (chat key) with the GeoLink search tool available.
    const firstContent = await callGemini('chat', APERONIX_SYSTEM_PROMPT, contents, [SEARCH_TOOL])
    const functionCall = extractFunctionCall(firstContent)

    if (!functionCall) {
      const reply = extractText(firstContent) || "Sorry, I couldn't come up with a reply. Try again?"
      return NextResponse.json({ reply })
    }

    // Step 2: actually run the search (privacy-filtered), then ask Gemini
    // again (search key this time) to turn the result into a natural reply.
    const toolResult = functionCall.name === 'search_geolink_profiles'
      ? await searchProfiles(functionCall.args?.query || '')
      : { matches: [] }

    const followUpContents: GeminiMessage[] = [
      ...contents,
      { role: 'model', parts: [{ functionCall }] },
      { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: toolResult } }] },
    ]

    const secondContent = await callGemini('search', APERONIX_SYSTEM_PROMPT, followUpContents, [SEARCH_TOOL])
    const reply = extractText(secondContent) || "Sorry, I couldn't finish that search. Try again?"

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Aperonix chat error:', error)
    return NextResponse.json({ error: 'Try again later.' }, { status: 500 })
  }
}
