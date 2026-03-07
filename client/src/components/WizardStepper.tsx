import { Check } from '@phosphor-icons/react'

type Step = {
  title: string
  subtitle: string
}

type Props = {
  steps: Step[]
  activeIndex: number
  collapsed?: boolean
}

export default function WizardStepper({ steps, activeIndex, collapsed = false }: Props) {
  return (
    <div className="apple-card p-4">
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((s, i) => {
          const isCurrent = i === activeIndex
          const isDone = i < activeIndex

          return (
            <div
              key={s.title}
              className={[
                'relative flex flex-col gap-2 rounded-none p-4 transition-all duration-300',
                isCurrent
                  ? 'bg-[var(--eai-primary)]/5 border border-[var(--eai-primary)]/20 shadow-sm'
                  : 'border border-transparent'
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div className={[
                  'flex h-8 w-8 items-center justify-center rounded-none text-[13px] font-bold transition-all duration-300',
                  isCurrent
                    ? 'bg-[var(--eai-primary)] text-white shadow-lg shadow-[var(--eai-primary)]/20'
                    : isDone
                      ? 'bg-[var(--eai-success)] text-white'
                      : 'bg-[var(--eai-bg)] text-[var(--eai-text-secondary)]'
                ].join(' ')}>
                  {isDone ? <Check size={16} weight="bold" /> : i + 1}
                </div>
                {isCurrent && (
                  <span className="flex h-2 w-2 rounded-none bg-[var(--eai-primary)] animate-pulse" />
                )}
              </div>

              <div className="space-y-0.5">
                <div className={[
                  'text-[15px] font-bold tracking-tight transition-colors',
                  isCurrent ? 'text-[var(--eai-text)]' : 'text-[var(--eai-text-secondary)]'
                ].join(' ')}>
                  {s.title}
                </div>
                {!collapsed && (
                  <div className="text-[12px] text-[var(--eai-text-secondary)]/80 leading-tight">
                    {s.subtitle}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
