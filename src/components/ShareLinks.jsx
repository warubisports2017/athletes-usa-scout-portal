import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Link2, Copy, Check, MessageCircle, QrCode, ExternalLink, Plus, Sparkles, Users } from 'lucide-react'
import QRCodeModal from './QRCodeModal'

// Pre-configured referral links
const PRESET_LINKS = [
  {
    id: 'free-eval',
    title: 'Free Evaluation',
    description: 'Main signup page for new athletes',
    baseUrl: 'https://athletes-usa.de/sportstipendium',
    icon: Sparkles
  },
  {
    id: 'showcase',
    title: 'Soccer Showcase',
    description: 'Showcase event registration',
    baseUrl: 'https://athletes-usa.de/showcase',
    icon: Users
  }
]

export default function ShareLinks() {
  const { scout } = useAuth()
  const [copiedId, setCopiedId] = useState(null)
  const [qrModal, setQrModal] = useState({ open: false, url: '', title: '' })
  const [customUrl, setCustomUrl] = useState('')
  const [customResult, setCustomResult] = useState('')
  const [customError, setCustomError] = useState('')

  // Build tracked URL with scout's ref parameter
  function buildTrackedUrl(baseUrl) {
    if (!scout?.id) return baseUrl
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}ref=${scout.id}`
  }

  // Copy URL to clipboard
  async function copyToClipboard(url, id) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Open WhatsApp share
  function shareViaWhatsApp(url) {
    const text = `Check this out: ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Open QR code modal
  function openQrModal(url, title) {
    setQrModal({ open: true, url, title })
  }

  // Handle custom URL generation
  function handleCustomUrl() {
    setCustomError('')
    setCustomResult('')

    if (!customUrl.trim()) {
      setCustomError('Please enter a URL')
      return
    }

    // Validate it's an athletes-usa.de URL
    if (!customUrl.includes('athletes-usa.de')) {
      setCustomError('URL must be from athletes-usa.de')
      return
    }

    // Clean up the URL
    let url = customUrl.trim()
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }

    // Remove existing ref parameter if present
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.delete('ref')
      url = urlObj.toString()
    } catch {
      setCustomError('Invalid URL format')
      return
    }

    setCustomResult(buildTrackedUrl(url))
  }

  // Truncate URL for display
  function truncateUrl(url, maxLength = 40) {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="text-[#E63946]" size={28} />
          Your Links
        </h1>
        <p className="text-gray-500 mt-1">
          Share these links to track your referrals
        </p>
      </div>

      {/* Pre-configured Links */}
      <div className="space-y-4 mb-10">
        {PRESET_LINKS.map((link) => {
          const trackedUrl = buildTrackedUrl(link.baseUrl)
          const isCopied = copiedId === link.id
          const IconComponent = link.icon

          return (
            <div
              key={link.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
            >
              {/* Title row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-[#E63946]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <IconComponent className="text-[#E63946]" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{link.title}</h3>
                  <p className="text-sm text-gray-500">{link.description}</p>
                </div>
                <a
                  href={trackedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Open link"
                >
                  <ExternalLink size={18} />
                </a>
              </div>

              {/* URL display */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <code className="text-sm text-gray-600 font-mono break-all">
                  {truncateUrl(trackedUrl, 50)}
                </code>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(trackedUrl, link.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                    isCopied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check size={18} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copy
                    </>
                  )}
                </button>

                <button
                  onClick={() => shareViaWhatsApp(trackedUrl)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium transition-colors"
                  title="Share via WhatsApp"
                >
                  <MessageCircle size={18} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <button
                  onClick={() => openQrModal(trackedUrl, link.title)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
                  title="Show QR Code"
                >
                  <QrCode size={18} />
                  <span className="hidden sm:inline">QR</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom Link Generator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-[#1D3557]/10 rounded-xl flex items-center justify-center">
            <Plus className="text-[#1D3557]" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Custom Link</h3>
            <p className="text-sm text-gray-500">Add tracking to any athletes-usa.de page</p>
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value)
              setCustomResult('')
              setCustomError('')
            }}
            placeholder="https://athletes-usa.de/your-page"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-shadow"
          />
          <button
            onClick={handleCustomUrl}
            className="px-5 py-3 bg-[#1D3557] hover:bg-[#152a47] text-white font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            Add Tracking
          </button>
        </div>

        {/* Error */}
        {customError && (
          <p className="text-sm text-red-600 mb-3">{customError}</p>
        )}

        {/* Result */}
        {customResult && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Your tracked link:</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-3">
              <code className="text-sm text-gray-600 font-mono break-all">
                {customResult}
              </code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(customResult, 'custom')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  copiedId === 'custom'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copiedId === 'custom' ? (
                  <>
                    <Check size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy
                  </>
                )}
              </button>

              <button
                onClick={() => shareViaWhatsApp(customResult)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium transition-colors"
              >
                <MessageCircle size={18} />
              </button>

              <button
                onClick={() => openQrModal(customResult, 'Custom Link')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
              >
                <QrCode size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, url: '', title: '' })}
        url={qrModal.url}
        title={qrModal.title}
      />
    </div>
  )
}
