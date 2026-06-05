import { useState, useCallback, useRef } from 'react'
import { Question } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Step } from 'react-joyride'
import Joyride, { STATUS } from 'react-joyride'

const pageTourConfigs: Record<string, Step[]> = {
  clients: [
    { target: 'body', placement: 'center', title: 'Client Directory', content: 'This is your client management hub. Here you can view, search, and manage all your clients and their IP portfolios.' },
    { target: 'h1', title: 'Page Title', content: 'The Clients page shows your complete client directory. Use the search bar to find specific clients quickly.' },
    { target: '[data-tour="new-client-btn"]', title: 'Add New Client', content: 'Click this button to onboard a new client. You will need their name, type (Individual/Company/Partnership), and contact details.' },
    { target: '[data-tour="search-input"]', title: 'Search Clients', content: 'Search by client name, email, or location. Results update as you type.' },
    { target: '[data-tour="filter-type"]', title: 'Filter by Type', content: 'Filter clients by type: Individual, Company, or Partnership. Useful for batch operations.' },
    { target: '[data-tour="view-toggle"]', title: 'View Modes', content: 'Toggle between Grid view (cards with details) and Table view (compact list).' },
    { target: '[data-tour="client-card"]', title: 'Client Cards', content: 'Each card shows the client name, type, email, and location. Click to view their full profile.' },
    { target: 'body', placement: 'center', title: 'Pro Tip', content: 'Select multiple clients using the checkbox to bulk delete or merge duplicate records.' }
  ],
  'client-detail': [
    { target: 'body', placement: 'center', title: 'Client Profile', content: 'This is the detailed view for a single client. You can see all their information and associated trademark cases.' },
    { target: 'h1', title: 'Client Name', content: 'The client\'s official name (in English) as registered in the system.' },
    { target: '[data-tour="edit-client-btn"]', title: 'Edit Button', content: 'Click to edit client details. Changes are saved immediately after clicking Save.' },
    { target: '[data-tour="identity-card"]', title: 'Identity Section', content: 'Shows the client type (Individual/Company/Partnership), gender, and local name in Amharic if provided.' },
    { target: '[data-tour="contact-card"]', title: 'Contact Info', content: 'Contains email, phone, fax, and the date the client was created in the system.' },
    { target: '[data-tour="address-card"]', title: 'Address Details', content: 'Full address including nationality, residence country, street, zone/wereda, city, state, and postal codes.' },
    { target: '[data-tour="trademarks-card"]', title: 'Associated Trademarks', content: 'Lists all trademark cases filed by this client. Click any case to view its details. Shows the mark name, filing number, jurisdiction, and status.' },
    { target: 'body', placement: 'center', title: 'Next Steps', content: 'From here, you can start a new trademark application using this client as the applicant.' }
  ],
  'new-client': [
    { target: 'body', placement: 'center', title: 'New Client Form', content: 'This form lets you onboard a new client to the system. Required fields are marked with an asterisk.' },
    { target: 'h1', title: 'Page Header', content: 'This is where you create a new client profile. Fill in all required fields to proceed.' },
    { target: '[data-tour="client-name-field"]', title: 'Client Name', content: 'Enter the full legal name of the client. This is required and appears on all official documents.' },
    { target: '[data-tour="client-type-field"]', title: 'Client Type', content: 'Select Individual, Company, or Partnership. This determines the fields shown in the form.' },
    { target: '[data-tour="email-field"]', title: 'Email Address', content: 'Enter a valid email for communications. This is how the client receives updates.' },
    { target: '[data-tour="nationality-field"]', title: 'Nationality', content: 'Select the client\'s nationality from the dropdown. This is required for IP filings.' },
    { target: '[data-tour="address-fields"]', title: 'Address Details', content: 'Fill in the street address, city, zone/wereda, and postal code. These details are required by IP offices.' },
    { target: '[data-tour="submit-btn"]', title: 'Create Client', content: 'Click the button to create the client. You can then use them in trademark applications.' }
  ],
  dashboard: [
    { target: 'body', placement: 'center', title: 'Dashboard', content: 'Your command center for the East African IP registry. Real-time insights at a glance.' },
    { target: 'h1', title: 'Page Title', content: 'Overview of your entire IP portfolio showing key performance indicators and critical alerts.' },
    { target: '[data-tour="stats-cards"]', title: 'Statistics Overview', content: 'Key metrics showing total cases, active trademarks, pending deadlines, renewal windows, and financial summaries at a glance.' },
    { target: 'body', placement: 'center', title: 'Drill Into Details', content: 'Each stat card acts as a navigation tile — click any card to jump directly to that section (Trademarks, Deadlines, or Billing).' },
    { target: '[data-tour="quick-actions"]', title: 'Quick Actions', content: 'Fast access to common tasks: new trademark applications, renewals, viewing trademarks, or checking deadlines.' },
    { target: '[data-tour="recent-activity"]', title: 'Recent Activity', content: 'Timeline of the latest actions across your portfolio. Click any entry to view the full trademark case.' },
    { target: '[data-tour="calendar-widget"]', title: 'Deadline Calendar', content: 'Visual calendar showing upcoming deadlines. Days with pending items are highlighted for quick reference.' },
    { target: '[data-tour="financial-status"]', title: 'Financial Summary', content: 'Breakdown of invoiced, outstanding, and overdue amounts by currency. Only visible to admins.' },
    { target: 'nav', title: 'Sidebar Navigation', content: 'Quickly jump between modules — Trademarks, Clients, Deadlines, Billing, and Forms — using the sidebar.' },
    { target: 'body', placement: 'center', title: 'Pro Tip', content: 'Hover over any stat card to see quick navigation hints. Use the Help button (?) on any page to re-run this tour.' }
  ],
  trademarks: [
    { target: 'body', placement: 'center', title: 'Trademark Registry', content: 'The central hub for managing all trademark applications and registrations across East Africa.' },
    { target: 'h1', title: 'Page Title', content: 'Complete trademark portfolio. Search, filter, and manage your intellectual property assets.' },
    { target: '[data-tour="search-input"]', title: 'Search Trademarks', content: 'Search by mark name, filing number, client name, or jurisdiction. Results update in real-time as you type.' },
    { target: '[data-tour="jurisdiction-filter"]', title: 'Filter by Jurisdiction', content: 'Narrow results by East African jurisdiction: Ethiopia, Kenya, Tanzania, Uganda, Rwanda, or Burundi.' },
    { target: '[data-tour="status-filter"]', title: 'Filter by Status', content: 'Filter by examination stage: Draft, Filed, Formal Exam, Substantive Exam, Published, or Registered.' },
    { target: '[data-tour="columns-button"]', title: 'Customize Columns', content: 'Choose which columns to display in the table. Toggle fields like mark image, dates, colors, and priority info.' },
    { target: '[data-tour="export-button"]', title: 'Export to Excel', content: 'Download the current view as a formatted Excel spreadsheet with images and structured data.' },
    { target: 'table', title: 'Trademark Data Grid', content: 'All trademarks displayed in a sortable, paginated table. Click any row to view full case details and manage the lifecycle.' },
    { target: '[data-tour="new-application-button"]', title: 'New Application', content: 'Start a new trademark application. Choose the jurisdiction and fill in the required details.' },
    { target: '[data-tour="view-toggle"]', title: 'View Modes', content: 'Switch between Table view (compact data grid) and Grid view (card layout with mark images).' },
    { target: 'body', placement: 'center', title: 'Select & Batch', content: 'Use checkboxes to select multiple trademarks for bulk operations like moving to trash.' },
    { target: 'body', placement: 'center', title: 'Pro Tip', content: 'Click any trademark name to drill into the full case record with timeline, documents, and lifecycle management.' }
  ],
  deadlines: [
    { target: 'body', placement: 'center', title: 'Statutory Deadlines', content: 'Track critical deadlines for oppositions, renewals, responses, and other trademark actions across all jurisdictions.' },
    { target: 'h1', title: 'Page Title', content: 'Comprehensive deadline tracker showing days remaining for each action item.' },
    { target: '[data-tour="search-input"]', title: 'Search Deadlines', content: 'Search deadlines by trademark name, client, or deadline type. Narrow down quickly to find specific items.' },
    { target: '[data-tour="filter-status"]', title: 'Filter by Status', content: 'Filter deadlines by status: Pending, Completed, Overdue, or Upcoming. Focus on what needs attention.' },
    { target: '[data-tour="filter-jurisdiction"]', title: 'Filter by Jurisdiction', content: 'Focus on deadlines for a specific country. Useful when managing jurisdiction-specific filing calendars.' },
    { target: '[data-tour="calendar-view"]', title: 'Calendar View', content: 'Visual monthly calendar showing deadlines plotted by due date. Click any date to filter deadlines for that day.' },
    { target: '[data-tour="export-btn"]', title: 'Export to Excel', content: 'Download the complete deadline list as a formatted Excel file with color-coded urgency indicators.' },
    { target: '[data-tour="deadline-list"]', title: 'Deadline List', content: 'Each entry shows the trademark, deadline type, due date, and days remaining. Overdue items are highlighted in red.' }
  ],
  billing: [
    { target: 'body', placement: 'center', title: 'Billing & Financials', content: 'Manage invoices, track payments, and oversee fee collections across your entire IP portfolio.' },
    { target: 'h1', title: 'Page Title', content: 'Complete financial overview with invoicing stats, outstanding balances, and payment tracking.' },
    { target: '[data-tour="stats-cards"]', title: 'Financial Statistics', content: 'Quick overview of total invoiced, paid, outstanding, and overdue amounts across all clients.' },
    { target: '[data-tour="filter-status"]', title: 'Filter by Status', content: 'Filter invoices by payment status: Paid, Pending, Overdue, or Cancelled. Focus on outstanding collections.' },
    { target: '[data-tour="filter-date"]', title: 'Date Range Filter', content: 'Set a custom date range to view invoices within a specific period. Useful for monthly or quarterly reporting.' },
    { target: '[data-tour="invoice-list"]', title: 'Invoice List', content: 'All invoices sorted by date. Each row shows the invoice number, client, amount, and payment status. Click to view details.' },
    { target: '[data-tour="export-btn"]', title: 'Export to Excel', content: 'Download the filtered invoice list as a formatted Excel spreadsheet with currency formatting.' },
    { target: '[data-tour="create-invoice-btn"]', title: 'Generate Invoice', content: 'Create a new invoice for a client. Select the associated trademark and fee type to auto-calculate amounts.' }
  ],
  trash: [
    { target: 'body', placement: 'center', title: 'Trash', content: 'Deleted items are moved here. Restore or permanently remove records as needed.' },
    { target: 'h1', title: 'Page Title', content: 'Browse all deleted trademarks, clients, and invoices in one place.' },
    { target: '[data-tour="tab-trademarks"]', title: 'Deleted Trademarks', content: 'View all trademark cases that have been moved to trash. Restore or permanently delete them.' },
    { target: '[data-tour="tab-clients"]', title: 'Deleted Clients', content: 'View deleted client records. Restoring a client also restores their associated cases and invoices.' },
    { target: '[data-tour="tab-invoices"]', title: 'Deleted Invoices', content: 'View deleted invoices. Restore invoices that were accidentally removed.' },
    { target: '[data-tour="item-list"]', title: 'Item List', content: 'Each item shows the name, type, and deletion date. Use the action buttons to restore or permanently delete.' },
    { target: '[data-tour="restore-btn"]', title: 'Restore Item', content: 'Click to restore a deleted item back to its original location. All associated data is preserved.' }
  ],
  profile: [
    { target: 'body', placement: 'center', title: 'Account Settings', content: 'Manage your professional profile, company information, security credentials, and agent permissions.' },
    { target: 'h1', title: 'Page Title', content: 'Full account management hub. Update your personal details, change passwords, and configure 2FA.' },
    { target: '[data-tour="profile-tabs"]', title: 'Settings Tabs', content: 'Navigate between Profile (personal info), Company (firm details), Security (password & 2FA), and Agent management sections.' },
    { target: '[data-tour="profile-tab"]', title: 'Profile Section', content: 'Update your name, email, phone number, and profile picture. Changes are saved to your account immediately.' },
    { target: '[data-tour="company-tab"]', title: 'Company Information', content: 'Manage your firm name, address, and billing details. Used on invoices and official correspondence.' },
    { target: '[data-tour="security-tab"]', title: 'Security Settings', content: 'Change your password, configure two-factor authentication (TOTP), and review recent login activity.' },
    { target: '[data-tour="edit-profile-btn"]', title: 'Edit Profile', content: 'Click the edit button on any section to modify your details. Save changes before navigating away.' }
  ],
  'pending-admins': [
    { target: 'body', placement: 'center', title: 'Pending Administrators', content: 'Review and approve new administrator accounts for your firm. Only super admins can access this page.' },
    { target: 'h1', title: 'Page Title', content: 'Approval queue for new administrator registrations. Each request shows applicant details and timestamps.' },
    { target: '[data-tour="search-input"]', title: 'Search Requests', content: 'Search pending admin requests by name or email. Quickly find specific applications.' },
    { target: '[data-tour="admin-list"]', title: 'Request List', content: 'Each entry shows the applicant name, email, firm, and submission date. Review details before deciding.' },
    { target: '[data-tour="approve-btn"]', title: 'Approve Admin', content: 'Click to approve the administrator request. The user will receive an email notification and gain access immediately.' },
    { target: '[data-tour="reject-btn"]', title: 'Reject Request', content: 'Click to reject the administrator request. You can provide a reason which will be shared with the applicant.' }
  ],
  'case-flow': [
    { target: 'body', placement: 'center', title: 'Case Lifecycle', content: 'Track the full lifecycle of a trademark case from initial filing through examination, publication, and registration.' },
    { target: 'h1', title: 'Case Header', content: 'Shows the mark name, filing number, jurisdiction, and current status. All key identifiers in one place.' },
    { target: '[data-tour="case-status-card"]', title: 'Status Summary', content: 'Current case status, filing and registration dates, and key identifiers. The colored badge indicates the stage.' },
    { target: '[data-tour="stage-tracker"]', title: 'Stage Tracker', content: 'Visual timeline showing the case progression through each lifecycle stage. Completed stages are marked green, current is highlighted.' },
    { target: '[data-tour="action-buttons"]', title: 'Lifecycle Actions', content: 'Advance the case through stages, mark deadlines as complete, or reverse a stage if corrections are needed.' },
    { target: '[data-tour="case-notes"]', title: 'Case Notes', content: 'Internal notes and comments attached to this case. Add notes during examination or correspondence tracking.' }
  ],
  'invoice-detail': [
    { target: 'body', placement: 'center', title: 'Invoice Detail', content: 'Complete view of a single invoice including line items, payment history, status, and management actions.' },
    { target: 'h1', title: 'Invoice Header', content: 'Invoice number, client name, and associated trademark. Shows the current status at a glance.' },
    { target: '[data-tour="invoice-status"]', title: 'Payment Status', content: 'Current payment status (Paid, Pending, Overdue, or Cancelled). Status changes as payments are recorded.' },
    { target: '[data-tour="invoice-line-items"]', title: 'Line Items', content: 'Detailed breakdown of charges including fee types, descriptions, and amounts. Each line contributes to the total.' },
    { target: '[data-tour="payment-section"]', title: 'Payment History', content: 'Record of all payments made against this invoice. Shows payment dates, methods, and amounts received.' },
    { target: '[data-tour="edit-btn"]', title: 'Edit Invoice', content: 'Modify invoice line items, adjust amounts, or update billing details. Changes are logged for audit purposes.' },
    { target: '[data-tour="download-btn"]', title: 'Download Invoice', content: 'Download a PDF version of the invoice formatted for client presentation or record keeping.' }
  ],
  'deadline-detail': [
    { target: 'body', placement: 'center', title: 'Deadline Intelligence', content: 'Detailed analysis for a specific deadline including strategic context, next steps, and actionable recommendations.' },
    { target: 'h1', title: 'Page Title', content: 'In-depth view of a single deadline with all associated metadata and recommended actions.' },
    { target: '[data-tour="deadline-info-card"]', title: 'Deadline Overview', content: 'Deadline type, due date, days remaining, and priority level. Critical deadlines are prominently flagged.' },
    { target: '[data-tour="strategic-context"]', title: 'Strategic Context', content: 'Why this deadline matters and what actions are required. Includes jurisdiction-specific requirements and timelines.' },
    { target: '[data-tour="deadline-actions"]', title: 'Actions', content: 'Quick actions to respond to this deadline including marking as complete, filing a response, or requesting an extension.' },
    { target: '[data-tour="trademark-link"]', title: 'Associated Trademark', content: 'Link to the full trademark case record. Click to review the case details before taking action on the deadline.' }
  ],
  'trademark-detail': [
    { target: 'body', placement: 'center', title: 'Trademark Detail', content: 'Complete record for a single trademark case. View all details, edit information, or manage the case lifecycle.' },
    { target: 'h1', title: 'Mark Name', content: 'The trademark name with filing number, jurisdiction badge, and current status indicator all visible at a glance.' },
    { target: '[data-tour="status-section"]', title: 'Status & Classification', content: 'Current examination status, Nice classification numbers, and filing/registration dates. The color-coded badge shows the stage.' },
    { target: '[data-tour="applicant-section"]', title: 'Applicant Information', content: 'Client/owner details including name, nationality, and contact information used for this filing.' },
    { target: '[data-tour="nice-classifications"]', title: 'Nice Classifications', content: 'International classification of goods and services. Each class number with description defines the scope of protection.' },
    { target: '[data-tour="action-buttons"]', title: 'Case Actions', content: 'Manage lifecycle, process renewals, download PDF forms, or edit case details. Actions are role-based.' },
    { target: '[data-tour="timeline-section"]', title: 'Case Timeline', content: 'Historical record of all actions taken on this case including filings, office actions, and status changes.' }
  ]
}

