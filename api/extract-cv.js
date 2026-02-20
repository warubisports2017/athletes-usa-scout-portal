const rateLimit = new Map()

export const config = { maxDuration: 30 }

const ALLOWED_FIELDS = ['bio', 'education', 'achievements', 'sport', 'linkedin_url', 'instagram_url']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 3 requests per minute per IP
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (entry) {
    if (now - entry.resetTime > 60_000) {
      rateLimit.set(ip, { count: 1, resetTime: now })
    } else if (entry.count >= 3) {
      return res.status(429).json({ error: 'Too many requests. Try again in a minute.' })
    } else {
      entry.count++
    }
  } else {
    rateLimit.set(ip, { count: 1, resetTime: now })
  }

  const { pdfBase64 } = req.body || {}
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return res.status(400).json({ error: 'Missing pdfBase64' })
  }

  // ~5MB base64 ≈ ~3.75MB file
  if (pdfBase64.length > 7_000_000) {
    return res.status(400).json({ error: 'File too large (max 5MB)' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: pdfBase64,
                },
              },
              {
                text: `Extract profile information from this CV/resume. Return ONLY a JSON object with these fields (omit any field not confidently found):

- "bio": Professional summary in 2-4 sentences, English, max 300 characters
- "education": Degree and institution (e.g., "B.S. Sports Science, University of Cologne")
- "achievements": Notable sports or professional achievements, max 300 characters
- "sport": Primary sport mentioned
- "linkedin_url": LinkedIn profile URL if present in contact/header section
- "instagram_url": Instagram profile URL if present in contact/header section

Return ONLY valid JSON, no markdown, no explanation. Example:
{"bio": "...", "education": "...", "sport": "Soccer"}`,
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return res.status(502).json({ error: 'AI extraction failed' })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(200).json({ extracted: {}, message: 'No profile data found in CV' })
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return res.status(200).json({ extracted: {}, message: 'No profile data found in CV' })
    }

    // Whitelist only allowed fields and sanitize
    const extracted = {}
    for (const field of ALLOWED_FIELDS) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        extracted[field] = parsed[field].trim().slice(0, 500)
      }
    }

    return res.status(200).json({ extracted })
  } catch (err) {
    console.error('CV extraction error:', err)
    return res.status(500).json({ error: 'Extraction failed' })
  }
}
