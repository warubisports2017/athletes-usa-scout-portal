/**
 * Message bubble for coach chat.
 * User messages: right-aligned, red background.
 * Assistant messages: left-aligned, white with bot avatar + markdown rendering.
 */
import { Bot } from 'lucide-react'

/** Parse inline markdown: **bold**, *italic*, `code` */
function renderInline(text, keyPrefix) {
  const parts = []
  let remaining = text
  let i = 0
  while (remaining) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // `code`
    const codeMatch = remaining.match(/`([^`]+)`/)
    // *italic* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)

    // Find earliest match
    const matches = [
      boldMatch && { type: 'bold', match: boldMatch },
      codeMatch && { type: 'code', match: codeMatch },
      italicMatch && { type: 'italic', match: italicMatch },
    ].filter(Boolean).sort((a, b) => a.match.index - b.match.index)

    if (!matches.length) {
      parts.push(remaining)
      break
    }

    const { type, match } = matches[0]
    if (match.index > 0) parts.push(remaining.slice(0, match.index))

    if (type === 'bold') parts.push(<strong key={`${keyPrefix}-${i}`}>{match[1]}</strong>)
    else if (type === 'code') parts.push(<code key={`${keyPrefix}-${i}`}>{match[1]}</code>)
    else parts.push(<em key={`${keyPrefix}-${i}`}>{match[1]}</em>)

    remaining = remaining.slice(match.index + match[0].length)
    i++
  }
  return parts
}

/** Convert markdown text to React elements */
function renderMarkdown(text) {
  if (!text) return null
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n')
    // Check if this paragraph is a list
    const listItems = []
    const nonListLines = []
    const elements = []

    const flushList = () => {
      if (listItems.length) {
        elements.push(
          <ul key={`p${pi}-ul${elements.length}`}>
            {listItems.map((item, li) => (
              <li key={li}>{renderInline(item, `p${pi}-li${li}`)}</li>
            ))}
          </ul>
        )
        listItems.length = 0
      }
    }
    const flushText = () => {
      if (nonListLines.length) {
        elements.push(
          <p key={`p${pi}-t${elements.length}`}>
            {nonListLines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {renderInline(line, `p${pi}-l${li}`)}
              </span>
            ))}
          </p>
        )
        nonListLines.length = 0
      }
    }

    for (const line of lines) {
      const listMatch = line.match(/^\s*[\*\-]\s+(.+)/)
      if (listMatch) {
        flushText()
        listItems.push(listMatch[1])
      } else {
        flushList()
        nonListLines.push(line)
      }
    }
    flushText()
    flushList()
    return elements
  })
}

export default function CoachMessage({ role, content, isStreaming }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-[#E63946] text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5 mb-3 items-start">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={16} className="text-gray-500" />
      </div>
      <div className={`sp-coach-markdown bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed text-gray-800 shadow-sm ${isStreaming ? 'sp-coach-streaming' : ''}`}>
        {renderMarkdown(content)}
        {isStreaming && <span className="sp-coach-cursor">|</span>}
      </div>
    </div>
  )
}
