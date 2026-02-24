import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getScoutLeads, getScoutCommissions, getWebsiteLeads } from '../lib/supabase'
import { Share2, BookOpen, CheckCircle, Users, Trophy, DollarSign, Globe, ArrowRight } from 'lucide-react'
import EventBanner from './EventBanner'

// Scout level config
const SCOUT_LEVELS = {
  champion:   { label: 'Champion',   emoji: '🏆', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  pathfinder: { label: 'Pathfinder', emoji: '⭐', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  connector:  { label: 'Connector',  emoji: '🤝', bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  starter:    { label: 'Starter',    emoji: '🌱', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' },
}

const STATUS_PRIORITY = { 'Placed': 4, 'In Process': 3, 'Signed': 3, 'Assessment': 2, 'Eval Call': 2, 'Lead Created': 1 }

function getScoutLevel(leads, websiteLeads) {
  const highest = Math.max(0, ...leads.map(l => STATUS_PRIORITY[l.process_status] || 0))
  if (highest >= 4) return 'champion'
  if (highest >= 3) return 'pathfinder'
  if (highest >= 2) return 'connector'
  if (leads.length > 0 || websiteLeads.length > 0) return 'starter'
  return null
}

// Pipeline stages in funnel order
const PIPELINE_STAGES = ['Lead Created', 'Eval Call', 'Assessment', 'Signed', 'In Process', 'Placed']

// Status color mapping
const statusColors = {
  'Lead Created': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  'Eval Call': { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  'Assessment': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Signed': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'In Process': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Placed': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
}

function getStatusStyle(status) {
  return statusColors[status] || statusColors['Lead Created']
}

function formatDate(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export default function Dashboard({ onNavigateToEvents, onNavigateToShare, onNavigateToResources, onNavigateToCommission }) {
  const { scout, user } = useAuth()
  const [leads, setLeads] = useState([])
  const [websiteLeads, setWebsiteLeads] = useState([])
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (scout?.id) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [scout?.id])

  async function loadData() {
    try {
      setLoading(true)
      const [leadsData, commissionsData, webLeadsData] = await Promise.all([
        getScoutLeads(scout.id),
        getScoutCommissions(scout.id),
        getWebsiteLeads(scout.id),
      ])
      setLeads(leadsData || [])
      setWebsiteLeads(webLeadsData || [])
      setCommissions(commissionsData || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats (combine tracked athletes + website form submissions)
  const totalLeads = leads.length + websiteLeads.length
  const placedCount = leads.filter(l => l.process_status === 'Placed').length
  const totalEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount || 0), 0)

  // Scout level
  const scoutLevel = getScoutLevel(leads, websiteLeads)
  const levelConfig = scoutLevel ? SCOUT_LEVELS[scoutLevel] : null

  // Pipeline breakdown (for Impact Card)
  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    const count = leads.filter(l => l.process_status === stage).length
    if (count > 0) acc.push({ stage, count })
    return acc
  }, [])

  // Get first 5 leads for preview
  const previewLeads = leads.slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ausa-red)]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6">
        {/* Desktop: Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--ausa-navy)] flex items-center justify-center text-white font-semibold text-lg">
                  {scout?.first_name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{scout?.full_name || 'Scout'}</h1>
                    {scout?.is_active && (
                      <CheckCircle className="w-5 h-5 text-[var(--ausa-success)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {scout?.is_active && (
                      <span className="text-sm text-gray-500">Active Scout</span>
                    )}
                    {levelConfig && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}>
                        {levelConfig.emoji} {levelConfig.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Banner */}
            <EventBanner onNavigateToEvents={onNavigateToEvents} />

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
            <p className="text-xs text-gray-500">Total Leads</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{placedCount}</p>
            <p className="text-xs text-gray-500">Placed</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
            <p className="text-xs text-gray-500">Earned</p>
          </div>
        </div>

            {/* Your Impact - Mobile only */}
            <div className="sp-impact-card lg:hidden">
              <h2 className="font-semibold text-gray-900 mb-1">Your Impact</h2>
              {totalLeads > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    You've connected <span className="font-semibold text-gray-900">{totalLeads}</span> athlete{totalLeads !== 1 ? 's' : ''} with their college journey
                  </p>
                  {pipelineCounts.length > 0 && (
                    <div className="space-y-2">
                      {pipelineCounts.map(({ stage, count }) => {
                        const style = getStatusStyle(stage)
                        return (
                          <div key={stage} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
                            <span className="text-sm text-gray-700 flex-1">{stage}</span>
                            <span className="text-sm font-semibold text-gray-900">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Share your referral link to start connecting athletes with their US college journey!</p>
              )}
            </div>

            {/* Link Activity - Website form submissions via scout's referral link */}
            {websiteLeads.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-green-500">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-600" />
                    <h2 className="font-semibold text-gray-900">Link Activity</h2>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{websiteLeads.length}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {websiteLeads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </span>
                          {lead.sport && <span className="text-xs text-gray-500 ml-2">{lead.sport}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          {lead.form_source === 'showcase' ? 'Showcase' : 'Evaluation'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {websiteLeads.length > 5 && (
                  <div className="px-4 py-2 bg-gray-50 text-center">
                    <span className="text-xs text-gray-500">+{websiteLeads.length - 5} more form submissions via your link</span>
                  </div>
                )}
              </div>
            )}

            {/* My Leads Preview */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">My Leads</h2>
                {leads.length > 5 && (
                  <a href="/leads" className="text-sm text-[var(--ausa-red)] font-medium hover:underline">
                    See All
                  </a>
                )}
              </div>

              {previewLeads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No leads yet. Share your link to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {previewLeads.map((lead) => {
                    const style = getStatusStyle(lead.process_status)
                    return (
                      <div key={lead.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
                          <span className="font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {lead.process_status || 'Lead Created'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick Action Buttons - Mobile only */}
            <div className="grid grid-cols-3 gap-3 lg:hidden">
              <button
                onClick={onNavigateToShare}
                className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--ausa-red)] bg-opacity-10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-[var(--ausa-red)]" />
                </div>
                <span className="text-sm font-medium text-gray-700">Share & QR</span>
              </button>

              <button
                onClick={onNavigateToCommission}
                className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Commission</span>
              </button>

              <button
                onClick={onNavigateToResources}
                className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--ausa-success)] bg-opacity-10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--ausa-success)]" />
                </div>
                <span className="text-sm font-medium text-gray-700">Resources</span>
              </button>
            </div>
          </div>

          {/* Right column - Sidebar (desktop only) */}
          <div className="hidden lg:block space-y-6">
            {/* Your Impact - Desktop */}
            <div className="sp-impact-card">
              <h3 className="font-semibold text-gray-900 mb-1">Your Impact</h3>
              {totalLeads > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    You've connected <span className="font-semibold text-gray-900">{totalLeads}</span> athlete{totalLeads !== 1 ? 's' : ''} with their college journey
                  </p>
                  {pipelineCounts.length > 0 && (
                    <div className="space-y-2">
                      {pipelineCounts.map(({ stage, count }) => {
                        const style = getStatusStyle(stage)
                        return (
                          <div key={stage} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${style.dot}`}></div>
                            <span className="text-sm text-gray-700 flex-1">{stage}</span>
                            <span className="text-sm font-semibold text-gray-900">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Share your referral link to start connecting athletes with their US college journey!</p>
              )}
            </div>

            {/* Quick Actions - Desktop */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={onNavigateToShare} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-[var(--ausa-red)] bg-opacity-10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-[var(--ausa-red)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Share & QR Code</p>
                    <p className="text-xs text-gray-500">Links, WhatsApp, QR codes</p>
                  </div>
                </button>
                <button onClick={onNavigateToCommission} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Commission</p>
                    <p className="text-xs text-gray-500">View your earnings</p>
                  </div>
                </button>
                <button onClick={onNavigateToResources} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-[var(--ausa-success)] bg-opacity-10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[var(--ausa-success)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Marketing Resources</p>
                    <p className="text-xs text-gray-500">PDFs, images, training</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
