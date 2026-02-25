/**
 * Full Coach chat tab — message history, starters, input bar, streaming.
 */
import { useState, useEffect, useRef } from 'react'
import { Send, RotateCcw, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { getActiveConversation, getConversationMessages, startNewConversation, sendMessage, getStarters } from '../lib/coach'
import { getScoutLeads } from '../lib/supabase'
import CoachMessage from './CoachMessage'

export default function CoachTab() {
  const { scout } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [leads, setLeads] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversation & leads
  useEffect(() => {
    if (!scout?.id) return
    let cancelled = false

    async function load() {
      try {
        const [conv, scoutLeads] = await Promise.all([
          getActiveConversation(scout.id),
          getScoutLeads(scout.id),
        ])
        if (cancelled) return

        setLeads(scoutLeads || [])

        if (conv) {
          setConversationId(conv.id)
          const msgs = await getConversationMessages(conv.id)
          if (!cancelled) setMessages(msgs)
        }
      } catch (err) {
        console.error('Error loading coach:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [scout?.id])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSend(text) {
    const msg = (text || input).trim()
    if (!msg || sending) return

    setInput('')
    setError(null)
    setSending(true)
    setStreaming('')

    // Add user message to UI immediately
    const userMsg = { id: `temp-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    try {
      const scoutContext = {
        name: scout?.full_name || 'Scout',
        daysSinceJoin,
        totalLeads: leads.length,
        signedLeads: leads.filter(l => ['In Contact', 'In Conversation', 'Offer Received', 'Committed', 'Placed'].includes(l.process_status)).length,
        placedLeads: placedCount,
        profileComplete: !!(scout?.full_name && scout?.photo_url && scout?.bio && scout?.location),
        verified: scout?.is_verified || false,
      }
      const result = await sendMessage(msg, conversationId, scout.id, scoutContext, (fullText) => {
        setStreaming(fullText)
      })

      // Replace streaming with final message
      setStreaming('')
      setConversationId(result.conversationId)

      const assistantMsg = { id: `resp-${Date.now()}`, role: 'assistant', content: result.text, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setStreaming('')
      setError(err.message || 'Failed to send message')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleNewConversation() {
    if (!scout?.id) return
    try {
      const conv = await startNewConversation(scout.id)
      setConversationId(conv.id)
      setMessages([])
      setStreaming('')
      setError(null)
    } catch (err) {
      console.error('Error creating conversation:', err)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const daysSinceJoin = scout?.created_at
    ? Math.floor((Date.now() - new Date(scout.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const placedCount = leads.filter(l => l.process_status === 'Placed').length
  const starters = getStarters(scout, leads.length, placedCount, daysSinceJoin)
  const showStarters = messages.length === 0 && !loading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="sp-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] md:h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Scout Coach</h2>
          <p className="text-xs text-gray-500">Your AI scouting assistant</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={14} />
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showStarters && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏟️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Hey {scout?.full_name?.split(' ')[0] || 'there'}!</h3>
              <p className="text-sm text-gray-500 mt-1">Ask me anything about scouting</p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:border-[#E63946] hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">{s.emoji}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <CoachMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {streaming && (
          <CoachMessage role="assistant" content={streaming} isStreaming />
        )}

        {error && (
          <div className="flex justify-center mb-3">
            <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 bg-white">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            rows={1}
            disabled={sending}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#E63946] bg-gray-50 focus:bg-white transition-colors disabled:opacity-50"
            style={{ maxHeight: '120px' }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#E63946] text-white disabled:opacity-40 hover:bg-[#d32f3d] transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 size={18} className="sp-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
