import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import LeadsList from './components/LeadsList'
import ShareLinks from './components/ShareLinks'
import EventsList from './components/EventsList'
import Commission from './components/Commission'
import Resources from './components/Resources'
import Settings from './components/Settings'
import ScoutProfile from './components/ScoutProfile'
import PublicScoutProfile from './components/PublicScoutProfile'

function AppContent() {
  const { user, scout, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [moreView, setMoreView] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E63946]"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // Handle "More" tab sub-navigation
  if (activeTab === 'more' && moreView) {
    const handleBack = () => setMoreView(null)

    return (
      <>
        <Layout activeTab={activeTab} onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab !== 'more') setMoreView(null)
        }} onAvatarClick={() => setShowProfile(true)}>
          <div className="p-4">
            <button
              onClick={handleBack}
              className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ← Back
            </button>
            {moreView === 'commission' && <Commission scoutId={scout?.id} />}
            {moreView === 'share' && <ShareLinks />}
            {moreView === 'resources' && <Resources />}
            {moreView === 'settings' && <Settings scoutId={scout?.id} />}
          </div>
        </Layout>
        {showProfile && <ScoutProfile onClose={() => setShowProfile(false)} />}
      </>
    )
  }

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={(tab) => {
        setActiveTab(tab)
        setMoreView(null)
      }} onAvatarClick={() => setShowProfile(true)}>
        {activeTab === 'home' && <Dashboard
          onNavigateToEvents={() => setActiveTab('events')}
          onNavigateToShare={() => { setActiveTab('more'); setMoreView('share') }}
          onNavigateToResources={() => { setActiveTab('more'); setMoreView('resources') }}
        />}
        {activeTab === 'leads' && <LeadsList scoutId={scout?.id} />}
        {activeTab === 'events' && <EventsList />}
        {activeTab === 'more' && (
          <div className="p-4 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">More</h2>

            <button
              onClick={() => setMoreView('commission')}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <span className="text-lg">💰</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Commission</p>
                  <p className="text-sm text-gray-500">View your earnings</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={() => setMoreView('share')}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Share Links</p>
                  <p className="text-sm text-gray-500">Tracked referral links</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={() => setMoreView('resources')}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <span className="text-lg">📚</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Resources</p>
                  <p className="text-sm text-gray-500">Marketing materials & training</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button
              onClick={() => setMoreView('settings')}
              className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Settings</p>
                  <p className="text-sm text-gray-500">Notification preferences</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        )}
      </Layout>
      {showProfile && <ScoutProfile onClose={() => setShowProfile(false)} />}
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/s/:slug" element={<PublicScoutProfile />} />
      <Route path="/*" element={
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      } />
    </Routes>
  )
}

export default App
