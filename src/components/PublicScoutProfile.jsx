import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicScoutProfile, getScoutPublicStats } from '../lib/supabase'
import { BadgeCheck, Shield, Linkedin, Instagram, Calendar, ExternalLink, Play } from 'lucide-react'

export default function PublicScoutProfile() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (slug) loadProfile()
  }, [slug])

  async function loadProfile() {
    try {
      const [profileData, statsData] = await Promise.all([
        getPublicScoutProfile(slug),
        getScoutPublicStats(slug)
      ])

      if (!profileData) {
        setNotFound(true)
      } else {
        setProfile(profileData)
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E63946]"></div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-500 text-sm">This scout profile doesn't exist or hasn't been published yet.</p>
        </div>
      </div>
    )
  }

  const p = profile.approved_profile || {}
  const scoutSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-[#1D3557] text-white py-3 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-sm tracking-wide">Athletes USA</span>
          <a
            href="https://athletesusa.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            athletesusa.org
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          {p.photo_url ? (
            <img src={p.photo_url} alt={profile.full_name} className="w-28 h-28 rounded-full object-cover mx-auto shadow-md" />
          ) : (
            <div className="w-28 h-28 bg-[#E63946] rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="text-white text-4xl font-semibold">
                {profile.full_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
            {profile.is_verified && <BadgeCheck size={22} className="text-[#E63946]" />}
          </div>

          <div className="flex items-center justify-center gap-2 mt-1.5 text-sm text-gray-500">
            <Shield size={14} />
            <span>{profile.license_number}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Active AUSA Scout since {scoutSince}</p>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-gray-900">{stats.leads_referred}</p>
                <p className="text-xs text-gray-500">Athletes Referred</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xl font-bold text-gray-900">{stats.in_pipeline}</p>
                <p className="text-xs text-gray-500">In Pipeline</p>
              </div>
            </div>
          )}

          {/* Social links */}
          {(p.linkedin_url || p.instagram_url || p.calendly_url) && (
            <div className="flex items-center justify-center gap-3 mt-5">
              {p.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <Linkedin size={18} className="text-gray-700" />
                </a>
              )}
              {p.instagram_url && (
                <a href={p.instagram_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <Instagram size={18} className="text-gray-700" />
                </a>
              )}
              {p.calendly_url && (
                <a href={p.calendly_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <Calendar size={18} className="text-gray-700" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bio */}
        {p.bio && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{p.bio}</p>
          </div>
        )}

        {/* Details */}
        {(p.sport || p.education || p.achievements || p.favorite_quote || p.role_model || p.favorite_us_location || p.memorable_moment) && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              More About {profile.full_name?.split(' ')[0]}
            </h2>
            <div className="space-y-4">
              <Detail label="Sport & Division" value={[p.sport, p.division].filter(Boolean).join(' · ')} />
              <Detail label="Education" value={p.education} />
              <Detail label="Achievements" value={p.achievements} />
              <Detail label="Favorite Quote" value={p.favorite_quote} />
              <Detail label="Role Model" value={p.role_model} />
              <Detail label="Favorite US Location" value={p.favorite_us_location} />
              <Detail label="Most Memorable Moment" value={p.memorable_moment} />
            </div>
          </div>
        )}

        {/* Photos */}
        {(p.sports_photo_url || p.professional_photo_url) && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {p.sports_photo_url && (
                <img src={p.sports_photo_url} alt="Sports" className="w-full rounded-xl object-cover aspect-[4/3]" />
              )}
              {p.professional_photo_url && (
                <img src={p.professional_photo_url} alt="Professional" className="w-full rounded-xl object-cover aspect-[4/3]" />
              )}
            </div>
          </div>
        )}

        {/* YouTube videos */}
        {p.youtube_urls?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Videos</h2>
            <div className="space-y-3">
              {p.youtube_urls.map((url, i) => {
                const videoId = extractYouTubeId(url)
                return videoId ? (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Video ${i + 1}`}
                    />
                  </div>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#E63946] hover:underline">
                    <Play size={16} /> {url}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-[#E63946] rounded-2xl p-6 mt-6 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Get Your Free Evaluation</h2>
          <p className="text-white/80 text-sm mb-4">
            Want to play college sports in the USA? Get a free evaluation from Athletes USA.
          </p>
          <a
            href={`https://athletesusa.org/free-evaluation/?ref=${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#E63946] px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Now <ExternalLink size={16} />
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pb-8">
          <p className="text-xs text-gray-400">
            Part of <strong>Athletes USA</strong> — 250+ athletes placed at US colleges
          </p>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{value}</dd>
    </div>
  )
}

function extractYouTubeId(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
  return match?.[1] || null
}
