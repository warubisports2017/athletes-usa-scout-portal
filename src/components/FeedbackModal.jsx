/**
 * FeedbackModal - Two-step feedback with AI confirmation
 *
 * Step 1: User writes feedback (+ optional screenshot)
 * Step 2: AI summarizes, user confirms before submit
 * Step 3: Success with "Submit Another" or "View My Feedback"
 */
import { useState, useRef } from 'react'
import { Sparkles, Send, ArrowRight, Upload, Loader2, AlertCircle, CheckCircle, X, List } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function FeedbackModal({ onClose, onViewMyFeedback, page = 'scout_portal' }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('input') // 'input' | 'confirm' | 'submitting' | 'success'
  const [message, setMessage] = useState('')
  const [screenshots, setScreenshots] = useState([])       // Array of { file, preview }

  // AI analysis
  const [aiSummary, setAiSummary] = useState('')
  const [aiType, setAiType] = useState('Other')
  const [aiClarifyingQuestion, setAiClarifyingQuestion] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const newItems = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setScreenshots(prev => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeScreenshot = (index) => {
    setScreenshots(prev => {
      URL.revokeObjectURL(prev[index]?.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Step 1 → Step 2: Analyze with Gemini
  const handleAnalyze = async () => {
    if (!message.trim()) return
    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, page })
      })

      const data = await response.json()
      setAiSummary(data.summary || message.slice(0, 100))
      setAiType(data.type || 'Other')
      setAiClarifyingQuestion(data.clarifyingQuestion || '')
      setStep('confirm')
    } catch (err) {
      console.error('AI analysis error:', err)
      setAiSummary(message.slice(0, 100) + (message.length > 100 ? '...' : ''))
      setAiType('Other')
      setStep('confirm')
    } finally {
      setAnalyzing(false)
    }
  }

  // Upload all screenshots to Supabase Storage
  const uploadScreenshots = async () => {
    if (screenshots.length === 0) return []
    const urls = []
    for (const item of screenshots) {
      try {
        const fileExt = item.file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `feedback/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(filePath, item.file)

        if (uploadError) {
          console.warn('Screenshot upload failed:', uploadError)
          continue
        }

        const { data: urlData } = supabase.storage
          .from('feedback-screenshots')
          .getPublicUrl(filePath)

        if (urlData?.publicUrl) urls.push(urlData.publicUrl)
      } catch (err) {
        console.warn('Screenshot upload error:', err)
      }
    }
    return urls
  }

  // Step 2 → Submit
  const handleSubmit = async () => {
    setStep('submitting')
    setError(null)

    try {
      const uploadedUrls = await uploadScreenshots()

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || null,
          page,
          message,
          ai_summary: aiSummary,
          type: aiType === 'Unclear' ? 'Other' : aiType,
          screenshot_url: uploadedUrls[0] || null,
          screenshot_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
          status: 'open'
        })

      if (insertError) throw insertError
      setStep('success')
    } catch (err) {
      console.error('Submit error:', err)
      setError(err.message || 'Failed to submit feedback')
      setStep('confirm')
    }
  }

  const handleBack = () => {
    setStep('input')
    setAiClarifyingQuestion('')
  }

  const handleSubmitAnother = () => {
    setStep('input')
    setMessage('')
    screenshots.forEach(s => URL.revokeObjectURL(s.preview))
    setScreenshots([])
    setAiSummary('')
    setAiType('Other')
    setAiClarifyingQuestion('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bug': return '#ef4444'
      case 'Feature': return '#10b981'
      case 'Question': return '#6366f1'
      default: return '#6b7280'
    }
  }

  return (
    <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-feedback-modal">
        {/* Header */}
        <div className="sp-feedback-modal-header">
          <h3>{step === 'success' ? 'Thank You!' : 'Send Feedback'}</h3>
          <button className="sp-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="sp-feedback-modal-content">
          {step === 'input' && (
            <>
              <label className="sp-feedback-label">What's on your mind?</label>
              <textarea
                className="sp-feedback-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe a bug, suggest a feature, or ask a question..."
                rows={4}
                autoFocus
              />

              {/* Screenshots */}
              <div className="sp-feedback-screenshot-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {screenshots.length > 0 && (
                  <div className="sp-feedback-screenshot-grid">
                    {screenshots.map((item, i) => (
                      <div key={i} className="sp-feedback-screenshot-preview">
                        <img src={item.preview} alt={`Screenshot ${i + 1}`} />
                        <button className="sp-feedback-screenshot-remove" onClick={() => removeScreenshot(i)}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="sp-feedback-screenshot-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {screenshots.length === 0 ? 'Add Screenshots' : 'Add More'}
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="sp-feedback-ai-summary">
                <div className="sp-feedback-ai-header">
                  <Sparkles size={14} />
                  <span>Summary</span>
                </div>
                <div className="sp-feedback-ai-badge" style={{ background: getTypeColor(aiType) }}>
                  {aiType}
                </div>
                <p className="sp-feedback-ai-text">"{aiSummary}"</p>
              </div>

              {aiClarifyingQuestion && (
                <div className="sp-feedback-clarification">
                  <AlertCircle size={14} />
                  <span>{aiClarifyingQuestion}</span>
                </div>
              )}

              <div className="sp-feedback-original">
                <label>Your message:</label>
                <p>{message}</p>
              </div>
            </>
          )}

          {step === 'submitting' && (
            <div className="sp-feedback-loading">
              <Loader2 size={28} className="sp-spin" />
              <p>Submitting...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="sp-feedback-success">
              <CheckCircle size={40} className="text-green-500" />
              <p className="sp-feedback-success-title">
                Got it! {user?.email ? "We'll look into this." : 'Thanks for your input.'}
              </p>
              {user?.email && (
                <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                  We'll email you when there's an update.
                </p>
              )}
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
                Your feedback helps shape how this tool evolves.
              </p>
            </div>
          )}

          {error && (
            <div className="sp-feedback-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'submitting' && (
          <div className="sp-feedback-modal-footer">
            {step === 'input' && (
              <button
                className="sp-btn-primary"
                onClick={handleAnalyze}
                disabled={!message.trim() || analyzing}
              >
                {analyzing ? (
                  <>
                    <Loader2 size={14} className="sp-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}

            {step === 'confirm' && (
              <>
                <button className="sp-btn-secondary" onClick={handleBack}>Edit</button>
                <button className="sp-btn-primary" onClick={handleSubmit}>
                  <Send size={14} />
                  Confirm & Send
                </button>
              </>
            )}

            {step === 'success' && (
              <>
                <button className="sp-btn-secondary" onClick={handleSubmitAnother}>Submit Another</button>
                {onViewMyFeedback && (
                  <button className="sp-btn-primary" onClick={onViewMyFeedback}>
                    <List size={14} />
                    View My Feedback
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
