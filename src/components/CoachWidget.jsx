/**
 * Floating coach widget — compact chat drawer on non-Coach pages.
 * Positioned above FeedbackButton.
 */
import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getActiveConversation, getConversationMessages, sendMessage } from '../lib/coach'
import CoachMessage from './CoachMessage'

export default function CoachWidget() {
  const { scout } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversation when first opened
  useEffect(() => {
    if (!open || loaded || !scout?.id) return

    async function load() {
      try {
        const conv = await getActiveConversation(scout.id)
        if (conv) {
          setConversationId(conv.id)
          const msgs = await getConversationMessages(conv.id)
          setMessages(msgs)
        }
      } catch (err) {
        console.error('Error loading coach widget:', err)
      } finally {
        setLoaded(true)
      }
    }

    load()
  }, [open, loaded, scout?.id])

  // Auto-scroll
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming, open])

  // Focus input when opened
  useEffect(() => {
    if (open && loaded) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, loaded])

  async function handleSend() {
    const msg = input.trim()
    if (!msg || sending) return

    setInput('')
    setError(null)
    setSending(true)
    setStreaming('')

    const userMsg = { id: `temp-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    try {
      const result = await sendMessage(msg, conversationId, (fullText) => {
        setStreaming(fullText)
      })

      setStreaming('')
      setConversationId(result.conversationId)
      const assistantMsg = { id: `resp-${Date.now()}`, role: 'assistant', content: result.text, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setStreaming('')
      setError(err.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sp-coach-widget-button"
          aria-label="Ask Coach"
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Chat drawer */}
      {open && (
        <div className="sp-coach-widget-drawer">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#E63946]" />
              <span className="text-sm font-semibold text-gray-900">Scout Coach</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Ask me anything about scouting</p>
              </div>
            )}

            {messages.map((msg) => (
              <CoachMessage key={msg.id} role={msg.role} content={msg.content} />
            ))}

            {streaming && (
              <CoachMessage role="assistant" content={streaming} isStreaming />
            )}

            {error && (
              <div className="text-center mb-2">
                <span className="text-xs text-red-500">{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Quick question..."
                disabled={sending}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63946] bg-gray-50 focus:bg-white transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E63946] text-white disabled:opacity-40 hover:bg-[#d32f3d] transition-colors flex-shrink-0"
              >
                {sending ? <Loader2 size={14} className="sp-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
