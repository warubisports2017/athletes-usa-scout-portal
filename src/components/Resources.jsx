import { useState, useEffect } from 'react'
import { getScoutResources } from '../lib/supabase'
import {
  FileText,
  Image,
  Video,
  ExternalLink,
  Download,
  BookOpen,
  GraduationCap,
  HelpCircle,
  FolderOpen
} from 'lucide-react'

// Category configuration
const categoryConfig = {
  marketing: {
    label: 'Marketing Materials',
    icon: BookOpen,
    description: 'Flyers, social media assets, and promotional content',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  training: {
    label: 'Training',
    icon: GraduationCap,
    description: 'Learn about AUSA programs and recruiting process',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  faq: {
    label: 'FAQ',
    icon: HelpCircle,
    description: 'Frequently asked questions and answers',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
}

// File type icons
function getFileIcon(fileType) {
  switch (fileType) {
    case 'pdf':
      return FileText
    case 'image':
      return Image
    case 'video':
      return Video
    case 'link':
      return ExternalLink
    default:
      return FileText
  }
}

export default function Resources() {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadResources()
  }, [])

  async function loadResources() {
    try {
      setLoading(true)
      setError(null)
      const data = await getScoutResources()
      setResources(data || [])
    } catch (err) {
      console.error('Failed to load resources:', err)
      setError('Failed to load resources')
    } finally {
      setLoading(false)
    }
  }

  // Group resources by category
  const groupedResources = resources.reduce((acc, resource) => {
    const category = resource.category || 'marketing'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(resource)
    return acc
  }, {})

  // Order categories
  const categoryOrder = ['marketing', 'training', 'faq']
  const orderedCategories = categoryOrder.filter(cat => groupedResources[cat]?.length > 0)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ausa-red)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="text-sm text-gray-500">Marketing materials and training content</p>
      </div>

      {/* Empty State */}
      {resources.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium mb-1">No resources available</p>
          <p className="text-sm text-gray-500">
            Check back later for marketing materials and training content.
          </p>
        </div>
      ) : (
        /* Resource Categories */
        orderedCategories.map((category) => {
          const config = categoryConfig[category] || categoryConfig.marketing
          const CategoryIcon = config.icon
          const categoryResources = groupedResources[category]

          return (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                  <CategoryIcon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{config.label}</h2>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
              </div>

              {/* Resource Cards */}
              <div className="space-y-2">
                {categoryResources.map((resource) => {
                  const FileIcon = getFileIcon(resource.file_type)
                  const isLink = resource.file_type === 'link'

                  return (
                    <div
                      key={resource.id}
                      className="bg-white rounded-xl shadow-sm p-4 flex items-start gap-3"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-5 h-5 text-gray-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                            {resource.description}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                            isLink
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                              : 'bg-[var(--ausa-red)] bg-opacity-10 hover:bg-opacity-20 text-[var(--ausa-red)]'
                          }`}
                          aria-label={isLink ? 'Open link' : 'Download'}
                        >
                          {isLink ? (
                            <ExternalLink className="w-5 h-5" />
                          ) : (
                            <Download className="w-5 h-5" />
                          )}
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
