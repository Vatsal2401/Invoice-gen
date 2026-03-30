import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDate(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function fmtDisplay(iso: string): string {
  const d = parseDate(iso)
  if (!d) return 'Select date'
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface Props {
  value: string          // YYYY-MM-DD
  onChange: (v: string) => void
  label?: string
  minDate?: string
  maxDate?: string
}

export default function DatePicker({ value, onChange, label, minDate, maxDate }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const selected = parseDate(value)
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value)
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()) }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day: number) => {
    const iso = toISO(new Date(viewYear, viewMonth, day))
    onChange(iso)
    setOpen(false)
  }

  const isDisabled = (day: number): boolean => {
    const d = toISO(new Date(viewYear, viewMonth, day))
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  const isSelected = (day: number): boolean => {
    if (!selected) return false
    return selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
  }

  const isToday = (day: number): boolean => {
    return today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div ref={ref} className="relative">
      {label && <div className="text-xs font-medium text-text-secondary mb-1">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-colors bg-white
          ${open ? 'border-primary ring-2 ring-primary/20 text-primary' : 'border-border text-text-primary hover:border-primary/60'}`}
      >
        <Calendar size={14} className={open ? 'text-primary' : 'text-text-secondary'} />
        <span className="tabular-nums">{fmtDisplay(value)}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-border w-64"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-[13px] font-semibold text-text-primary bg-transparent cursor-pointer focus:outline-none"
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-[13px] font-semibold text-text-primary bg-transparent cursor-pointer focus:outline-none"
              >
                {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-bg-muted transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-text-secondary py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />
              const disabled = isDisabled(day)
              const sel = isSelected(day)
              const tod = isToday(day)
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`h-8 w-full rounded-lg text-[12px] font-medium transition-colors
                    ${disabled ? 'text-text-secondary/30 cursor-not-allowed' :
                      sel ? 'bg-primary text-white' :
                      tod ? 'bg-primary/10 text-primary font-semibold' :
                      'hover:bg-bg-muted text-text-primary'
                    }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Quick: Today */}
          <div className="border-t border-border px-3 py-2 flex gap-2">
            <button
              type="button"
              onClick={() => { onChange(toISO(today)); setOpen(false) }}
              className="flex-1 text-[11px] font-medium text-primary hover:bg-primary/5 rounded-md py-1 transition-colors"
            >
              Today
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false) }}
                className="flex-1 text-[11px] font-medium text-text-secondary hover:bg-bg-muted rounded-md py-1 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
