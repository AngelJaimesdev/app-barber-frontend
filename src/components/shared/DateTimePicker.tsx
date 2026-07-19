import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { format, addDays, isSameDay, startOfDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: string
  onChange: (iso: string) => void
  onConfirm?: () => void
  durationMins?: number
  workingHours?: Record<string, { open: string; close: string }>
}

const TIME_SLOT_INTERVAL = 30

function generateSlots(open = '09:00', close = '19:00'): string[] {
  const slots: string[] = []
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  let cur = oh * 60 + om
  const end = ch * 60 + cm
  while (cur + TIME_SLOT_INTERVAL <= end) {
    const h = Math.floor(cur / 60).toString().padStart(2, '0')
    const m = (cur % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += TIME_SLOT_INTERVAL
  }
  return slots
}

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export function DateTimePicker({ value, onChange, onConfirm, durationMins = 30, workingHours }: DateTimePickerProps) {
  const today = startOfDay(new Date())
  const days  = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? startOfDay(new Date(value)) : null
  )
  const [selectedTime, setSelectedTime] = useState<string | null>(
    value ? format(new Date(value), 'HH:mm') : null
  )
  const [weekOffset, setWeekOffset] = useState(0)

  const visibleDays = days.slice(weekOffset * 7, weekOffset * 7 + 7)

  const getSlotsForDate = (date: Date) => {
    const key = DAY_KEYS[date.getDay()]
    const hours = workingHours?.[key]
    return generateSlots(hours?.open, hours?.close)
  }

  const slots = selectedDate ? getSlotsForDate(selectedDate) : []

  const isConfirmed = selectedDate && selectedTime

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [h, m] = selectedTime.split(':').map(Number)
      const dt = new Date(selectedDate)
      dt.setHours(h, m, 0, 0)
      onChange(dt.toISOString())
    }
  }, [selectedDate, selectedTime])

  const handleConfirm = () => {
    if (isConfirmed && onConfirm) onConfirm()
  }

  return (
    <div className="space-y-4">
      {/* ── Day selector ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-dark-300">Selecciona el día</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="p-1 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(Math.min(1, weekOffset + 1))}
              disabled={weekOffset === 1}
              className="p-1 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {visibleDays.map((day) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isToday    = isSameDay(day, today)
            const dayKey     = DAY_KEYS[day.getDay()]
            const closed     = workingHours && !workingHours[dayKey]

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={!!closed}
                onClick={() => { setSelectedDate(day); setSelectedTime(null) }}
                className={cn(
                  'flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-150',
                  isSelected
                    ? 'gold-gradient text-dark-950 shadow-lg shadow-gold-900/30'
                    : closed
                    ? 'opacity-30 cursor-not-allowed bg-dark-800/30'
                    : 'bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white'
                )}
              >
                <span className={cn('text-xs font-medium uppercase', isSelected ? 'text-dark-900' : 'text-dark-400')}>
                  {format(day, 'EEE', { locale: es }).slice(0, 3)}
                </span>
                <span className={cn('text-lg font-bold leading-tight', isSelected ? 'text-dark-950' : '')}>
                  {format(day, 'd')}
                </span>
                {isToday && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-gold-500 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Time slots ── */}
      {selectedDate && (
        <div>
          <p className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-1.5">
            <Clock size={14} className="text-gold-500" />
            Horarios disponibles — {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </p>

          {slots.length === 0 ? (
            <p className="text-dark-500 text-sm text-center py-4">No hay horarios este día</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  className={cn(
                    'py-2 rounded-lg text-sm font-medium transition-all duration-150 border',
                    selectedTime === slot
                      ? 'gold-gradient text-dark-950 border-transparent shadow shadow-gold-900/30'
                      : 'bg-dark-800 border-dark-600 text-dark-300 hover:border-gold-600 hover:text-white'
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirm button ── */}
      {isConfirmed && (
        <div className="flex items-center justify-between bg-dark-800/60 border border-dark-600 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-dark-400">Seleccionado</p>
            <p className="text-white font-semibold text-sm">
              {format(selectedDate!, "EEEE d 'de' MMMM", { locale: es })} · {selectedTime}
            </p>
            {durationMins && (
              <p className="text-dark-500 text-xs">Duración aprox. {durationMins} min</p>
            )}
          </div>
          {onConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient text-dark-950 text-sm font-semibold shadow shadow-gold-900/20"
            >
              <CheckCircle2 size={14} /> OK
            </button>
          )}
        </div>
      )}
    </div>
  )
}
