import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getScoutLeads, getScoutCommissions, getWebsiteLeads, getScoutTimeline } from '../lib/supabase'
import { getStatusStyle } from '../lib/constants'
import { Share2, BookOpen, CheckCircle, Users, Trophy, DollarSign, ArrowUpRight, MessageSquare, Link2, FileText, Clock } from 'lucide-react'
import EventBanner from './EventBanner'

// Scout level config
const SCOUT_LEVELS = {
  champion:   { label: 'Champion',   emoji: '🏆', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  pathfinder: { label: 'Pathfinder', emoji: '⭐', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  connector:  { label: 'Connector',  emoji: '🤝', bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300' },
  starter:    { label: 'Starter',    emoji: '🌱', bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300' },
}

const STATUS_PRIORITY = { 'Placed': 5, 'Committed': 4, 'Offer Received': 3, 'In Conversation': 3, 'In Contact': 3, 'Ready to Promote': 2, 'Building Profile': 2, 'New': 1 }

function getScoutLevel(leads, websiteLeads) {
  const highest = Math.max(0, ...leads.map(l => STATUS_PRIORITY[l.process_status] || 0))
  if (highest >= 4) return 'champion'
  if (highest >= 3) return 'pathfinder'
  if (highest >= 2) return 'connector'
  if (leads.length > 0 || websiteLeads.length > 0) return 'starter'
  return null
}

const PIPELINE_STAGES = ['New', 'Building Profile', 'Ready to Promote', 'In Contact', 'In Conversation', 'Offer Received', 'Committed', 'Placed']

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
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
  const date2 = new Date(dateString)
  return date2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Activity feed event icons
const FEED_ICONS = {
  status_change: { Icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50' },
  note_added: { Icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
  lead_created: { Icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  lead_linked: { Icon: Link2, color: 'text-teal-600', bg: 'bg-teal-50' },
  form_submission: { Icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
}

export default function Dashboard({ onNavigateToEvents, onNavigateToShare, onNavigateToResources, onNavigateToCommission }) {
  const { scout, user } = useAuth()
  const [leads, setLeads] = useState([])
  const [websiteLeads, setWebsiteLeads] = useState([])
  const [commissions, setCommissions] = useState([])
  const [timeline, setTimeline] = useState([])
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
      const [leadsData, commissionsData, webLeadsData, timelineData] = await Promise.all([
        getScoutLeads(scout.id),
        getScoutCommissions(scout.id),
        getWebsiteLeads(scout.id),
        getScoutTimeline(scout.id).catch(() => []),
      ])
      setLeads(leadsData || [])
      setWebsiteLeads(webLeadsData || [])
      setCommissions(commissionsData || [])
      setTimeline(timelineData || [])
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

            {/* Recent Activity Feed */}
            {timeline.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h2 className="font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {timeline.slice(0, 8).map((event) => {
                    const config = FEED_ICONS[event.event_type] || FEED_ICONS.lead_created
                    const Icon = config.Icon
                    const athleteName = event.athlete
                      ? `${event.athlete.first_name || ''} ${event.athlete.last_name || ''}`.trim()
                      : 'Unknown'

                    let label = event.event_type
                    if (event.event_type === 'status_change') label = `${athleteName} moved to ${event.new_value}`
                    else if (event.event_type === 'note_added') label = `Admin note on ${athleteName}`
                    else if (event.event_type === 'lead_created') label = `${athleteName} added to pipeline`
                    else if (event.event_type === 'lead_linked') label = `${athleteName} linked from your referral`

                    return (
                      <div key={event.id} className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{label}</p>
                          <p className="text-xs text-gray-400">{timeAgo(event.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
                          {lead.process_status || 'New'}
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
