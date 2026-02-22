/**
 * Message bubble for coach chat.
 * User messages: right-aligned, red background.
 * Assistant messages: left-aligned, white with bot avatar.
 */
import { Bot } from 'lucide-react'

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
      <div className={`bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed text-gray-800 shadow-sm whitespace-pre-wrap ${isStreaming ? 'sp-coach-streaming' : ''}`}>
        {content}
        {isStreaming && <span className="sp-coach-cursor">|</span>}
      </div>
    </div>
  )
}
