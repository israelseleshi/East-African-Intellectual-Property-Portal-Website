# TPMS UI Changes - Phase 4 Implementation

## Overview
This document details all UI changes made during Phase 4 of the TPMS enhancement project, which implemented 6 new major features with corresponding frontend components.

---

## New Components Created

### 1. JurisdictionSelector (`components/JurisdictionSelector.tsx`)
**Purpose**: Smart jurisdiction dropdown with rules display

**Features**:
- Dropdown of all jurisdictions from database
- Real-time display of jurisdiction rules:
  - Opposition period (days)
  - Renewal period (years)
  - Currency code
  - Rules summary
- Integrated with `useApi` hook
- TypeScript interfaces for jurisdiction data

**Usage**:
```tsx
<JurisdictionSelector 
  value={jurisdiction} 
  onChange={(code, jurisdiction) => setJurisdiction(code)} 
/>
```

**Integration Points**:
- Case creation form
- Case edit form
- Fee calculation components

---

### 2. CaseNotesTab (`components/CaseNotesTab.tsx`)
**Purpose**: Threaded case discussion system

**Features**:
- Add new notes with type selection:
  - GENERAL, CLIENT_COMMUNICATION, PHONE_CALL, INTERNAL, STRATEGY
- Privacy controls (is_private checkbox)
- Threaded replies to notes
- Pin/unpin important notes
- Delete notes with confirmation
- Color-coded note type badges
- Relative timestamps (e.g., "2 hours ago")
- Real-time updates

**Usage**:
```tsx
<CaseNotesTab caseId={caseId} />
```

**Integration Points**:
- Case detail page as a tab
- Shows all notes for a specific case

---

### 3. OppositionSection (`components/OppositionSection.tsx`)
**Purpose**: Third-party opposition tracking

**Features**:
- Form to record new oppositions:
  - Opponent name, address, representative
  - Opposition grounds
  - Opposition date
  - Automatic deadline calculation
- List view of all oppositions for a case
- Status badges (PENDING, RESPONDED, RESOLVED, WITHDRAWN)
- Deadline warnings (color-coded: red <7 days, orange <30 days, green >30 days)
- Quick actions: Mark Responded / Mark Resolved
- Shows "time remaining" for pending oppositions

**Usage**:
```tsx
<OppositionSection caseId={caseId} jurisdiction={case.jurisdiction} />
```

**Integration Points**:
- Case detail page as a tab or section
- Automatic deadline creation in deadlines table

---

### 4. FeeCalculator (`components/FeeCalculator.tsx`)
**Purpose**: Real-time fee estimation

**Features**:
- Calculates fees by jurisdiction and stage
- Shows fee breakdown by category:
  - OFFICIAL_FEE (blue badge)
  - PROFESSIONAL_FEE (purple badge)
  - DISBURSEMENT (orange badge)
- Expandable stages with detailed line items
- Stage totals and grand total
- Multi-currency support (ETB, KES, USD)
- Collapsible stage sections

**Usage**:
```tsx
<FeeCalculator caseId={caseId} />
// OR
<FeeCalculator jurisdiction="ET" currentStage="FILED" />
```

**Integration Points**:
- Case detail page (case fees tab)
- Billing page
- Invoice generation

---

### 5. NotificationBell (`components/NotificationBell.tsx`)
**Purpose**: Real-time notification center in header

**Features**:
- Bell icon in top navigation
- Unread count badge (red dot with number)
- Dropdown with recent notifications
- Polling every 30 seconds for new notifications
- Click to mark as read
- "Mark all as read" button
- Notification types with icons:
  - DEADLINE_REMINDER (⏰)
  - STATUS_CHANGE (📋)
  - OPPOSITION_ALERT (⚠️)
  - INVOICE_DUE (💰)
- Links to related cases
- Click notification to navigate to case

**Usage**:
```tsx
// Already integrated in TopBar.tsx
<NotificationBell />
```

**Integration Points**:
- TopBar component (always visible)
- Links to NotificationsPage

---

### 6. NotificationsPage (`pages/NotificationsPage.tsx`)
**Purpose**: Full notification history and management

**Features**:
- List of all notifications
- Filter: All / Unread only
- Mark individual notifications as read
- Mark all as read
- Click to navigate to related case
- Notification details:
  - Type badge
  - Subject
  - Content preview
  - Case/client info
  - Delivery status
  - Timestamp
- Group by date

**Route**: `/notifications`

---

### 7. TrashPage (`pages/TrashPage.tsx`)
**Purpose**: Soft delete management and recovery

