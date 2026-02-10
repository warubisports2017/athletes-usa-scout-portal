/**
 * Floating feedback button - bottom-right corner
 * Shows badge with open feedback count
 * Opens FeedbackModal or MyFeedbackPanel
 */
import { useState, useEffect } from 'react'
import { MessageSquarePlus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import FeedbackModal from './FeedbackModal'
import MyFeedbackPanel from './MyFeedbackPanel'

export default function FeedbackButton() {
  const { user } = useAuth()
  const [view, setView] = useState(null) // null | 'new' | 'list'
  const [openCount, setOpenCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setOpenCount(0)
      return
    }

    const fetchOpenCount = async () => {
      try {
        const { count, error } = await supabase
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'open')

        if (!error) setOpenCount(count || 0)
      } catch (err) {
        console.error('Error fetching feedback count:', err)
      }
    }

    fetchOpenCount()

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
        () => fetchOpenCount()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const handleClose = () => setView(null)

  return (
    <>
      {!view && (
        <button
          className="sp-feedback-button"
          onClick={() => setView(openCount > 0 ? 'list' : 'new')}
          aria-label={openCount > 0 ? 'My Feedback' : 'Send Feedback'}
        >
          <MessageSquarePlus size={22} />
          {openCount > 0 && (
            <span className="sp-feedback-badge">{openCount}</span>
          )}
        </button>
      )}

      {view === 'new' && (
        <FeedbackModal
          onClose={handleClose}
          onViewMyFeedback={() => setView('list')}
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
