import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { updateScoutProfile, submitForReview, getScoutLeads } from '../lib/supabase'
import PhotoUpload from './PhotoUpload'
import { X, BadgeCheck, Shield, Send, ExternalLink, Save, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const SECTIONS = [
  { id: 'about', label: 'About', fields: ['bio', 'education', 'role_model'] },
  { id: 'sports', label: 'Sports', fields: ['sport', 'division', 'achievements'] },
  { id: 'personal', label: 'Personal', fields: ['favorite_quote', 'favorite_us_location', 'memorable_moment'] },
  { id: 'social', label: 'Links', fields: ['linkedin_url', 'instagram_url', 'calendly_url'] },
  { id: 'media', label: 'Media', fields: ['photo_url', 'sports_photo_url', 'professional_photo_url', 'youtube_urls'] },
]

const FIELD_CONFIG = {
  bio: { label: 'Bio / Summary', placeholder: 'Tell coaches about yourself...', textarea: true },
  education: { label: 'Education', placeholder: 'Where and what did you study?' },
  role_model: { label: 'Role Model', placeholder: 'Who inspires you in sports?' },
  sport: { label: 'Primary Sport', placeholder: 'e.g., Soccer' },
  division: { label: 'Division Focus', placeholder: 'e.g., D1, D2, NAIA' },
  achievements: { label: 'Sports Achievements', placeholder: 'Notable sports achievements...', textarea: true },
  favorite_quote: { label: 'Favorite Quote or Advice', placeholder: 'A quote or piece of advice you live by...' },
  favorite_us_location: { label: 'Favorite US City / State', placeholder: 'e.g., Los Angeles, CA' },
  memorable_moment: { label: 'Most Memorable Sports Moment', placeholder: "A sports moment you'll never forget...", textarea: true },
  linkedin_url: { label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...' },
  instagram_url: { label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
  calendly_url: { label: 'Calendly URL', placeholder: 'https://calendly.com/...' },
  youtube_urls: { label: 'YouTube Video URLs', placeholder: 'One URL per line', textarea: true },
  photo_url: { label: 'Profile Photo', photo: true, type: 'profile' },
  sports_photo_url: { label: 'Sports Photo', photo: true, type: 'sports' },
  professional_photo_url: { label: 'Professional Photo', photo: true, type: 'professional' },
}

export default function ScoutProfile({ onClose }) {
  const { scout, refreshScout } = useAuth()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stats, setStats] = useState({ leads: 0, pipeline: 0 })
  const [activeSection, setActiveSection] = useState('about')

  useEffect(() => {
    if (!scout) return
    setForm({
      bio: scout.bio || '',
      education: scout.education || '',
      role_model: scout.role_model || '',
      sport: scout.sport || '',
      division: scout.division || '',
      achievements: scout.achievements || '',
      favorite_quote: scout.favorite_quote || '',
      favorite_us_location: scout.favorite_us_location || '',
      memorable_moment: scout.memorable_moment || '',
      linkedin_url: scout.linkedin_url || '',
      instagram_url: scout.instagram_url || '',
      calendly_url: scout.calendly_url || '',
      youtube_urls: (scout.youtube_urls || []).join('\n'),
      photo_url: scout.photo_url || '',
      sports_photo_url: scout.sports_photo_url || '',
      professional_photo_url: scout.professional_photo_url || '',
    })
    loadStats()
  }, [scout])

  async function loadStats() {
    try {
      const leads = await getScoutLeads(scout.id)
      setStats({
        leads: leads.length,
        pipeline: leads.filter(l => !['Placed', 'Inactive', 'Cancelled'].includes(l.process_status)).length
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const updates = {
        bio: form.bio,
        education: form.education,
        role_model: form.role_model,
        sport: form.sport,
        division: form.division,
        achievements: form.achievements,
        favorite_quote: form.favorite_quote,
        favorite_us_location: form.favorite_us_location,
        memorable_moment: form.memorable_moment,
        linkedin_url: form.linkedin_url,
        instagram_url: form.instagram_url,
        calendly_url: form.calendly_url,
        youtube_urls: form.youtube_urls
          ? form.youtube_urls.split('\n').map(u => u.trim()).filter(Boolean)
          : [],
      }

      // If editing an approved profile, mark as pending_update
      if (scout.profile_status === 'approved') {
        updates.profile_status = 'pending_update'
      }

      await updateScoutProfile(scout.id, updates)
      await refreshScout()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitForReview(scout.id)
      await refreshScout()
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePhotoUpload(field, url) {
    try {
      await updateScoutProfile(scout.id, { [field]: url })
      setForm(f => ({ ...f, [field]: url }))
      await refreshScout()
    } catch (err) {
      console.error('Photo update failed:', err)
    }
  }

  const scoutSince = scout?.created_at
    ? new Date(scout.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''
  const status = scout?.profile_status || 'draft'

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <StatusBanner status={status} scout={scout} />

        {/* Hero */}
        <div className="text-center">
          {form.photo_url ? (
            <img src={form.photo_url} alt={scout?.full_name} className="w-24 h-24 rounded-full object-cover mx-auto shadow-md" />
          ) : (
            <div className="w-24 h-24 bg-[#E63946] rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="text-white text-3xl font-semibold">
                {scout?.full_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <h3 className="text-xl font-bold text-gray-900">{scout?.full_name}</h3>
            {scout?.is_verified && <BadgeCheck size={20} className="text-[#E63946]" />}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-gray-500">
            <Shield size={14} />
            <span>{scout?.license_number}</span>
            <span>·</span>
            <span>Scout since {scoutSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.leads}</p>
            <p className="text-sm text-gray-500">Leads Referred</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.pipeline}</p>
            <p className="text-sm text-gray-500">In Pipeline</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === s.id
                  ? 'bg-[#E63946] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Form fields for active section */}
        <div className="space-y-4">
          {SECTIONS.find(s => s.id === activeSection)?.fields.map(field => {
            const config = FIELD_CONFIG[field]
            if (!config) return null

            // Photo upload fields
            if (config.photo) {
              return (
                <PhotoUpload
                  key={field}
                  scoutId={scout?.id}
                  currentUrl={form[field]}
                  type={config.type}
                  label={config.label}
                  onUpload={(url) => handlePhotoUpload(field, url)}
                />
              )
            }

            // Text / textarea fields
            const InputTag = config.textarea ? 'textarea' : 'input'
            return (
              <div key={field}>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {config.label}
                </label>
                <InputTag
                  {...(config.textarea ? { rows: 3 } : { type: 'text' })}
                  value={form[field] || ''}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={config.placeholder}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-[#E63946] focus:outline-none transition-colors resize-none"
                />
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle size={18} /> : <Save size={18} />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>

          {(status === 'draft' || status === 'rejected') && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[#E63946] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#d32f3d] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBanner({ status, scout }) {
  const configs = {
    draft: { bg: 'bg-gray-50', border: 'border-gray-200', Icon: AlertCircle, color: 'text-gray-600', text: 'Complete your profile and submit it for review to go live.' },
    pending: { bg: 'bg-amber-50', border: 'border-amber-200', Icon: Clock, color: 'text-amber-700', text: "Your profile is under review. We'll notify you when it's approved." },
    approved: { bg: 'bg-green-50', border: 'border-green-200', Icon: CheckCircle, color: 'text-green-700', text: 'Your profile is live!' },
    rejected: { bg: 'bg-red-50', border: 'border-red-200', Icon: AlertCircle, color: 'text-red-700', text: `Changes requested: ${scout?.reviewer_notes || 'Please update your profile.'}` },
    pending_update: { bg: 'bg-blue-50', border: 'border-blue-200', Icon: Clock, color: 'text-blue-700', text: 'Your updates are pending review. Your public profile shows the last approved version.' },
  }

  const c = configs[status] || configs.draft

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3 flex items-start gap-2.5`}>
      <c.Icon size={18} className={`${c.color} mt-0.5 flex-shrink-0`} />
      <div className="flex-1">
        <p className={`text-sm ${c.color}`}>{c.text}</p>
        {status === 'approved' && scout?.slug && (
          <a
            href={`/s/${scout.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-green-700 font-medium mt-1 hover:underline"
          >
            View public profile <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}
