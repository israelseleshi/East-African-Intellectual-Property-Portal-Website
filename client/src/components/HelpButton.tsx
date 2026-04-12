import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  ]
}

interface HelpButtonProps {
  pageId: string
}

export default function HelpButton({ pageId }: HelpButtonProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [runTour, setRunTour] = useState(false)
  
  const steps = pageTourConfigs[pageId] || []
  const isRunning = searchParams.get('tour') === 'true'

  const handleStartTour = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tour', 'true')
    setSearchParams(newParams)
    setRunTour(true)
  }, [searchParams, setSearchParams])

  const handleCallback = useCallback((data: { status: string }) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('tour')
      setSearchParams(newParams)
      setRunTour(false)
    }
  }, [searchParams, setSearchParams])

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
        run={isRunning || runTour}
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
          }
        }}
      />
    </>
  )
}