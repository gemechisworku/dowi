import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ProgressBar } from '@/components/domain/ProgressBar'
import { TOUR_CATEGORIES, TOUR_STEPS } from './tourContent'
import { nextTourIndex } from './tourNav'

export interface GettingStartedTourProps {
  onClose: () => void
}

/**
 * A brief, stepped walkthrough of the app's 3 areas (2 steps each) — shown
 * from Home's "getting started" callout while there's no data yet. Follows
 * the same "always mounted, parent conditionally renders it" shape as every
 * other Sheet (`TaskSheet`, `TransactionSheet`, ...), which is what resets
 * `stepIndex` back to 0 each time it's freshly opened, with no extra effect
 * needed. Step navigation is plain component state, deliberately not
 * further history pushes — `Sheet` already owns exactly one push/pop per
 * open cycle (see its own comments), so the system back button/gesture just
 * closes the whole tour, the same as it would for any other Sheet.
 */
export function GettingStartedTour({ onClose }: GettingStartedTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = TOUR_STEPS[stepIndex]!
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEPS.length - 1

  return (
    <Sheet open onClose={onClose} title="Getting started">
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Category"
          options={TOUR_CATEGORIES.map((c) => ({ value: c.value, label: `${c.icon} ${c.label}` }))}
          value={step.category}
          onChange={(category) =>
            setStepIndex((i) => nextTourIndex(TOUR_STEPS, i, { jumpToCategory: category }))
          }
        />
        <ProgressBar
          value={(stepIndex + 1) / TOUR_STEPS.length}
          label={`Step ${stepIndex + 1} of ${TOUR_STEPS.length}`}
        />
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span aria-hidden="true" className="text-4xl">
            {step.icon}
          </span>
          <p className="text-[17px] font-bold">{step.heading}</p>
          <p className="max-w-xs text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {step.description}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Skip
          </Button>
          <div className="flex justify-end gap-2">
            {!isFirst && (
              <Button
                variant="secondary"
                onClick={() => setStepIndex((i) => nextTourIndex(TOUR_STEPS, i, 'back'))}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={onClose}>Done</Button>
            ) : (
              <Button onClick={() => setStepIndex((i) => nextTourIndex(TOUR_STEPS, i, 'next'))}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
