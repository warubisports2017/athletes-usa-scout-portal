/**
 * Webhook receiver for WPForms submissions from athletes-usa.de.
 * WordPress POSTs form data here via WPCode snippet.
 * Inserts into website_leads table via SECURITY DEFINER RPC.
 */
import { createClient } from '@supabase/supabase-js'

// Simple shared secret to prevent random POSTs
const WEBHOOK_SECRET = process.env.WPFORMS_WEBHOOK_SECRET

// Rate limiting per IP
const rateLimit = new Map()
const RATE_LIMIT = 30
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

// Map WPForms form IDs to source names
const FORM_SOURCES = {
  '1260': 'sportstipendium',
  '5187': 'showcase',
  '3959': 'advertising',
  '6861': 'sportstipendium_en',
}

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify shared secret
  const secret = req.headers['x-webhook-secret'] || req.body?.secret
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  try {
    const { form_id, fields, scout_ref } = req.body

    if (!form_id || !fields) {
      return res.status(400).json({ error: 'Missing form_id or fields' })
    }

    const formSource = FORM_SOURCES[String(form_id)] || `form_${form_id}`

    // Extract common fields from WPForms data
    // Fields come as { "field_id": { "name": "...", "value": "..." } }
    const fieldValues = {}
    if (typeof fields === 'object') {
      for (const [key, field] of Object.entries(fields)) {
        if (field?.name && field?.value) {
          fieldValues[field.name] = field.value
        }
      }
    }

    // Try to extract name, email, phone from common field names
    const firstName = fieldValues['Vorname'] || fieldValues['First Name'] || fieldValues['Name']?.split(' ')[0] || ''
    const lastName = fieldValues['Nachname'] || fieldValues['Last Name'] || fieldValues['Name']?.split(' ').slice(1).join(' ') || ''
    const email = fieldValues['Email'] || fieldValues['E-Mail'] || fieldValues['E-mail'] || ''
    // Phone field names vary across forms (e.g. "Telefon/WhatsApp #"), so match partially
    const phone = Object.entries(fieldValues).find(([k]) => /telefon|phone/i.test(k))?.[1] || ''
    const sport = fieldValues['Sportart'] || fieldValues['Sport'] || ''

    // Init Supabase with anon key (RPC is granted to anon)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call the SECURITY DEFINER function
    const { data, error } = await supabase.rpc('insert_website_lead', {
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email,
      p_phone: phone,
      p_sport: sport,
      p_form_source: formSource,
      p_scout_ref: scout_ref || '',
      p_raw_fields: fieldValues,
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return res.status(500).json({ error: 'Failed to save lead' })
    }

    return res.status(200).json({ success: true, lead_id: data })
  } catch (err) {
    console.error('Webhook error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
