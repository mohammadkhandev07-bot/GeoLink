'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Send, Menu, Plus, Trash2, X, Sparkles } from 'lucide-react'
import { useAperonixChats, AperonixMessage } from '@/lib/hooks/useAperonixChats'

export default function AperonixPage() {
  const {
    conversations,
    activeId,
    setActiveId,
    activeConversation,
    createConversation,
    deleteConversation,
    addMessage,
    loaded,
  } = useAperonixChats()

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Grows the box to fit whatever's been typed (up to a cap, then it
  // scrolls internally) instead of the text scrolling sideways in a
  // single-line input.
  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  useEffect(() => {
    resizeTextarea()
  }, [input])

  useEffect(() => {
    if (loaded && !activeId) {
      if (conversations.length > 0) setActiveId(conversations[0].id)
    }
  }, [loaded, activeId, conversations, setActiveId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages.length, sending])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    let conversationId = activeId
    if (!conversationId) {
      conversationId = createConversation()
    }

    setInput('')
    setSending(true)

    const userMessage: AperonixMessage = { role: 'user', content: text, timestamp: Date.now() }
    addMessage(conversationId, userMessage)

    try {
      const history = (activeConversation?.messages ?? []).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/aperonix/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, newMessage: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      addMessage(conversationId, { role: 'model', content: data.reply, timestamp: Date.now() })
    } catch (err: any) {
      addMessage(conversationId, {
        role: 'model',
        content: 'Try again later.',
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
    }
  }

  const handleNewChat = () => {
    createConversation()
    setShowHistory(false)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* History panel */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-card border-r flex-col
        ${showHistory ? 'flex' : 'hidden md:flex'}
      `}>
        <div className="p-3 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">All Chats</p>
          <button onClick={() => setShowHistory(false)} className="md:hidden text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={handleNewChat}
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-pink-500/30 hover:border-pink-500 hover:bg-pink-500/5 text-pink-500 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">No chats yet. Start a conversation with Aperonix!</p>
          ) : conversations.map(convo => (
            <div
              key={convo.id}
              onClick={() => { setActiveId(convo.id); setShowHistory(false) }}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                convo.id === activeId ? 'bg-pink-500/10 text-pink-500' : 'hover:bg-accent'
              }`}
            >
              <span className="text-sm truncate">{convo.title}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteConversation(convo.id) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 shrink-0 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowHistory(false)} />
      )}

      {/* Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 p-3 border-b">
          <button onClick={() => setShowHistory(true)} className="md:hidden text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <Image src="/images/aperonix-logo.png" alt="Aperonix" width={28} height={28} className="rounded-full" />
          <div>
            <p className="font-semibold text-sm">Aperonix</p>
            <p className="text-xs text-muted-foreground">GeoLink's official AI</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!activeConversation || activeConversation.messages.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold text-foreground">Hey, I'm Aperonix 👋</p>
              <p className="text-sm max-w-xs">Ask me anything about GeoLink, or just chat with me about whatever's on your mind.</p>
            </div>
          )}

          {activeConversation?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'bg-muted'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Message Aperonix..."
            rows={1}
            className="flex-1 bg-muted rounded-2xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-pink-500 resize-none overflow-y-auto leading-relaxed"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
