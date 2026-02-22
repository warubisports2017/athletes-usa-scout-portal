/**
 * Coach chat logic: conversation management, streaming, starters.
 * All DB operations happen client-side (RLS handles access control).
 * Only Gemini calls go through the serverless function.
 */
import { supabase } from './supabase'

// Get active conversation for current scout
export async function getActiveConversation(scoutId) {
  const { data, error } = await supabase
    .from('coach_conversations')
    .select('id, title, message_count, last_message_at, created_at')
    .eq('scout_id', scoutId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Get messages for a conversation
export async function getConversationMessages(conversationId) {
  const { data, error } = await supabase
    .from('coach_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// Start a new conversation (deactivate old ones)
export async function startNewConversation(scoutId) {
  // Deactivate existing conversations
  await supabase
    .from('coach_conversations')
    .update({ is_active: false })
    .eq('scout_id', scoutId)
    .eq('is_active', true)

  const { data, error } = await supabase
    .from('coach_conversations')
    .insert({ scout_id: scoutId })
    .select('id, title, message_count, created_at')
    .single()
  if (error) throw error
  return data
}

// Get or create active conversation
async function ensureConversation(scoutId) {
  const existing = await getActiveConversation(scoutId)
  if (existing) return existing.id

  const created = await startNewConversation(scoutId)
  return created.id
}

// Send message with streaming
export async function sendMessage(message, conversationId, scoutId, scoutContext, onChunk) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  // Ensure we have a conversation
  const convId = conversationId || await ensureConversation(scoutId)

  // Save user message to DB
  const { error: insertError } = await supabase.from('coach_messages').insert({
    conversation_id: convId,
    scout_id: scoutId,
    role: 'user',
    content: message,
  })
  if (insertError) throw insertError

  // Load last 20 messages for context
  const { data: history } = await supabase
    .from('coach_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Call serverless function for Gemini streaming
  const response = await fetch('/api/coach-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message,
      history: history || [],
      scoutContext,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Request failed (${response.status})`)
  }

  // Read SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'text') {
          fullText += data.content
          onChunk?.(fullText, data.content)
        } else if (data.type === 'error') {
          throw new Error(data.message)
        }
      } catch (e) {
        if (e.message && e.message !== 'Unexpected end of JSON input') throw e
      }
    }
  }

  // Save assistant response to DB
  if (fullText) {
    await supabase.from('coach_messages').insert({
      conversation_id: convId,
      scout_id: scoutId,
      role: 'assistant',
      content: fullText,
    })
  }

  return { text: fullText, conversationId: convId }
}

// Dynamic conversation starters based on scout state
export function getStarters(scout, leadsCount, placedCount, daysSinceJoin) {
  if (leadsCount === 0 && daysSinceJoin < 7) {
    // Brand new scout
    return [
      { emoji: '👋', text: 'How does scouting work?' },
      { emoji: '🎯', text: "What's my first step as a scout?" },
      { emoji: '💰', text: 'How do I earn commissions?' },
    ]
  }

  if (placedCount > 0) {
    // Successful scout
    return [
      { emoji: '📋', text: 'Quick eligibility recap' },
      { emoji: '⭐', text: 'How do showcases work?' },
      { emoji: '💸', text: 'Commission payout timeline' },
    ]
  }

  // Active scout with leads
  return [
    { emoji: '💬', text: 'Tips for talking to parents' },
    { emoji: '📅', text: 'Recruiting timeline overview' },
    { emoji: '🔍', text: 'How to find more athletes' },
  ]
}
