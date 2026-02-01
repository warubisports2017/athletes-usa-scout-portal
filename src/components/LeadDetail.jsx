import { useState, useEffect } from 'react'
import { getScoutCommissions } from '../lib/supabase'

// Status pipeline in order
const STATUS_PIPELINE = [
  { key: 'Lead Created', label: 'Lead Created', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  { key: 'Eval Call', label: 'Eval Call', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { key: 'Assessment', label: 'Assessment', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  { key: 'Signed', label: 'Signed', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { key: 'In Process', label: 'In Process', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { key: 'Placed', label: 'Placed', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
]

function getStatusIndex(status) {
  const index = STATUS_PIPELINE.findIndex(s => s.key === status)
  return index >= 0 ? index : 0
}

function getStatusConfig(status) {
  return STATUS_PIPELINE.find(s => s.key === status) || STATUS_PIPELINE[0]
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function LeadDetail({ lead, onClose }) {
  const [commission, setCommission] = useState(null)
  const [loadingCommission, setLoadingCommission] = useState(false)

  const currentStatusIndex = getStatusIndex(lead.process_status)
  const statusConfig = getStatusConfig(lead.process_status)
  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Athlete'
  const isPlaced = lead.process_status === 'Placed'

  // Fetch commission data if athlete is placed
  useEffect(() => {
    async function fetchCommission() {
      if (!isPlaced || !lead.referred_by_scout_id) return

      try {
        setLoadingCommission(true)
        // Note: This fetches all commissions for the scout, then filters
        // In a real app, you'd have a dedicated endpoint for this
        const commissions = await getScoutCommissions(lead.referred_by_scout_id)
        const athleteCommission = commissions?.find(c =>
          c.athlete?.first_name === lead.first_name &&
          c.athlete?.last_name === lead.last_name
        )
        setCommission(athleteCommission)
      } catch (err) {
        console.error('Error fetching commission:', err)
      } finally {
        setLoadingCommission(false)
      }
    }

    fetchCommission()
  }, [lead, isPlaced])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - slides up from bottom on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up md:animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Athlete Profile */}
            <div className="flex items-center gap-4 mb-6">
              {lead.profile_photo_url ? (
                <img
                  src={lead.profile_photo_url}
                  alt={fullName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-semibold text-xl">
                    {(lead.first_name?.[0] || '?').toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{fullName}</h3>
                {lead.sport && (
                  <p className="text-gray-500">{lead.sport}</p>
                )}
              </div>
            </div>

            {/* Current Status */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Current Status</p>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Date Added */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Date Added</p>
              <p className="text-gray-900">{formatDate(lead.created_at)}</p>
            </div>

            {/* Commission Info (only if Placed) */}
            {isPlaced && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
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
                    <p className="text-2xl font-bold text-green-700 mb-1">
                      {formatCurrency(commission.amount)}
                    </p>
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

            {/* Status Timeline */}
            <div>
              <p className="text-sm text-gray-500 mb-4">Progress Timeline</p>
              <div className="relative">
                {STATUS_PIPELINE.map((status, index) => {
                  const isCompleted = index <= currentStatusIndex
                  const isCurrent = index === currentStatusIndex
                  const isLast = index === STATUS_PIPELINE.length - 1

                  return (
                    <div key={status.key} className="relative flex items-start pb-6 last:pb-0">
                      {/* Vertical line */}
                      {!isLast && (
                        <div
                          className={`absolute left-[11px] top-6 w-0.5 h-full ${
                            index < currentStatusIndex ? 'bg-green-300' : 'bg-gray-200'
                          }`}
                        />
                      )}

                      {/* Status dot */}
                      <div className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        isCompleted ? status.dot : 'bg-gray-200'
                      }`}>
                        {isCompleted && (
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Status label */}
                      <div className="ml-4 flex-1">
                        <p className={`text-sm font-medium ${
                          isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {status.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-gray-500 mt-0.5">Current stage</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations (add to index.css if not using Tailwind JIT) */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </>
  )
}
