/**
 * MyFeedbackPanel - Shows user's feedback history with status
 */
import { useState, useEffect } from 'react'
import { X, Plus, Clock, Loader2, MessageSquare } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

function timeAgo(date) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return past.toLocaleDateString()
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  done: { label: 'Done', color: '#10b981' },
  wont_fix: { label: "Won't Fix", color: '#6b7280' }
}

const TYPE_COLORS = {
  Bug: '#ef4444',
  Feature: '#10b981',
  Question: '#6366f1',
  Other: '#6b7280'
}

export default function MyFeedbackPanel({ onClose, onNewFeedback }) {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchFeedback = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('feedback')
          .select('id, ai_summary, type, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setFeedback(data || [])
      } catch (err) {
        console.error('Error fetching feedback:', err)
        setError('Failed to load feedback')
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [user?.id])

  const openCount = feedback.filter(f => f.status === 'open').length

  return (
    <div className="sp-feedback-panel">
      {/* Header */}
      <div className="sp-feedback-panel-header">
        <h3>My Feedback</h3>
        <button className="sp-modal-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="sp-feedback-panel-content">
        {loading && (
          <div className="sp-feedback-loading">
            <Loader2 size={22} className="sp-spin" />
            <span>Loading...</span>
          </div>
        )}

        {error && (
          <div className="sp-feedback-error">
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && feedback.length === 0 && (
          <div className="sp-feedback-empty">
            <MessageSquare size={28} className="text-gray-300" />
            <p>No feedback submitted yet</p>
            <button className="sp-btn-primary sp-btn-sm" onClick={onNewFeedback}>
              <Plus size={14} />
              Submit Feedback
            </button>
          </div>
        )}

        {!loading && !error && feedback.length > 0 && (
          <div className="sp-feedback-list">
            {feedback.map(item => {
              const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.open
              const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.Other
              const statusDot = item.status === 'open' ? '#3b82f6'
                : item.status === 'in_progress' ? '#f59e0b'
                : item.status === 'done' ? '#10b981' : '#6b7280'

              return (
                <div key={item.id} className="sp-feedback-item">
                  <div className="sp-feedback-item-main">
                    <span className="sp-feedback-dot" style={{ background: statusDot }} />
                    <span className="sp-feedback-summary">"{item.ai_summary}"</span>
                  </div>
                  <div className="sp-feedback-item-meta">
                    <span className="sp-type-badge" style={{ background: typeColor }}>
                      {item.type}
                    </span>
                    <span className="sp-status-label" style={{ color: statusConfig.color }}>
                      {statusConfig.label}
                    </span>
                    <span className="sp-feedback-time">
                      <Clock size={11} />
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sp-feedback-panel-footer">
        <button className="sp-btn-primary" onClick={onNewFeedback}>
          <Plus size={14} />
          New Feedback
        </button>
        {openCount > 0 && (
          <span className="sp-feedback-open-count">{openCount} open</span>
        )}
      </div>
    </div>
  )
}
