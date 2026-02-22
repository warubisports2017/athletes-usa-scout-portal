/**
 * Serverless function to proxy Gemini API calls for feedback analysis.
 * Keeps API key server-side only (never in client bundle).
 */

const rateLimit = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 1000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const { message, page } = req.body || {}

  if (!message || typeof message !== 'string' || message.length > 5000) {
    return res.status(400).json({ error: 'Invalid message' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(200).json({
      summary: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      type: 'Other',
    })
  }

  try {
    const prompt = `Summarize this user feedback in ONE line (max 15 words).
Classify as: Bug | Feature | Question | Other

If the feedback is too vague to understand, return type "Unclear" and include a clarifyingQuestion.

Feedback: "${message}"
Page: ${page || 'Scout Portal'}

Return ONLY valid JSON: { "summary": "...", "type": "Bug|Feature|Question|Other|Unclear", "clarifyingQuestion": "optional - only if Unclear" }`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
        }),
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return res.status(200).json({
        summary: parsed.summary || message.slice(0, 100),
        type: parsed.type || 'Other',
        clarifyingQuestion: parsed.clarifyingQuestion || '',
      })
    }

    return res.status(200).json({
      summary: message.slice(0, 100),
      type: 'Other',
    })
  } catch (err) {
    console.error('Gemini API error:', err)
    return res.status(200).json({
      summary: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      type: 'Other',
    })
  }
}
