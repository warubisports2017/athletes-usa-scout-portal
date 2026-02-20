import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      lockAcquireTimeout: 1000,
      lock: async (name, acquireTimeout, fn) => await fn()
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
    .select('id, first_name, last_name, process_status, created_at, sport')
    .eq('referred_by_scout_id', scoutId)
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
