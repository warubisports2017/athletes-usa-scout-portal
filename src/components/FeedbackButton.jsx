/**
 * Floating feedback button - bottom-right corner
 * Shows badge with open feedback count + amber badge for admin-updated items
 * Opens FeedbackModal or MyFeedbackPanel
 */
import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import FeedbackModal from './FeedbackModal'
import MyFeedbackPanel from './MyFeedbackPanel'

const LS_KEY = 'lastViewedFeedback'

export default function FeedbackButton({ activeTab = 'home' }) {
  const { user } = useAuth()
  const [view, setView] = useState(null) // null | 'new' | 'list'
  const [openCount, setOpenCount] = useState(0)
  const [updatedCount, setUpdatedCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setOpenCount(0)
      setUpdatedCount(0)
      return
    }

    const fetchCounts = async () => {
      try {
        // Open count
        const { count, error } = await supabase
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'open')

        if (!error) setOpenCount(count || 0)

        // Updated count — items admin changed since last viewed
        const lastViewed = localStorage.getItem(LS_KEY)
        if (lastViewed) {
          const { data: candidates } = await supabase
            .from('feedback')
            .select('id, created_at, updated_at')
            .eq('user_id', user.id)
            .gt('updated_at', lastViewed)

          // Only count items where updated_at > created_at (admin actually changed something)
          const realUpdated = (candidates || []).filter(
            f => new Date(f.updated_at) > new Date(f.created_at)
          )
          setUpdatedCount(realUpdated.length)
        }
      } catch (err) {
        console.error('Error fetching feedback count:', err)
      }
    }

    fetchCounts()

    // Real-time badge updates
    const channel = supabase
      .channel('scout-feedback-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchCounts()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const handleOpenPanel = () => {
    localStorage.setItem(LS_KEY, new Date().toISOString())
    setUpdatedCount(0)
    setView('list')
  }

  const handleClose = () => setView(null)

  const hasBadge = openCount > 0 || updatedCount > 0

  return (
    <>
      {!view && (
        <button
          className="sp-feedback-button"
          onClick={() => hasBadge ? handleOpenPanel() : setView('new')}
          aria-label={hasBadge ? 'My Feedback' : 'Send Feedback'}
        >
          <MessageSquarePlus size={22} />
          {openCount > 0 && (
            <span className="sp-feedback-badge">{openCount}</span>
          )}
          {updatedCount > 0 && (
            <span className="sp-feedback-badge-updated">{updatedCount}</span>
          )}
        </button>
      )}

      {view === 'new' && (
        <FeedbackModal
          onClose={handleClose}
          onViewMyFeedback={handleOpenPanel}
          page={`scout_portal:${activeTab}`}
        />
      )}

      {view === 'list' && (
        <MyFeedbackPanel
          onClose={handleClose}
          onNewFeedback={() => setView('new')}
        />
      )}
    </>
  )
}
