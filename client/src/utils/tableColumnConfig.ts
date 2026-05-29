export interface ColumnDef {
  id: string
  label: string
  group: ColumnGroupId
  defaultVisible: boolean
  fieldKey: string
  render?: 'text' | 'mark' | 'badge' | 'statusBadge' | 'jurisdictionBadge' | 'filingBadge' | 'actions'
  sortable?: boolean
}

export type ColumnGroupId = 'markInfo' | 'dates' | 'status' | 'client' | 'priority' | 'lifecycle'

export interface ColumnGroup {
  id: ColumnGroupId
  label: string
  color: string
}

export interface Preset {
  id: string
  label: string
  description: string
  columns: string[]
}

const STORAGE_KEY = 'eaip_tm_column_vis'

export const COLUMN_GROUPS: ColumnGroup[] = [
  { id: 'markInfo', label: 'Mark Info', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'dates', label: 'Dates', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'status', label: 'Status', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'client', label: 'Client', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'priority', label: 'Priority', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'lifecycle', label: 'Lifecycle', color: 'bg-slate-100 text-slate-800 border-slate-300' },
]

export const PRESETS: Preset[] = [
  {
    id: 'default',
    label: 'Default View',
    description: 'Mark, Client, Region, Status, Filing #, Actions',
    columns: ['markName', 'clientName', 'jurisdiction', 'status', 'filingNumber', 'actions'],
  },
  {
    id: 'full',
    label: 'Full View',
    description: 'All columns visible',
    columns: [
      'markName', 'markType', 'filingNumber', 'registrationNumber', 'certificateNumber', 'colorIndication',
      'filingDate', 'publicationDate', 'registrationDate', 'expiryDate', 'nextRenewalDate', 'nextActionDate',
      'status', 'flowStage', 'jurisdiction',
      'clientName', 'clientType',
      'priority', 'priorityCountry', 'priorityFilingDate',
      'createdAt', 'updatedAt', 'deadlineType', 'deadlineDue', 'actions',
    ],
  },
  {
    id: 'deadline',
    label: 'Deadline View',
    description: 'Dates-focused view for deadline monitoring',
    columns: ['markName', 'status', 'filingNumber', 'expiryDate', 'nextActionDate', 'deadlineType', 'deadlineDue', 'actions'],
  },
]

export const DEFAULT_VISIBLE_COLUMNS: string[] = [
  'markName', 'clientName', 'jurisdiction', 'status', 'filingNumber', 'actions',
]

export const ALL_COLUMNS: ColumnDef[] = [
  // Mark Info
  { id: 'markName', label: 'Mark Name', group: 'markInfo', defaultVisible: true, fieldKey: 'markName_render', render: 'mark' },
  { id: 'markType', label: 'Mark Type', group: 'markInfo', defaultVisible: false, fieldKey: 'mark_type' },
  { id: 'filingNumber', label: 'Filing Number', group: 'markInfo', defaultVisible: true, fieldKey: 'filing_number', render: 'filingBadge' },
  { id: 'registrationNumber', label: 'Reg. Number', group: 'markInfo', defaultVisible: false, fieldKey: 'registration_number' },
  { id: 'certificateNumber', label: 'Certificate No.', group: 'markInfo', defaultVisible: false, fieldKey: 'certificate_number' },
  { id: 'colorIndication', label: 'Color Indication', group: 'markInfo', defaultVisible: false, fieldKey: 'color_indication' },

  // Dates
  { id: 'filingDate', label: 'Filing Date', group: 'dates', defaultVisible: false, fieldKey: 'filing_date' },
  { id: 'publicationDate', label: 'Pub. Date', group: 'dates', defaultVisible: false, fieldKey: 'publication_date' },
  { id: 'registrationDate', label: 'Reg. Date', group: 'dates', defaultVisible: false, fieldKey: 'registration_dt' },
  { id: 'expiryDate', label: 'Expiry Date', group: 'dates', defaultVisible: false, fieldKey: 'expiry_date' },
  { id: 'nextRenewalDate', label: 'Next Renewal', group: 'dates', defaultVisible: false, fieldKey: 'next_renewal_date' },
  { id: 'nextActionDate', label: 'Next Action', group: 'dates', defaultVisible: false, fieldKey: 'next_action_date' },

  // Status
  { id: 'status', label: 'Status', group: 'status', defaultVisible: true, fieldKey: 'status', render: 'statusBadge' },
  { id: 'flowStage', label: 'Flow Stage', group: 'status', defaultVisible: false, fieldKey: 'flow_stage' },
  { id: 'jurisdiction', label: 'Region', group: 'status', defaultVisible: true, fieldKey: 'jurisdiction', render: 'jurisdictionBadge' },

  // Client
  { id: 'clientName', label: 'Client', group: 'client', defaultVisible: true, fieldKey: 'client_name' },
  { id: 'clientType', label: 'Client Type', group: 'client', defaultVisible: false, fieldKey: 'client_type' },

  // Priority
  { id: 'priority', label: 'Priority', group: 'priority', defaultVisible: false, fieldKey: 'priority' },
  { id: 'priorityCountry', label: 'Priority Country', group: 'priority', defaultVisible: false, fieldKey: 'priority_country' },
  { id: 'priorityFilingDate', label: 'Priority Filing Date', group: 'priority', defaultVisible: false, fieldKey: 'priority_filing_date' },

  // Lifecycle
  { id: 'createdAt', label: 'Created At', group: 'lifecycle', defaultVisible: false, fieldKey: 'created_at' },
  { id: 'updatedAt', label: 'Updated At', group: 'lifecycle', defaultVisible: false, fieldKey: 'updated_at' },
  { id: 'deadlineType', label: 'Deadline Type', group: 'lifecycle', defaultVisible: false, fieldKey: 'deadline_type' },
  { id: 'deadlineDue', label: 'Deadline Due', group: 'lifecycle', defaultVisible: false, fieldKey: 'deadline_due' },

  // Actions (always appended)
  { id: 'actions', label: 'Actions', group: 'lifecycle', defaultVisible: true, fieldKey: 'actions', render: 'actions' },
]

export interface ColumnPreferences {
  visibleColumns: string[]
  columnOrder: string[]
}

export function getDefaultPreferences(): ColumnPreferences {
  return {
    visibleColumns: [...DEFAULT_VISIBLE_COLUMNS],
    columnOrder: ALL_COLUMNS.map(c => c.id),
  }
}

export function loadColumnPreferences(): ColumnPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultPreferences()
    const parsed = JSON.parse(raw) as ColumnPreferences
    if (!Array.isArray(parsed.visibleColumns) || !Array.isArray(parsed.columnOrder)) {
      return getDefaultPreferences()
    }
    return parsed
  } catch {
    return getDefaultPreferences()
  }
}

export function saveColumnPreferences(prefs: ColumnPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function getGroupColumns(groupId: ColumnGroupId): ColumnDef[] {
  return ALL_COLUMNS.filter(c => c.group === groupId && c.id !== 'actions')
}

export function getColumnById(id: string): ColumnDef | undefined {
  return ALL_COLUMNS.find(c => c.id === id)
}
