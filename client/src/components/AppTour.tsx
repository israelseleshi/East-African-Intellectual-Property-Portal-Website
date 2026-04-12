import * as JoyrideLib from 'react-joyride'
import type { CallBackProps, Step } from 'react-joyride'
import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

const routeSteps: Record<string, Step[]> = {
  '/': [
    { target: 'body', placement: 'center', title: 'Dashboard Overview', content: 'Welcome to your IP Command Center. This tour will guide you through the key metrics and management tools.' },
    { target: 'h1', title: 'Command Center', content: 'This is the heart of your workspace, providing a high-level view of your entire IP operation.' },
    { target: '.grid', title: 'Live Statistics', content: 'Monitor total trademarks, active filings, and pending registries in real-time.' },
    { target: '.grid > div:nth-child(1)', title: 'Total Portfolio', content: 'The total number of IP assets currently under management.' },
    { target: '.grid > div:nth-child(2)', title: 'Filing Activity', content: 'Tracks trademarks currently in the "Filed" status across all jurisdictions.' },
    { target: '.grid > div:nth-child(3)', title: 'Pending Actions', content: 'Alerts you to cases requiring immediate attention or formal examinations.' },
    { target: '.bg-muted\\/30', title: 'Maintenance Alerts', content: 'System status updates and scheduled maintenance windows are displayed here.' },
    { target: 'nav', title: 'Navigation Sidebar', content: 'Quickly jump between different modules like Trademarks, Clients, and Billing.' },
    { target: 'header', title: 'Global Actions', content: 'Access your profile, notifications, and global search from the top bar.' },
    { target: 'body', placement: 'center', title: 'Pro Tip', content: 'You can return to the Help section at any time by clicking the Help icon in the sidebar.' }
  ],
  '/trademarks': [
    { target: 'body', placement: 'center', title: 'Trademark Management', content: 'Efficiently organize and track thousands of trademarks across multiple countries.' },
    { target: 'h1', title: 'Docketing Grid', content: 'This view lists every mark with its current status, jurisdiction, and official filing number.' },
    { target: 'button:has(svg)', title: 'Quick Filters', content: 'Narrow down your list by Jurisdiction, Status, or Client in seconds.' },
    { target: 'input[placeholder*="Search"]', title: 'Global Registry Search', content: 'Find any mark by name, number, or owner across your entire database.' },
    { target: '.grid > div:first-child', title: 'Trademark Cards', content: 'Click on any card to view detailed case history, documents, and deadlines.' },
    { target: 'svg[class*="ShieldCheck"]', title: 'Security & Verification', content: 'Indicates the record is verified against the official government registry.' },
    { target: 'button:contains("Download")', title: 'Export Data', content: 'Generate Excel or PDF reports of your current view for client reporting.' },
    { target: 'button:contains("New")', title: 'Add Record', content: 'Manually add an existing trademark record that was filed outside the system.' },
    { target: 'nav aside', title: 'Module Selector', content: 'Switch to the Application Form to start a fresh filing for a new mark.' },
    { target: 'body', placement: 'center', title: 'Case Documents', content: 'Remember that you can upload POAs, Certificates, and Images directly into each case file.' }
  ],
  '/clients': [
    { target: 'body', placement: 'center', title: 'Client Relationships', content: 'Manage all your clients and their associated intellectual property portfolios.' },
    { target: 'h1', title: 'Client Directory', content: 'A centralized list of all companies and individuals you represent.' },
    { target: 'table', title: 'Client List', content: 'View contact details, total cases, and billing status for every client.' },
    { target: 'button:contains("Add")', title: 'Onboard Client', content: 'Create a new client profile before starting their first trademark application.' },
    { target: 'tr:first-child', title: 'Client Profile', content: 'Clicking a client allows you to see their specific trademark portfolio and documents.' },
    { target: 'input', title: 'Filter Clients', content: 'Quickly find a client by name or email address.' },
    { target: 'th:contains("Cases")', title: 'Portfolio Size', content: 'Easily see which clients have the largest IP footprint in your system.' },
    { target: 'th:contains("Status")', title: 'Account Status', content: 'Identify active, inactive, or priority clients at a glance.' },
    { target: 'td:last-child', title: 'Quick Actions', content: 'Edit details or view specific case reports directly from the list.' },
    { target: 'body', placement: 'center', title: 'Next Steps', content: 'Once a client is added, you can select them from the Application Form to auto-fill fields.' }
  ],
  '/eipa-forms': [
    { target: 'body', placement: 'center', title: 'Smart Filing Assistant', content: 'Automate the generation of official EIPA (Ethiopia IP Authority) application forms.' },
    { target: 'h1', title: 'Application Form', content: 'This dynamic form mirrors the official government requirements.' },
    { target: 'button:contains("Client")', title: 'Auto-Fill', content: 'Select an existing client to instantly populate all their contact and legal details.' },
    { target: '.space-y-6:nth-child(1)', title: 'The Applicant', content: 'Details about the person or entity claiming ownership of the mark.' },
    { target: '.space-y-6:nth-child(2)', title: 'The Mark', content: 'Upload the image and specify if it is a word, logo, or dimensional mark.' },
    { target: '.grid', title: 'Jurisdiction & Class', content: 'Choose where to file and select the relevant Nice Classes for goods/services.' },
    { target: 'button:contains("Nice")', title: 'Class Picker', content: 'Advanced tool to search and select correct classifications for the trademark.' },
    { target: 'textarea', title: 'Description', content: 'Provide a detailed description of the mark and its intended use.' },
    { target: 'div:contains("Fee")', title: 'Live Fee Calculator', content: 'See the total official and professional fees update as you add classes.' },
    { target: 'button:contains("Download")', title: 'Generate PDF', content: 'When finished, click here to get the ready-to-print official PDF form.' }
  ],
  '/eipa-forms/renewal': [
    { target: 'body', placement: 'center', title: 'Renewal Processing', content: 'Streamline the renewal of active trademarks to prevent expiration.' },
    { target: 'h1', title: 'Renewal Form', content: 'A simplified form focused on extending the protection of existing marks.' },
    { target: 'input[placeholder*="Registration"]', title: 'Mark Lookup', content: 'Enter the registration number to pull existing mark data into the form.' },
    { target: 'select', title: 'Jurisdiction', content: 'Set the country where the renewal is being filed (ET, KE, etc.).' },
    { target: 'div:contains("Expiry")', title: 'Expiry Check', content: 'The system validates if the mark is within the eligible renewal window.' },
    { target: 'div:contains("Fee")', title: 'Renewal Fees', content: 'Shows the specific renewal fees for the selected jurisdiction.' },
    { target: 'button:contains("Client")', title: 'Applicant Info', content: 'Verify or update the applicant details for the renewal record.' },
    { target: '.p-4', title: 'Draft Preview', content: 'Review the renewal data before generating the final filing document.' },
    { target: 'button:contains("PDF")', title: 'Final Document', content: 'Generate the official renewal application form for submission.' },
    { target: 'body', placement: 'center', title: 'Registry Update', content: 'Once filed, the system will automatically update the next renewal deadline.' }
  ],
  '/deadlines': [
    { target: 'body', placement: 'center', title: 'Deadline Tracking', content: 'Never miss a critical date with our automated, jurisdiction-aware calendar.' },
    { target: 'h1', title: 'Critical Dates', content: 'Overview of all upcoming oppositions, renewals, and response windows.' },
    { target: '.calendar-view', title: 'Interactive Calendar', content: 'View deadlines in a monthly or weekly layout for better planning.' },
    { target: '.status-legend', title: 'Visual Cues', content: 'Colors indicate priority: Red for urgent, Yellow for warning, Green for safe.' },
    { target: 'button:contains("Google")', title: 'Calendar Sync', content: 'Sync these deadlines directly with your personal Google or Outlook calendar.' },
    { target: 'select', title: 'Filter by Office', content: 'View deadlines for specific registries like EIPO or KIPI.' },
    { target: 'div:contains("Opposition")', title: 'Opposition Alerts', content: 'Specific tracking for the 60-day window to respond to third-party challenges.' },
    { target: 'div:contains("Response")', title: 'Office Actions', content: 'Track deadlines for responding to examiner queries or objections.' },
    { target: 'li:first-child', title: 'Upcoming Item', content: 'Click any deadline to jump directly to the associated trademark case.' },
    { target: 'body', placement: 'center', title: 'Peace of Mind', content: 'The system sends automatic email reminders 30, 15, and 7 days before any deadline.' }
  ],
  '/billing': [
    { target: 'body', placement: 'center', title: 'Billing & Ledger Overview', content: 'This walkthrough focuses only on the billing page, teaching you how to create invoices, filter records, and manage payments.' },
    { target: 'h1', title: 'Page Header', content: 'This is your billing workspace header. It confirms you are in Billing & Ledger mode.' },
    { target: 'button.bg-primary', title: 'Create Invoice', content: 'Use this button to open the invoice creation modal and generate new client invoices.' },
    { target: '.grid', title: 'Revenue Snapshot', content: 'These cards show total revenue, overdue balances, and month-to-date paid amounts.' },
    { target: '.grid > div:nth-child(1)', title: 'Total Revenue', content: 'This card tracks cumulative income from all invoices in the system.' },
    { target: '.grid > div:nth-child(2)', title: 'Outstanding Balances', content: 'This card highlights overdue invoices and helps you prioritize collections.' },
    { target: '.grid > div:nth-child(3)', title: 'MTD Payments', content: 'This card shows payments received this month and the number of clients contributing to revenue.' },
    { target: 'input[placeholder="Search..."]', title: 'Search Filter', content: 'Search by client name to quickly locate invoices and reduce lookup time.' },
    { target: 'table', title: 'Invoice Table', content: 'This table lists every invoice with client, trademark, amount, status, and actions.' },
    { target: 'tr:first-child', title: 'Invoice Row Actions', content: 'Click an invoice row to open its detail page, or use the action buttons to record payments or download a PDF.' }
  ]
}

export default function AppTour() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isRunning = searchParams.get('tour') === 'true'

  const steps = useMemo(() => routeSteps[location.pathname] || [], [location.pathname])
  const fallbackExportName = 'Joyride'
  const JoyrideComponent = ((JoyrideLib as any).default ?? (JoyrideLib as any)[fallbackExportName]) as React.ComponentType<any>

  if (!isRunning || steps.length === 0) return null

  const handleCallback = (data: CallBackProps) => {
    if (data.status === JoyrideLib.STATUS.FINISHED || data.status === JoyrideLib.STATUS.SKIPPED) {
      const next = new URLSearchParams(searchParams)
      next.delete('tour')
      setSearchParams(next)
    }
  }

  return (
    <JoyrideComponent
      run={isRunning}
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
          primaryColor: '#0f172a', // slate-950 to match buttons
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
        }
      }}
    />
  )
}
