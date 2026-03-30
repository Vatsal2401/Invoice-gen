import React from 'react'
import DatePicker from './DatePicker'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Preset { label: string; from: string; to: string }

function getPresets(): Preset[] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  // This month
  const thisMonthFrom = toISO(new Date(y, m, 1))
  const thisMonthTo = toISO(new Date(y, m + 1, 0))

  // Last month
  const lastMonthFrom = toISO(new Date(y, m - 1, 1))
  const lastMonthTo = toISO(new Date(y, m, 0))

  // This quarter
  const qStart = Math.floor(m / 3) * 3
  const thisQFrom = toISO(new Date(y, qStart, 1))
  const thisQTo = toISO(new Date(y, qStart + 3, 0))

  // This FY (Apr–Mar)
  const fyStart = m >= 3 ? y : y - 1
  const thisFYFrom = toISO(new Date(fyStart, 3, 1))
  const thisFYTo = toISO(new Date(fyStart + 1, 2, 31))

  // This year (calendar)
  const thisYearFrom = toISO(new Date(y, 0, 1))
  const thisYearTo = toISO(new Date(y, 11, 31))

  return [
    { label: 'This Month',    from: thisMonthFrom,  to: thisMonthTo },
    { label: 'Last Month',    from: lastMonthFrom,  to: lastMonthTo },
    { label: 'This Quarter',  from: thisQFrom,      to: thisQTo },
    { label: 'This FY',       from: thisFYFrom,     to: thisFYTo },
    { label: 'This Year',     from: thisYearFrom,   to: thisYearTo },
  ]
}

interface Props {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

export default function DateRangePicker({ from, to, onFromChange, onToChange }: Props): React.ReactElement {
  const presets = getPresets()

  const applyPreset = (p: Preset) => {
    onFromChange(p.from)
    onToChange(p.to)
  }

  const activePreset = presets.find(p => p.from === from && p.to === to)?.label

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date pickers */}
      <div className="flex items-center gap-2">
        <DatePicker value={from} onChange={onFromChange} maxDate={to || undefined} />
        <span className="text-text-secondary text-xs font-medium">to</span>
        <DatePicker value={to} onChange={onToChange} minDate={from || undefined} />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border mx-1" />

      {/* Presets */}
      <div className="flex items-center gap-1 flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              activePreset === p.label
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
