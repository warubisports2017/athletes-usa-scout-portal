import { useState, useEffect } from 'react'
import { getScoutCommissions, getLeadTimeline } from '../lib/supabase'
import { STATUS_PIPELINE, getStatusIndex, getStatusStyle } from '../lib/constants'
import { MessageSquare, Brain, Clock, ArrowUpRight, Link2, FileText } from 'lucide-react'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return formatDate(dateString)
}

// Event type display config
const EVENT_CONFIG = {
  status_change: { icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-100' },
  note_added: { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-100' },
  lead_created: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  lead_linked: { icon: Link2, color: 'text-teal-600', bg: 'bg-teal-100' },
}

function getEventLabel(event) {
  switch (event.event_type) {
    case 'status_change':
      return `Moved to ${event.new_value}`
    case 'note_added':
      return 'Admin note added'
    case 'lead_created':
      return 'Lead created'
    case 'lead_linked':
      return 'Website lead linked'
    default:
      return event.event_type
  }
}

export default function LeadDetail({ lead, onClose }) {
  const [commission, setCommission] = useState(null)
  const [loadingCommission, setLoadingCommission] = useState(false)
  const [timeline, setTimeline] = useState([])
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  const currentStatusIndex = getStatusIndex(lead.process_status)
  const statusConfig = getStatusStyle(lead.process_status)
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Athlete'
  const isPlaced = lead.process_status === 'Placed'

  // Fetch timeline + commission in parallel
  useEffect(() => {
    async function fetchData() {
      const promises = []

      // Timeline
      promises.push(
        getLeadTimeline(lead.id)
          .then(data => setTimeline(data || []))
          .catch(err => console.error('Error fetching timeline:', err))
          .finally(() => setLoadingTimeline(false))
      )

      // Commission (only if placed)
      if (isPlaced && lead.referred_by_scout_id) {
        setLoadingCommission(true)
        promises.push(
          getScoutCommissions(lead.referred_by_scout_id)
            .then(commissions => {
              const match = commissions?.find(c =>
                c.athlete?.first_name === lead.first_name &&
                c.athlete?.last_name === lead.last_name
              )
              setCommission(match)
            })
            .catch(err => console.error('Error fetching commission:', err))
            .finally(() => setLoadingCommission(false))
        )
      }

      await Promise.all(promises)
    }

    fetchData()
  }, [lead.id, isPlaced])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up md:animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Athlete Profile */}
            <div className="flex items-center gap-4">
              {lead.profile_picture_url ? (
                <img src={lead.profile_picture_url} alt={fullName} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-semibold text-xl">
                    {(lead.first_name?.[0] || '?').toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{fullName}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {lead.sport && <span className="text-sm text-gray-500">{lead.sport}</span>}
                  {lead.position_primary && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.position_primary}</span>
                  )}
                  {lead.level_prediction && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{lead.level_prediction}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Current Status + Progress */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Current Status</p>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {lead.process_status || 'Lead Created'}
              </span>
              {/* Mini progress bar */}
              <div className="flex gap-1 mt-3">
                {STATUS_PIPELINE.map((stage, i) => (
                  <div
                    key={stage.key}
                    className={`h-2 flex-1 rounded-full ${
                      i <= currentStatusIndex ? stage.dot : 'bg-gray-200'
                    }`}
                    title={stage.label}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-400">Lead Created</span>
                <span className="text-[10px] text-gray-400">Placed</span>
              </div>
            </div>

            {/* Admin Note */}
            {lead.scout_note && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Note from Admin</span>
                </div>
                <p className="text-sm text-amber-900">{lead.scout_note}</p>
              </div>
            )}

            {/* AI Assessment */}
            {lead.ai_quick_summary && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-800">AI Assessment</span>
                </div>
                <p className="text-sm text-indigo-900">{lead.ai_quick_summary}</p>
              </div>
            )}

            {/* Date Added */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Date Added</p>
              <p className="text-gray-900">{formatDate(lead.created_at)}</p>
            </div>

            {/* Commission Info (only if Placed) */}
            {isPlaced && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-800">Commission Earned</span>
                </div>
                {loadingCommission ? (
                  <div className="animate-pulse h-6 bg-green-100 rounded w-24"></div>
                ) : commission ? (
                  <>
                    <p className="text-2xl font-bold text-green-700 mb-1">{formatCurrency(commission.amount)}</p>
                    <p className="text-sm text-green-600">
                      Status: {commission.status === 'paid' ? (
                        <span className="font-medium">Paid on {formatDate(commission.paid_at)}</span>
                      ) : (
                        <span className="font-medium">Pending</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-green-600">Commission details being processed</p>
                )}
              </div>
            )}

            {/* Activity Timeline */}
            <div>
              <p className="text-sm text-gray-500 mb-3">Activity Timeline</p>
              {loadingTimeline ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-200"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : timeline.length > 0 ? (
                <div className="relative">
                  {/* Timeline entries (newest last = ascending order from query) displayed bottom-to-top */}
                  {[...timeline].reverse().map((event, index) => {
                    const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.lead_created
                    const Icon = config.icon
                    const isLast = index === timeline.length - 1

                    return (
                      <div key={event.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                        {/* Connecting line */}
                        {!isLast && (
                          <div className="absolute left-[13px] top-7 w-0.5 h-[calc(100%-12px)] bg-gray-200" />
                        )}
                        {/* Icon */}
                        <div className={`relative flex-shrink-0 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center`}>
                          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{getEventLabel(event)}</p>
                          {event.event_type === 'note_added' && event.new_value && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">"{event.new_value}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(event.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Fallback: static pipeline when no timeline data */
                <div className="relative">
                  {STATUS_PIPELINE.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex
                    const isCurrent = index === currentStatusIndex
                    const isLast = index === STATUS_PIPELINE.length - 1

                    return (
                      <div key={status.key} className="relative flex items-start pb-6 last:pb-0">
                        {!isLast && (
                          <div className={`absolute left-[11px] top-6 w-0.5 h-full ${
                            index < currentStatusIndex ? 'bg-green-300' : 'bg-gray-200'
                          }`} />
                        )}
                        <div className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          isCompleted ? status.dot : 'bg-gray-200'
                        }`}>
                          {isCompleted && (
                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <p className={`text-sm font-medium ${
                            isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {status.label}
                          </p>
                          {isCurrent && <p className="text-xs text-gray-500 mt-0.5">Current stage</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </>
  )
}
