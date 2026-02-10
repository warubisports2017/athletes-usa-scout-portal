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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export default function FeedbackModal({ onClose, onViewMyFeedback }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('input') // 'input' | 'confirm' | 'submitting' | 'success'
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)

  // AI analysis
  const [aiSummary, setAiSummary] = useState('')
  const [aiType, setAiType] = useState('Other')
  const [aiClarifyingQuestion, setAiClarifyingQuestion] = useState('')

  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file)
      setScreenshotPreview(URL.createObjectURL(file))
    }
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Step 1 → Step 2: Analyze with Gemini
  const handleAnalyze = async () => {
    if (!message.trim()) return
    setAnalyzing(true)
    setError(null)

    try {
      const prompt = `Summarize this user feedback in ONE line (max 15 words).
Classify as: Bug | Feature | Question | Other

If the feedback is too vague to understand, return type "Unclear" and include a clarifyingQuestion.

Feedback: "${message}"
Page: Scout Portal

Return ONLY valid JSON: { "summary": "...", "type": "Bug|Feature|Question|Other|Unclear", "clarifyingQuestion": "optional - only if Unclear" }`

      if (!GEMINI_API_KEY) {
        setAiSummary(message.slice(0, 100) + (message.length > 100 ? '...' : ''))
        setAiType('Other')
        setStep('confirm')
        return
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
          })
        }
      )

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setAiSummary(parsed.summary || message.slice(0, 100))
        setAiType(parsed.type || 'Other')
        setAiClarifyingQuestion(parsed.clarifyingQuestion || '')
      } else {
        setAiSummary(message.slice(0, 100))
        setAiType('Other')
      }

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

  // Upload screenshot to Supabase Storage
  const uploadScreenshot = async () => {
    if (!screenshot) return null
    try {
      const fileExt = screenshot.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const filePath = `feedback/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('feedback-screenshots')
        .upload(filePath, screenshot)

      if (uploadError) {
        console.warn('Screenshot upload failed:', uploadError)
        return null
      }

      const { data: urlData } = supabase.storage
        .from('feedback-screenshots')
        .getPublicUrl(filePath)

      return urlData?.publicUrl || null
    } catch (err) {
      console.warn('Screenshot upload error:', err)
      return null
    }
  }

  // Step 2 → Submit
  const handleSubmit = async () => {
    setStep('submitting')
    setError(null)

    try {
      const screenshotUrl = await uploadScreenshot()

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || null,
          page: 'scout_portal',
          message,
          ai_summary: aiSummary,
          type: aiType === 'Unclear' ? 'Other' : aiType,
          screenshot_url: screenshotUrl,
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
    setScreenshot(null)
    setScreenshotPreview(null)
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

              {/* Screenshot */}
              <div className="sp-feedback-screenshot-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {!screenshotPreview ? (
                  <button
                    className="sp-feedback-screenshot-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    Add Screenshot
                  </button>
                ) : (
                  <div className="sp-feedback-screenshot-preview">
                    <img src={screenshotPreview} alt="Screenshot" />
                    <button className="sp-feedback-screenshot-remove" onClick={removeScreenshot}>
                      <X size={12} />
                    </button>
                  </div>
                )}
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
              <p className="sp-feedback-success-title">Submitted!</p>
              <div className="sp-feedback-success-summary">
                <p>"{aiSummary}"</p>
                <div className="sp-feedback-success-meta">
                  <span className="sp-type-badge" style={{ background: getTypeColor(aiType) }}>{aiType}</span>
                  <span className="sp-status-badge-open">Open</span>
                </div>
              </div>
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
