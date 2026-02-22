/**
 * Serverless function: Scout Coach AI chat.
 * Receives message + scout context from client, calls Gemini, streams back.
 * All DB operations happen client-side where auth already works.
 */
import { createClient } from '@supabase/supabase-js'
import { KNOWLEDGE_BASE } from './knowledge.js'

// Rate limiting per scout
const rateLimit = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 1000

function isRateLimited(key) {
  const now = Date.now()
  const entry = rateLimit.get(key)
  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

function buildSystemPrompt(scoutContext) {
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
- Name: ${scoutContext.name || 'Scout'}
- Member since: ${scoutContext.daysSinceJoin || 0} days ago
- Total leads referred: ${scoutContext.totalLeads || 0}
- Signed athletes: ${scoutContext.signedLeads || 0}
- Placed athletes: ${scoutContext.placedLeads || 0}
- Profile complete: ${scoutContext.profileComplete ? 'Yes' : 'No — encourage them to complete it'}
- Verified: ${scoutContext.verified ? 'Yes' : 'Not yet'}

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify JWT via Supabase auth
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

  // Verify the JWT is valid
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // Rate limit by user ID
  if (isRateLimited(user.id)) {
    return res.status(429).json({ error: 'Too many messages. Please wait a moment.' })
  }

  const { message, history, scoutContext } = req.body || {}

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ error: 'Invalid message' })
  }

  try {
    // Build Gemini request
    const systemPrompt = buildSystemPrompt(scoutContext || {})
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am the Warubi Scout Coach. I will help this scout with their questions about scouting, recruiting, and Athletes USA.' }] },
    ]

    // Add conversation history from client
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

    let fullResponse = ''

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
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    console.error('Coach chat error:', err)
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'An error occurred' })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
