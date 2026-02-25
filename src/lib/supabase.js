import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

export const supabase = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lockAcquireTimeout: 1000,
      lock: async (name, acquireTimeout, fn) => await fn()
    },
    global: {
      // Abort any Supabase request that hangs longer than 15s
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timeout))
      }
    }
  }
)

// Scout-related queries
export async function getScoutProfile(email) {
  const { data, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('email', email)
    .single()
  if (error) throw error
  return data
}

export async function getScoutLeads(scoutId) {
  const { data, error } = await supabase
    .from('athletes')
    .select(`
      id, first_name, last_name, process_status, created_at, sport,
      profile_photo_url, ai_quick_summary, level_prediction,
      athletic_score, position_primary, updated_at
    `)
    .eq('referred_by_scout_id', scoutId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getScoutCommissions(scoutId) {
  const { data, error } = await supabase
    .from('scout_commissions')
    .select(`
      id,
      amount,
      status,
      paid_at,
      notes,
      created_at,
      athlete:athletes(first_name, last_name)
    `)
    .eq('scout_id', scoutId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getScoutResources() {
  const { data, error } = await supabase
    .from('scout_resources')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getScoutNotificationPrefs(scoutId) {
  const { data, error } = await supabase
    .from('scout_notification_prefs')
    .select('*')
    .eq('scout_id', scoutId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function updateScoutNotificationPrefs(scoutId, prefs) {
  const { data, error } = await supabase
    .from('scout_notification_prefs')
    .upsert({ scout_id: scoutId, ...prefs })
    .select()
    .single()
  if (error) throw error
  return data
}

// Scout profile updates
export async function updateScoutProfile(scoutId, updates) {
  const { data, error } = await supabase
    .from('scouts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', scoutId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function submitForReview(scoutId) {
  const { data, error } = await supabase
    .from('scouts')
    .update({
      profile_status: 'pending',
      profile_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', scoutId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Public profile (no auth needed — uses SECURITY DEFINER RPC)
export async function getPublicScoutProfile(slug) {
  const { data, error } = await supabase.rpc('get_scout_public_profile', { p_slug: slug })
  if (error) throw error
  return data
}

export async function getScoutPublicStats(slug) {
  const { data, error } = await supabase.rpc('get_scout_public_stats', { p_slug: slug })
  if (error) throw error
  return data
}

// Photo upload
export async function uploadScoutPhoto(scoutId, file, type = 'profile') {
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${scoutId}/${type}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('scout-photos')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('scout-photos')
    .getPublicUrl(path)

  return urlData.publicUrl
}

// Events
export async function getUpcomingEvents() {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', todayStr)
    .order('event_date', { ascending: true })
  if (error) throw error
  return data
}

export async function getNextFeaturedEvent() {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_featured', true)
    .gte('event_date', todayStr)
    .order('event_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Website leads from WordPress forms (real referral tracking)
export async function getWebsiteLeads(scoutId) {
  const { data, error } = await supabase
    .from('website_leads')
    .select('id, first_name, last_name, email, sport, form_source, raw_fields, created_at, athlete_id')
    .eq('scout_ref', scoutId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Timeline: recent activity across all scout's athletes (for dashboard feed)
export async function getScoutTimeline(scoutId) {
  const { data, error } = await supabase
    .from('athlete_timeline')
    .select(`
      id, athlete_id, event_type, old_value, new_value, metadata, created_at,
      athlete:athletes!inner(first_name, last_name)
    `)
    .eq('athlete.referred_by_scout_id', scoutId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

// Timeline: events for a specific athlete (for lead detail modal)
export async function getLeadTimeline(athleteId) {
  const { data, error } = await supabase
    .from('athlete_timeline')
    .select('id, event_type, old_value, new_value, metadata, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Company-wide stats for motivation
export async function getCompanyStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Get placed athletes this month
  const { data: placed, error: placedError } = await supabase
    .from('athletes')
    .select('id', { count: 'exact' })
    .eq('process_status', 'Placed')
    .gte('updated_at', startOfMonth)

  // Get new signups this month
  const { data: signups, error: signupsError } = await supabase
    .from('athletes')
    .select('id', { count: 'exact' })
    .gte('created_at', startOfMonth)

  return {
    placedThisMonth: placed?.length || 0,
    signupsThisMonth: signups?.length || 0
  }
}
