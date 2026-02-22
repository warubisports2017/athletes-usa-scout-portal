/**
 * Serverless function: Scout Coach AI chat.
 * JWT auth via anon key, rate limit (10/min/scout), Gemini streaming.
 */
import { createClient } from '@supabase/supabase-js'
import { KNOWLEDGE_BASE } from './knowledge.js'

// Rate limiting per scout
const rateLimit = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 1000

function isRateLimited(scoutId) {
  const now = Date.now()
  const entry = rateLimit.get(scoutId)
  if (!entry || now > entry.resetTime) {
    rateLimit.set(scoutId, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

function buildSystemPrompt(scout, leads, commissions) {
  const totalLeads = leads?.length || 0
  const placedLeads = leads?.filter(l => l.process_status === 'Placed')?.length || 0
  const signedLeads = leads?.filter(l => ['Signed', 'In Process', 'Placed'].includes(l.process_status))?.length || 0
  const totalCommission = commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0
  const paidCommission = commissions?.filter(c => c.status === 'paid')?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0

  const daysSinceJoin = scout?.created_at
    ? Math.floor((Date.now() - new Date(scout.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const profileComplete = !!(scout?.full_name && scout?.photo_url && scout?.bio && scout?.location)

  return `You are the Warubi Scout Coach — a friendly, knowledgeable AI assistant embedded in the Athletes USA Scout Portal.

IDENTITY & TONE:
- You are motivational, concise, and supportive
- Use the scout's first name when natural
- Keep responses under 200 words unless the question requires more detail
- Use bullet points and short paragraphs for readability
- Respond in the same language the scout writes in (German if they write German, English if English, etc.)
- Be encouraging but honest — don't overpromise

SAFETY RULES:
- NEVER share specific pricing, fees, or commission rates — direct them to athletesusa.org or the AUSA team
- NEVER give legal or immigration advice — say "consult with AUSA team or an immigration professional"
- NEVER share other scouts' data or personal information
- If you don't know something specific, say so honestly and suggest who to ask
- Stay on topic: scouting, recruiting, athletes, AUSA. Redirect off-topic questions politely.

SCOUT CONTEXT:
- Name: ${scout?.full_name || 'Scout'}
- Member since: ${daysSinceJoin} days ago
- Total leads referred: ${totalLeads}
- Signed athletes: ${signedLeads}
- Placed athletes: ${placedLeads}
- Total commission earned: €${totalCommission.toFixed(0)}
- Commission paid out: €${paidCommission.toFixed(0)}
- Profile complete: ${profileComplete ? 'Yes' : 'No — encourage them to complete it'}
- Verified: ${scout?.is_verified ? 'Yes' : 'Not yet'}

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }
  if (!geminiKey) {
    return res.status(500).json({ error: 'AI service not configured' })
  }

  // Create authenticated Supabase client using scout's JWT
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const scoutId = user.id

  // Rate limit by scout
  if (isRateLimited(scoutId)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a moment.' })
  }

  const { message, conversationId } = req.body || {}

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ error: 'Invalid message' })
  }

  try {
    // Get scout profile, leads, and commissions for context
    const [scoutRes, leadsRes, commissionsRes] = await Promise.all([
      supabase.from('scouts').select('*').eq('id', scoutId).single(),
      supabase.from('athletes').select('id, process_status').eq('referred_by_scout_id', scoutId),
      supabase.from('scout_commissions').select('amount, status').eq('scout_id', scoutId),
    ])

    const scout = scoutRes.data
    const leads = leadsRes.data || []
    const commissions = commissionsRes.data || []

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      // Find active conversation
      const { data: activeConv } = await supabase
        .from('coach_conversations')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeConv) {
        convId = activeConv.id
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('coach_conversations')
          .insert({ scout_id: scoutId })
          .select('id')
          .single()
        if (convError) throw convError
        convId = newConv.id
      }
    }

    // Load conversation history (last 20 messages for context)
    const { data: history } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(20)

    // Save user message
    await supabase.from('coach_messages').insert({
      conversation_id: convId,
      scout_id: scoutId,
      role: 'user',
      content: message,
    })

    // Build Gemini request
    const systemPrompt = buildSystemPrompt(scout, leads, commissions)
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Warubi Scout Coach. I will help this scout with their questions about scouting, recruiting, and Athletes USA.' }] },
    ]

    // Add conversation history
    if (history?.length) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })
      }
    }

    // Add current message
    contents.push({ role: 'user', parts: [{ text: message }] })

    // Stream from Gemini
    const startTime = Date.now()
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.9,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, errText)
      return res.status(502).json({ error: 'AI service error' })
    }

    // Set up SSE streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    // Send conversation ID first
    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`)

    let fullResponse = ''
    let tokensUsed = 0

    // Read the stream
    const reader = geminiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process SSE events from buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() // Keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            fullResponse += text
            res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
          }
          // Track tokens
          if (parsed.usageMetadata?.totalTokenCount) {
            tokensUsed = parsed.usageMetadata.totalTokenCount
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    const latencyMs = Date.now() - startTime

    // Save assistant response
    if (fullResponse) {
      await supabase.from('coach_messages').insert({
        conversation_id: convId,
        scout_id: scoutId,
        role: 'assistant',
        content: fullResponse,
        tokens_used: tokensUsed || null,
        latency_ms: latencyMs,
      })
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Coach chat error:', err)
    // If headers already sent, end stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred' })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
