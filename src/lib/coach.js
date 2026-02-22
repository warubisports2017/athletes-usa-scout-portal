/**
 * Coach chat logic: conversation management, streaming, starters.
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

// Send message with streaming
export async function sendMessage(message, conversationId, onChunk) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const response = await fetch('/api/coach-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ message, conversationId }),
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
  let convId = conversationId

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
        if (data.type === 'meta') {
          convId = data.conversationId
        } else if (data.type === 'text') {
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
