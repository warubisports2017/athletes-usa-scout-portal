import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getUpcomingEvents } from '../lib/supabase'
import { CalendarDays, MapPin, Copy, Check, MessageCircle, QrCode, ExternalLink } from 'lucide-react'
import QRCodeModal from './QRCodeModal'

function formatEventDate(dateStr, endDateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  const opts = { month: 'short', day: 'numeric' }

  if (endDateStr) {
    const endDate = new Date(endDateStr + 'T12:00:00')
    if (date.getMonth() === endDate.getMonth()) {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${endDate.getDate()}, ${date.getFullYear()}`
    }
    return `${date.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}, ${date.getFullYear()}`
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  const diff = Math.ceil((date - now) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

export default function EventsList() {
  const { scout } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [qrModal, setQrModal] = useState({ open: false, url: '', title: '' })

  useEffect(() => {
    getUpcomingEvents()
      .then(data => setEvents(data || []))
      .catch(err => console.error('Failed to load events:', err))
      .finally(() => setLoading(false))
  }, [])

  function buildTrackedUrl(baseUrl) {
    if (!scout?.id) return baseUrl
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}ref=${scout.id}`
  }

  async function copyToClipboard(url, id) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  function shareViaWhatsApp(url, title) {
    const text = `Check out this event: ${title}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E63946]"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="text-[#E63946]" size={28} />
          Events
        </h1>
        <p className="text-gray-500 mt-1">Upcoming camps, showcases & ID events</p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No upcoming events</p>
          <p className="text-sm text-gray-400 mt-1">Check back soon for new events!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const trackedUrl = buildTrackedUrl(event.registration_url)
            const isCopied = copiedId === event.id

            return (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Cover image or gradient placeholder */}
                {event.cover_image_url ? (
                  <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_image_url})` }} />
                ) : (
                  <div className="h-28 bg-gradient-to-r from-[#1D3557] to-[#E63946] flex items-center justify-center">
                    <span className="text-white/80 font-bold text-lg">{event.city}</span>
                  </div>
                )}

                <div className="p-5">
                  {/* Date badge + title */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{event.title}</h3>
                      {event.is_featured && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Featured</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#E63946] whitespace-nowrap bg-red-50 px-2 py-1 rounded-lg">
                      {daysUntil(event.event_date)}
                    </span>
                  </div>

                  {/* Date + Location */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={15} className="text-gray-400" />
                      {formatEventDate(event.event_date, event.event_end_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={15} className="text-gray-400" />
                      {event.venue ? `${event.venue}, ${event.city}` : event.city}
                    </span>
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{event.description}</p>
                  )}

                  {/* Share actions */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => copyToClipboard(trackedUrl, event.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isCopied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isCopied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Link</>}
                    </button>
                    <button
                      onClick={() => shareViaWhatsApp(trackedUrl, event.title)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setQrModal({ open: true, url: trackedUrl, title: event.title })}
                      className="flex items-center justify-center px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>

                  {/* Register button */}
                  <a
                    href={trackedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E63946] hover:bg-[#d32f3c] text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    <ExternalLink size={16} />
                    Register / Learn More
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <QRCodeModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, url: '', title: '' })}
        url={qrModal.url}
        title={qrModal.title}
      />
    </div>
  )
}
