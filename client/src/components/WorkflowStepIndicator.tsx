import type { TrademarkState } from '@/shared/database'

type Props = {
  state: TrademarkState
}

const STEPS: { key: TrademarkState; label: string }[] = [
  { key: 'INTAKE', label: 'Intake' },
  { key: 'FORMAL_EXAM', label: 'Formal Exam' },
  { key: 'SUBSTANTIVE_EXAM', label: 'Substantive' },
  { key: 'PUBLICATION', label: 'Publication' },
  { key: 'REGISTRATION', label: 'Registration' },
  { key: 'RENEWAL', label: 'Renewal' }
]

function indexOf(state: TrademarkState) {
  return STEPS.findIndex((s) => s.key === state)
}

export default function WorkflowStepIndicator({ state }: Props) {
  const currentIndex = indexOf(state)

  return (
    <div className="rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)]/50 p-3">
      <div className="flex items-center justify-center flex-wrap gap-2">
        {STEPS.map((s, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex

          return (
            <div key={s.key} className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'grid size-6 shrink-0 place-items-center rounded-none border text-[11px] transition-colors duration-150',
                    isCurrent
                      ? 'border-[color:var(--eai-primary)] bg-[color:var(--eai-primary)]/15 text-[color:var(--eai-primary)]'
                      : isDone
                        ? 'bg-[color:var(--eai-success)] text-white border-[color:var(--eai-success)]'
                        : 'border-[var(--eai-border)] bg-[var(--eai-surface)]/60 text-[var(--eai-muted)]'
                  ].join(' ')}
                >
                  {idx + 1}
                </div>

                <div className="truncate text-[12px] font-medium text-[var(--eai-muted)]">
                  {s.label}
                </div>
              </div>

              <div className="mt-2 hidden h-px w-full bg-[var(--eai-border)] sm:block" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
