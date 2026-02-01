import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setResetSent(true)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      console.error('Auth error:', err)
      if (mode === 'forgot') {
        setError('Could not send reset email. Please check your email address.')
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email before signing in.')
      } else {
        setError(err.message || 'An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setResetSent(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-[#E63946] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">A</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Scout Portal</h1>
        <p className="text-gray-500 mt-1">Athletes USA</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        {mode === 'forgot' && resetSent ? (
          // Reset email sent confirmation
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-6">
              We sent a password reset link to <span className="font-medium">{email}</span>
            </p>
            <button
              onClick={() => switchMode('login')}
              className="text-[#E63946] font-medium text-sm hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          // Login / Forgot password form
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {mode === 'forgot' ? 'Reset password' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {mode === 'forgot'
                ? 'Enter your email to receive a reset link'
                : 'Sign in to your scout account'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-shadow"
                />
              </div>

              {/* Password (only in login mode) */}
              {mode === 'login' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-sm text-[#E63946] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#E63946] hover:bg-[#d62f3c] disabled:bg-[#E63946]/70 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {mode === 'forgot' ? 'Send reset link' : 'Sign in'}
              </button>
            </form>

            {/* Back to login link (in forgot mode) */}
            {mode === 'forgot' && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => switchMode('login')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-400">
        Need help? Contact{' '}
        <a href="mailto:support@athletesusa.org" className="text-[#E63946] hover:underline">
          support@athletesusa.org
        </a>
      </p>
    </div>
  )
}
