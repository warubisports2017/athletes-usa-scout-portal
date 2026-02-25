import { useState, useEffect, useMemo } from 'react'
import { getScoutLeads, getWebsiteLeads } from '../lib/supabase'
import { STATUS_CONFIG, FILTER_CATEGORIES, getStatusStyle, getStatusIndex } from '../lib/constants'
import { Filter, ChevronRight, Link2, Users, ArrowRight, MessageSquare } from 'lucide-react'
import LeadDetail from './LeadDetail'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Mini progress bar showing pipeline stage
function ProgressBar({ status }) {
  const currentOrder = getStatusIndex(status)
  const totalStages = 5 // 0-5
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: totalStages + 1 }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i <= currentOrder
              ? getStatusStyle(status).dot
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function LeadsList({ scoutId }) {
  const [leads, setLeads] = useState([])
  const [websiteLeads, setWebsiteLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    async function fetchLeads() {
      if (!scoutId) return
      try {
        setLoading(true)
        const [data, webData] = await Promise.all([
          getScoutLeads(scoutId),
          getWebsiteLeads(scoutId),
        ])
        setLeads(data || [])
        setWebsiteLeads(webData || [])
      } catch (err) {
        console.error('Error fetching leads:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [scoutId])

  // Split website leads: linked (have athlete_id) vs unlinked
  const unlinkedWebLeads = useMemo(
    () => websiteLeads.filter(wl => !wl.athlete_id),
    [websiteLeads]
  )
  const linkedWebLeadAthleteIds = useMemo(
    () => new Set(websiteLeads.filter(wl => wl.athlete_id).map(wl => wl.athlete_id)),
    [websiteLeads]
  )

  // Filter athletes by selected category
  const filteredLeads = useMemo(() => {
    if (activeFilter === 'all') return leads
    const category = FILTER_CATEGORIES.find(f => f.id === activeFilter)
    if (!category?.statuses) return leads
    return leads.filter(l => category.statuses.includes(l.process_status))
  }, [leads, activeFilter])

  // Funnel stats (computed from loaded data, no extra queries)
  const funnelStats = useMemo(() => ({
    submissions: websiteLeads.length,
    pipeline: leads.length,
    placed: leads.filter(l => l.process_status === 'Placed').length,
  }), [leads, websiteLeads])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ausa-red)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading leads</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (leads.length === 0 && websiteLeads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No leads yet</h3>
        <p className="text-gray-500 text-sm">
          Share your referral link to start tracking athlete leads
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Conversion Funnel */}
      {(funnelStats.submissions > 0 || funnelStats.pipeline > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{funnelStats.submissions}</p>
              <p className="text-xs text-gray-500">Submissions</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 mx-2" />
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{funnelStats.pipeline}</p>
              <p className="text-xs text-gray-500">In Pipeline</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 mx-2" />
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{funnelStats.placed}</p>
              <p className="text-xs text-gray-500">Placed</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Pills */}
      {leads.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTER_CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.id
            const count = cat.statuses
              ? leads.filter(l => cat.statuses.includes(l.process_status)).length
              : leads.length
            return (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--ausa-navy)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
                <span className={`ml-1.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Unlinked Website Submissions */}
      {unlinkedWebLeads.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Website Submissions</h3>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{unlinkedWebLeads.length}</span>
          </div>
          <div className="space-y-2">
            {unlinkedWebLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="text-green-700 font-medium">
                      {(lead.first_name?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 truncate">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      {lead.sport && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.sport}</span>
                      )}
                      {lead.raw_fields?.['Auf welchen Positionen bist du am stärksten?'] && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.raw_fields['Auf welchen Positionen bist du am stärksten?']}</span>
                      )}
                      {lead.raw_fields?.['Heimatland'] && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.raw_fields['Heimatland']}</span>
                      )}
                      {lead.raw_fields?.['In welcher Altersklasse spielst du aktuell?'] && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.raw_fields['In welcher Altersklasse spielst du aktuell?']}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {lead.form_source === 'showcase' ? 'Showcase Form' : 'Evaluation Form'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Under Review</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Athletes (tracked leads) */}
      {filteredLeads.length > 0 && (
        <div>
          {unlinkedWebLeads.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Athletes</h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{filteredLeads.length}</span>
            </div>
          )}
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              const statusStyle = getStatusStyle(lead.process_status)
              const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Athlete'
              const isLinkedFromWeb = linkedWebLeadAthleteIds.has(lead.id)

              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {lead.profile_picture_url ? (
                        <img src={lead.profile_picture_url} alt={fullName} className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium text-lg">
                            {(lead.first_name?.[0] || '?').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-medium text-gray-900 truncate">{fullName}</h3>
                        {lead.sport && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.sport}</span>
                        )}
                        {lead.position_primary && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.position_primary}</span>
                        )}
                        {isLinkedFromWeb && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            <Link2 className="w-3 h-3" /> Via your link
                          </span>
                        )}
                      </div>

                      {/* AI Summary */}
                      {lead.ai_quick_summary && (
                        <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">{lead.ai_quick_summary}</p>
                      )}

                      {/* Progress bar + status */}
                      <div className="mb-1.5">
                        <ProgressBar status={lead.process_status} />
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          {lead.process_status || 'New'}
                        </span>
                        {lead.level_prediction && (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{lead.level_prediction}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatShortDate(lead.updated_at || lead.created_at)}</span>
                      </div>

                      {/* Scout note callout */}
                      {lead.scout_note && (
                        <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800 line-clamp-2">{lead.scout_note}</p>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty filter state */}
      {filteredLeads.length === 0 && leads.length > 0 && (
        <div className="text-center py-8">
          <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No leads match this filter</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="text-sm text-[var(--ausa-red)] font-medium mt-1 hover:underline"
          >
            Show all leads
          </button>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  )
}
