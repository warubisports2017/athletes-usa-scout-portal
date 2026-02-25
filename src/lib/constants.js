// Shared status configuration — single source of truth
// Matches QV4's actual process_status values from StatusBadge.jsx
// Used by: LeadsList, LeadDetail, Dashboard, CoachWidget, CoachTab

export const STATUS_CONFIG = {
  'New':              { bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    order: 0 },
  'Building Profile': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   order: 1 },
  'Ready to Promote': { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    order: 2 },
  'In Contact':       { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', order: 3 },
  'In Conversation':  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', order: 4 },
  'Offer Received':   { bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500',  order: 5 },
  'Committed':        { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  order: 6 },
  'Placed':           { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-500',   order: 7 },
  'Unresponsive':     { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     order: 8 },
  'Indecisive':       { bg: 'bg-yellow-100',  text: 'text-yellow-700',  dot: 'bg-yellow-500',  order: 9 },
  'On Hold':          { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400',    order: 10 },
  'Lost':             { bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400',    order: 11 },
  'Archived':         { bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400',    order: 12 },
}

// Simplified 6-stage pipeline for progress bars
// Collapses 13 statuses into scout-friendly milestones
export const STATUS_PIPELINE = [
  { key: 'New',              label: 'New',              dot: 'bg-cyan-500' },
  { key: 'Building Profile', label: 'Building Profile', dot: 'bg-amber-500' },
  { key: 'In Contact',       label: 'In Contact',       dot: 'bg-emerald-500' },
  { key: 'Offer Received',   label: 'Offer Received',   dot: 'bg-violet-500' },
  { key: 'Committed',        label: 'Committed',        dot: 'bg-purple-500' },
  { key: 'Placed',           label: 'Placed',           dot: 'bg-green-500' },
]

// Maps every QV4 status → pipeline position (0-5)
const STATUS_TO_PIPELINE_INDEX = {
  'New':              0,
  'Building Profile': 1,
  'Ready to Promote': 1,
  'In Contact':       2,
  'In Conversation':  2,
  'Offer Received':   3,
  'Committed':        4,
  'Placed':           5,
  // Paused/inactive statuses → show at beginning
  'Unresponsive':     0,
  'Indecisive':       0,
  'On Hold':          0,
  'Lost':             0,
  'Archived':         0,
}

export const FILTER_CATEGORIES = [
  { id: 'all',       label: 'All',        statuses: null },
  { id: 'new',       label: 'New',        statuses: ['New'] },
  { id: 'building',  label: 'Building',   statuses: ['Building Profile', 'Ready to Promote'] },
  { id: 'contact',   label: 'In Contact', statuses: ['In Contact', 'In Conversation', 'Offer Received'] },
  { id: 'committed', label: 'Committed',  statuses: ['Committed'] },
  { id: 'placed',    label: 'Placed',     statuses: ['Placed'] },
  { id: 'paused',    label: 'Paused',     statuses: ['Unresponsive', 'Indecisive', 'On Hold', 'Lost', 'Archived'] },
]

export function getStatusStyle(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['New']
}

export function getStatusIndex(status) {
  return STATUS_TO_PIPELINE_INDEX[status] ?? 0
}