**Features**:
- Filter by resource type:
  - Clients, Cases, Invoices
  - Notes, Oppositions, Fee Schedules
- Table view of deleted items:
  - Resource type badge
  - Name and details
  - Deletion timestamp
  - Deleted by user
- Restore action (sets deleted_at = NULL)
- Permanent delete action (with confirmation)
- "Empty Trash" button
- Info box explaining soft deletes

**Route**: `/trash`

---

## Supporting Infrastructure

### useApi Hook (`hooks/useApi.ts`)
**Purpose**: Centralized API client

**Features**:
- GET, POST, PATCH, PUT, DELETE methods
- Automatic JWT token injection
- JSON serialization
- Error handling
- Base URL from environment

**Usage**:
```tsx
const api = useApi();
const data = await api.get('/cases');
await api.post('/notes', { caseId, content });
```

---

### Formatters Utility (`utils/formatters.ts`)
**Purpose**: Consistent data formatting

**Functions**:
- `formatCurrency(amount, currency)` - e.g., "$1,250.00"
- `formatNumber(num, decimals)` - e.g., "1,234.56"
- `formatDate(date)` - e.g., "Jan 15, 2024"
- `formatDateTime(date)` - e.g., "Jan 15, 2024, 2:30 PM"

---

## Modified Components

### TopBar.tsx
**Changes**:
- Added `NotificationBell` import
- Integrated `NotificationBell` in header actions
- Positioned between theme toggle and user info

### Package.json
**Added Dependencies**:
- `date-fns: ^3.6.0` - Date formatting and manipulation

**Removed**:
- `@eai/database: workspace:*` - Was causing pnpm issues

---

## New API Routes Consumed by Frontend

| Route | Component | Purpose |
|-------|-----------|---------|
| `GET /api/jurisdictions` | JurisdictionSelector | List all jurisdictions |
| `GET /api/jurisdictions/:code/rules` | JurisdictionSelector | Get jurisdiction rules |
| `GET /api/notes/case/:caseId` | CaseNotesTab | Get case notes |
| `POST /api/notes` | CaseNotesTab | Create note |
| `POST /api/notes/:id/reply` | CaseNotesTab | Reply to note |
| `PATCH /api/notes/:id/pin` | CaseNotesTab | Pin/unpin note |
| `DELETE /api/notes/:id` | CaseNotesTab | Soft delete note |
| `GET /api/oppositions/case/:caseId` | OppositionSection | Get case oppositions |
| `POST /api/oppositions` | OppositionSection | Create opposition |
| `PATCH /api/oppositions/:id/status` | OppositionSection | Update status |
| `GET /api/fees/case/:caseId` | FeeCalculator | Get case fees |
| `GET /api/fees/calculate/:j/:s` | FeeCalculator | Get fees by jurisdiction/stage |
| `GET /api/notifications` | NotificationBell, NotificationsPage | List notifications |
| `GET /api/notifications/unread/count` | NotificationBell | Get unread count |
| `PATCH /api/notifications/:id/read` | NotificationBell | Mark as read |
| `PATCH /api/notifications/read-all` | NotificationsPage | Mark all as read |

---

## UI/UX Improvements

### Design System Consistency
- All components use existing Tailwind classes
- Color-coded badges for different types:
  - Blue: Official Fees, Information
  - Purple: Professional Fees
  - Green: Success states
  - Red: Urgent deadlines, Errors
  - Yellow: Warnings, Pinned items
  - Orange: Disbursements

### Responsive Design
- Components work on mobile and desktop
- Tables scroll horizontally on small screens
- Dropdowns are full-width on mobile

### Accessibility
- Button labels and aria-labels
- Keyboard navigation support
- Form labels associated with inputs

### Performance
- useCallback for memoized functions
- useEffect with proper dependencies
- API polling with cleanup (NotificationBell)

---

## Testing Checklist

- [ ] JurisdictionSelector shows rules correctly
- [ ] CaseNotesTab threading works
- [ ] OppositionSection deadline warnings accurate
- [ ] FeeCalculator totals correct
- [ ] NotificationBell polls correctly
- [ ] All components handle API errors gracefully
- [ ] Mobile responsive design
- [ ] Dark mode compatibility (if applicable)

---

## Future Enhancements

### Phase 5 Considerations
- Real-time notifications via WebSocket
- Drag-and-drop file upload for mark_assets
- Advanced filtering in TrashPage
- Bulk actions in NotificationsPage

---

*Document Version: 1.0*
*Last Updated: February 21, 2026*
