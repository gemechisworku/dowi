import { IconButton } from '@/components/ui/IconButton'

export interface PeriodStepperProps {
  label: string
  onPrevious: () => void
  onNext: () => void
  nextDisabled?: boolean
}

/** The ‹ label › row for stepping between report periods (PRD §5.4). */
export function PeriodStepper({
  label,
  onPrevious,
  onNext,
  nextDisabled = false,
}: PeriodStepperProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <IconButton aria-label="Previous period" icon="‹" variant="ghost" onClick={onPrevious} />
      <span className="text-[15px] font-bold" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <IconButton
        aria-label="Next period"
        icon="›"
        variant="ghost"
        onClick={onNext}
        disabled={nextDisabled}
        style={nextDisabled ? { opacity: 0.35 } : undefined}
      />
    </div>
  )
}