interface HelpButtonProps {
  pageId: string
}

export default function HelpButton({ pageId }: HelpButtonProps) {
  const [runTour, setRunTour] = useState(false)
  const animCount = useRef(0)
  const styleEl = useRef<HTMLStyleElement>(null)

  const steps = pageTourConfigs[pageId] || []

  const handleStartTour = useCallback(() => {
    setRunTour(true)
  }, [])

  const handleCallback = useCallback((data: { status: string; type: string }) => {
    if (data.type === 'step:after') {
      animCount.current++
      if (styleEl.current) {
        const name = `ti${animCount.current}`
        styleEl.current.textContent = `
          .react-joyride__tooltip { animation: ${name} 0.35s ease-out !important; }
          @keyframes ${name} {
            from { opacity: 0; transform: translateY(8px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `
      }
    }
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRunTour(false)
    }
  }, [])

  if (steps.length === 0) {
    return null
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStartTour}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Start help tour"
            >
              <Question size={20} weight="regular" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Help & Tutorial</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Joyride
        run={runTour}
        steps={steps}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableOverlayClose
        disableScrolling={false}
        spotlightClicks={true}
        callback={handleCallback}
        styles={{
          options: {
            primaryColor: '#0f172a',
            textColor: '#1e293b',
            zIndex: 10000,
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
          },
          buttonNext: {
            backgroundColor: '#0f172a',
            borderRadius: '6px',
          },
          buttonBack: {
            marginRight: '10px',
          },
        }}
      />
      <style ref={styleEl}>{`
        .react-joyride__tooltip { animation: tourStepIn 0.35s ease-out; }
        @keyframes tourStepIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}