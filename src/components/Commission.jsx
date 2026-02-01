import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { getScoutCommissions } from '../lib/supabase'
import { DollarSign, Clock, CheckCircle, Wallet } from 'lucide-react'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function formatDate(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function Commission() {
  const { user } = useAuth()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.id) {
      loadCommissions()
    }
  }, [user?.id])

  async function loadCommissions() {
    try {
      setLoading(true)
      setError(null)
      const data = await getScoutCommissions(user.id)
      setCommissions(data || [])
    } catch (err) {
      console.error('Failed to load commissions:', err)
      setError('Failed to load commissions')
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalEarned = commissions.reduce((sum, c) => sum + (c.amount || 0), 0)
  const paidAmount = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + (c.amount || 0), 0)
  const pendingAmount = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ausa-red)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500">Track your earnings from referrals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Earned */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
            <Wallet className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
          <p className="text-xs text-gray-500">Total Earned</p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(paidAmount)}</p>
          <p className="text-xs text-gray-500">Paid</p>
        </div>
      </div>

      {/* Commission History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">History</h2>
        </div>

        {commissions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No commissions yet</p>
            <p className="text-sm text-gray-500">
              You'll earn commissions when your referred athletes get placed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {commissions.map((commission) => {
              const isPaid = commission.status === 'paid'
              const athleteName = commission.athlete
                ? `${commission.athlete.first_name} ${commission.athlete.last_name}`
                : 'Unknown Athlete'

              return (
                <div key={commission.id} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {athleteName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isPaid && commission.paid_at
                          ? `Paid ${formatDate(commission.paid_at)}`
                          : `Created ${formatDate(commission.created_at)}`
                        }
                      </p>
                      {commission.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {commission.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(commission.amount)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isPaid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
