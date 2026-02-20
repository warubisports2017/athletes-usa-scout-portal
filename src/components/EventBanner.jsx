import { useState, useEffect } from 'react'
import { getNextFeaturedEvent } from '../lib/supabase'
import { CalendarDays, MapPin, ChevronRight } from 'lucide-react'

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

export default function EventBanner({ onNavigateToEvents }) {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    getNextFeaturedEvent()
      .then(setEvent)
      .catch(err => console.error('Failed to load featured event:', err))
  }, [])

  if (!event) return null

  return (
    <button
      onClick={onNavigateToEvents}
      className="w-full bg-gradient-to-r from-[#1D3557] to-[#2a4a7f] rounded-xl p-4 text-left hover:opacity-95 transition-opacity relative overflow-hidden"
    >
      {event.cover_image_url && (
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${event.cover_image_url})` }}
        />
      )}
      <div className="relative">
        <p className="text-[10px] font-bold tracking-widest text-red-300 uppercase mb-1">Upcoming Event</p>
        <h3 className="text-white font-bold text-base mb-2">{event.title}</h3>
        <div className="flex items-center gap-3 text-blue-200 text-sm">
          <span className="flex items-center gap-1">
            <CalendarDays size={14} />
            {formatEventDate(event.event_date, event.event_end_date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={14} />
            {event.city}
          </span>
        </div>
        <div className="flex items-center gap-1 text-white/70 text-xs mt-2">
          View Events <ChevronRight size={14} />
        </div>
      </div>
    </button>
  )
}
