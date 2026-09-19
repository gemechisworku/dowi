import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { NumericInput } from '@/components/ui/NumericInput'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Radio } from '@/components/ui/Radio'
import { Chip } from '@/components/ui/Chip'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Divider } from '@/components/ui/Divider'

const CATEGORY_OPTIONS = ['Food', 'Transport', 'Housing', 'Health', 'Other']

export function FormsSection() {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [agree, setAgree] = useState(false)
  const [weekStart, setWeekStart] = useState('monday')
  const [size, setSize] = useState<'s' | 'm' | 'l'>('m')

  return (
    <Card>
      <SectionHeader title="Form controls" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Note" hint="Optional, up to 500 characters">
          {({ inputId, describedBy }) => (
            <Input id={inputId} aria-describedby={describedBy} placeholder="Lunch with the team" />
          )}
        </Field>

        <Field label="Amount" required>
          {({ inputId }) => (
            <NumericInput
              id={inputId}
              value={amount}
              onValueChange={setAmount}
              placeholder="0.00"
            />
          )}
        </Field>

        <Field label="Account" error={amount === 'x' ? 'Pick a valid account' : undefined}>
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="Choose an account"
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank' },
                { value: 'mobile', label: 'Mobile money' },
              ]}
            />
          )}
        </Field>

        <Field label="Date">
          {({ inputId }) => <DatePicker id={inputId} defaultValue="2026-09-19" />}
        </Field>

        <Field label="Reminder time">
          {({ inputId }) => <TimePicker id={inputId} defaultValue="08:00" />}
        </Field>

        <Field label="Description">
          {({ inputId }) => <TextArea id={inputId} placeholder="Longer notes go here…" />}
        </Field>
      </div>

      <Divider className="my-4" />

      <ChipGroup label="Category">
        {CATEGORY_OPTIONS.map((cat) => (
          <Chip key={cat} selected={category === cat} onClick={() => setCategory(cat)}>
            {cat}
          </Chip>
        ))}
      </ChipGroup>

      <Divider className="my-4" />

      <div className="flex flex-wrap items-center gap-6">
        <Switch
          name="notify"
          label="Reminders"
          checked={notifyEnabled}
          onChange={(e) => setNotifyEnabled(e.target.checked)}
        />
        <Checkbox
          name="agree"
          label="I reviewed this"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <Checkbox
          name="disabled-checked"
          label="Disabled, checked"
          checked
          disabled
          onChange={() => {}}
        />
      </div>

      <Divider className="my-4" />

      <fieldset className="flex flex-wrap items-center gap-6">
        <legend className="mb-2 text-sm font-semibold">Week starts on</legend>
        <Radio
          name="week-start"
          value="sunday"
          label="Sunday"
          checked={weekStart === 'sunday'}
          onChange={() => setWeekStart('sunday')}
        />
        <Radio
          name="week-start"
          value="monday"
          label="Monday"
          checked={weekStart === 'monday'}
          onChange={() => setWeekStart('monday')}
        />
      </fieldset>

      <Divider className="my-4" />

      <SegmentedControl
        label="Text size"
        value={size}
        onChange={setSize}
        options={[
          { value: 's', label: 'S' },
          { value: 'm', label: 'M' },
          { value: 'l', label: 'L' },
        ]}
      />
    </Card>
  )
}
