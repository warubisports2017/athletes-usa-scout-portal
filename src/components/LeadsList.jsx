import { useState, useEffect } from 'react'
import { getScoutLeads, getWebsiteLeads } from '../lib/supabase'
import LeadDetail from './LeadDetail'

// Status configuration with Tailwind colors
const STATUS_CONFIG = {
  'Lead Created': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Lead Created' },
  'Eval Call': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Eval Call' },
  'Assessment': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Assessment' },
  'Signed': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Signed' },
  'In Process': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'In Process' },
  'Placed': { bg: 'bg-green-100', text: 'text-green-700', label: 'Placed' },
}

function getStatusStyle(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['Lead Created']
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

export default function LeadsList({ scoutId }) {
  const [leads, setLeads] = useState([])
  const [websiteLeads, setWebsiteLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)

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
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
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
      {/* Website Form Submissions */}
      {websiteLeads.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Website Submissions via Your Link</h3>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{websiteLeads.length}</span>
          </div>
          <div className="space-y-2">
            {websiteLeads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="text-green-700 font-medium">
                      {(lead.first_name?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {lead.first_name} {lead.last_name}
                      </h3>
                      {lead.sport && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{lead.sport}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {lead.form_source === 'showcase' ? 'Showcase Form' : 'Evaluation Form'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracked Athletes */}
      <div className="space-y-3">
        {leads.map((lead) => {
          const statusStyle = getStatusStyle(lead.process_status)
          const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Athlete'

          return (
            <div
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {lead.profile_photo_url ? (
                    <img
                      src={lead.profile_photo_url}
                      alt={fullName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium text-lg">
                        {(lead.first_name?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{fullName}</h3>
                    {lead.sport && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {lead.sport}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                      {statusStyle.label}
                    </span>
                    <span className="text-gray-400">
                      {formatDate(lead.created_at)}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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
