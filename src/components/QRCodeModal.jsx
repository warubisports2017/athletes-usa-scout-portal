import { useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function QRCodeModal({ isOpen, onClose, url, title }) {
  const qrRef = useRef(null)
  const [copied, setCopied] = useState(false)

  // Download QR code as PNG image
  const downloadQR = useCallback(() => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    // Create canvas from SVG
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    // Set canvas size (with padding for better scannability)
    const size = 1024
    const padding = 64
    canvas.width = size + padding * 2
    canvas.height = size + padding * 2

    img.onload = () => {
      // White background
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR code centered
      ctx.drawImage(img, padding, padding, size, size)

      // Create download link
      const link = document.createElement('a')
      link.download = `${title?.replace(/\s+/g, '-').toLowerCase() || 'qr-code'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [title])

  // Share via Web Share API or fallback to copy
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Athletes USA',
          text: 'Check out this link:',
          url: url
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    } else {
      // Fallback to copy
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Copy failed:', err)
      }
    }
  }, [url, title])

  // Copy URL to clipboard
  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }, [url])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title || 'QR Code'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* QR Code Display */}
        <div
          ref={qrRef}
          className="flex items-center justify-center bg-white p-8"
        >
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <QRCodeSVG
              value={url}
              size={256}
              level="H"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* URL Display */}
        <div className="px-6 pb-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <code className="text-xs text-gray-600 font-mono break-all leading-relaxed">
              {url}
            </code>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          {/* Primary: Save to Photos */}
          <button
            onClick={downloadQR}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#E63946] hover:bg-[#d62f3c] text-white font-semibold rounded-xl transition-colors"
          >
            <Download size={20} />
            Save to Photos
          </button>

          {/* Secondary row */}
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <Share2 size={18} />
              Share
            </button>

            <button
              onClick={copyUrl}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy URL
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hint */}
        <div className="px-6 pb-6 pt-2 text-center">
          <p className="text-xs text-gray-400">
            Point your camera at the QR code to scan
          </p>
        </div>
      </div>
    </div>
  )
}
