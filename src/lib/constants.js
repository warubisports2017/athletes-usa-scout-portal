// Shared status configuration — single source of truth
// Used by: LeadsList, LeadDetail, Dashboard

export const STATUS_CONFIG = {
  'Lead Created': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', order: 0 },
  'Eval Call':    { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', order: 1 },
  'Assessment':   { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', order: 2 },
  'Signed':       { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', order: 3 },
  'In Process':   { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', order: 4 },
  'Placed':       { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', order: 5 },
}

export const STATUS_PIPELINE = Object.entries(STATUS_CONFIG)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key, val]) => ({ key, label: key, ...val }))

export const FILTER_CATEGORIES = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'new', label: 'New', statuses: ['Lead Created'] },
  { id: 'evaluating', label: 'Evaluating', statuses: ['Eval Call', 'Assessment'] },
  { id: 'active', label: 'Active', statuses: ['Signed', 'In Process'] },
  { id: 'placed', label: 'Placed', statuses: ['Placed'] },
]

export function getStatusStyle(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['Lead Created']
}

export function getStatusIndex(status) {
  return STATUS_CONFIG[status]?.order ?? 0
}
