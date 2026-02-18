import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getScoutLeads, getScoutCommissions, getCompanyStats } from '../lib/supabase'
import { Share2, QrCode, BookOpen, CheckCircle, Users, Trophy, DollarSign } from 'lucide-react'

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

export default function Dashboard() {
  const { scout, user } = useAuth()
  const [leads, setLeads] = useState([])
  const [commissions, setCommissions] = useState([])
  const [companyStats, setCompanyStats] = useState({ placedThisMonth: 0, signupsThisMonth: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (scout?.id) {
      loadData()
    }
  }, [scout?.id])

  async function loadData() {
    try {
      setLoading(true)
      const [leadsData, commissionsData, statsData] = await Promise.all([
        getScoutLeads(scout.id),
        getScoutCommissions(scout.id),
        getCompanyStats(),
      ])
      setLeads(leadsData || [])
      setCommissions(commissionsData || [])
      setCompanyStats(statsData || { placedThisMonth: 0, signupsThisMonth: 0 })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const totalLeads = leads.length
  const placedCount = leads.filter(l => l.process_status === 'Placed').length
  const totalEarned = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount || 0), 0)

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
                  {scout?.is_active && (
                    <p className="text-sm text-gray-500">
                      Active Scout
                    </p>
                  )}
                </div>
              </div>
            </div>

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

            {/* Company-Wide Stats - Mobile only */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 lg:hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏆</span>
                <h2 className="font-semibold text-gray-900">AUSA This Month</h2>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold text-amber-700">{companyStats.placedThisMonth}</p>
                  <p className="text-xs text-gray-600">Athletes Placed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{companyStats.signupsThisMonth}</p>
                  <p className="text-xs text-gray-600">New Signups</p>
                </div>
              </div>
            </div>

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
                onClick={() => {/* TODO: Share functionality */}}
                className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--ausa-red)] bg-opacity-10 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-[var(--ausa-red)]" />
                </div>
                <span className="text-sm font-medium text-gray-700">Share Link</span>
              </button>

              <button
                onClick={() => {/* TODO: QR Code functionality */}}
                className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--ausa-navy)] bg-opacity-10 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-[var(--ausa-navy)]" />
                </div>
                <span className="text-sm font-medium text-gray-700">QR Code</span>
              </button>

              <button
                onClick={() => {/* TODO: Resources functionality */}}
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
            {/* Company-Wide Stats */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏆</span>
                <h2 className="font-semibold text-gray-900">AUSA This Month</h2>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold text-amber-700">{companyStats.placedThisMonth}</p>
                  <p className="text-xs text-gray-600">Athletes Placed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{companyStats.signupsThisMonth}</p>
                  <p className="text-xs text-gray-600">New Signups</p>
                </div>
              </div>
            </div>

            {/* Quick Actions - Desktop */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-[var(--ausa-red)] bg-opacity-10 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-[var(--ausa-red)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Share Referral Link</p>
                    <p className="text-xs text-gray-500">Copy or share via WhatsApp</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-[var(--ausa-navy)] bg-opacity-10 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-[var(--ausa-navy)]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Generate QR Code</p>
                    <p className="text-xs text-gray-500">Perfect for events</p>
                  </div>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
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
