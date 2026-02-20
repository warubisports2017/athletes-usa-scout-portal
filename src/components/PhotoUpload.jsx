import { useState, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { uploadScoutPhoto } from '../lib/supabase'

export default function PhotoUpload({ scoutId, currentUrl, type, label, onUpload }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl)
  const inputRef = useRef()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      })

      // Show preview immediately
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result)
      reader.readAsDataURL(compressed)

      // Upload to Supabase storage
      const url = await uploadScoutPhoto(scoutId, compressed, type)
      onUpload(url)
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    setPreview(null)
    onUpload(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt={label} className="w-32 h-32 object-cover rounded-xl" />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#E63946] hover:text-[#E63946] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Camera size={24} />
          )}
          <span className="text-xs mt-1">{uploading ? 'Uploading...' : 'Upload'}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
