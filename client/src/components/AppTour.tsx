import * as JoyrideLib from 'react-joyride'
import type { CallBackProps, Step } from 'react-joyride'
import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

const routeSteps: Record<string, Step[]> = {
  '/': [
    { target: '#ops-summary', content: 'This section gives your live operations summary.' },
    { target: '#queue-due7', content: 'Track near-term trademark deadlines from here.' }
  ],
  '/trademarks': [
    { target: '#new-application-btn', content: 'Start a new trademark application from this button.' },
    { target: '#search-filter', content: 'Use these filters to narrow your trademarks quickly.' },
    { target: '#trademarks-grid', content: 'This is your trademarks area for grid and table views.' }
  ],
  '/clients': [
    { target: '#new-client-btn', content: 'Create new client records here.' },
    { target: '#clients-table', content: 'Manage, sort, and bulk-operate on client records.' }
  ],
  '/eipa-forms/application-form': [
    { target: '#quick-client-select', content: 'Quick-load client data into form fields.' },
    { target: '#mark-specification-section', content: 'Capture mark image, type, and descriptions here.' },
    { target: '#nice-class-section', content: 'Select Nice classes and goods/services lines here.' },
    { target: '#preview-section', content: 'See live PDF output while editing fields.' }
  ],
  '/eipa-forms/renewal-form': [
    { target: '#quick-client-select', content: 'Quick-load client data into renewal form fields.' },
    { target: '#preview-section', content: 'See live renewal PDF output while editing fields.' }
  ],
  '/invoicing': [
    { target: '#billing-stats-grid', content: 'Monitor revenue, outstanding, and MTD paid values here.' },
    { target: '#billing-ledger', content: 'Review all invoice transactions in this ledger.' },
    { target: '#record-payment-btn', content: 'Use this button to record incoming payments quickly.' }
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
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#005B9C',
          textColor: '#1f2937',
          zIndex: 1200
        }
      }}
    />
  )
}
