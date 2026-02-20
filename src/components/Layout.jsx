import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Home, Users, CalendarDays, MoreHorizontal, LogOut, Settings, ChevronDown, BadgeCheck, X } from 'lucide-react'
import FeedbackButton from './FeedbackButton'

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'more', label: 'More', icon: MoreHorizontal },
]

export default function Layout({ children, activeTab = 'home', onTabChange, onAvatarClick }) {
  const { scout, signOut } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out error:', err)
      setSigningOut(false)
    }
  }

  const scoutName = scout?.full_name || scout?.email?.split('@')[0] || 'Scout'
  const isVerified = scout?.is_verified ?? false

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto">
          {/* Scout info — tap avatar to open profile */}
          <button
            onClick={onAvatarClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {scout?.photo_url ? (
              <img src={scout.photo_url} alt={scoutName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 bg-[#E63946] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {scoutName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 text-sm">{scoutName}</span>
              {isVerified && (
                <BadgeCheck size={16} className="text-[#E63946]" />
              )}
            </div>
          </button>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-50 text-[#E63946]'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Settings menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings size={20} className="text-gray-600" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{scout?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <LogOut size={16} />
                    {signingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Feedback widget */}
      <FeedbackButton />

      {/* Bottom navigation - mobile only, desktop gets top nav in header */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={`flex flex-col items-center py-2 px-4 min-w-[64px] transition-colors ${
                    isActive
                      ? 'text-[#E63946]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E63946] rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
