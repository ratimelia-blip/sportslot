'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '../../../lib/supabase'

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
}

const OPEN_HOUR = 9
const CLOSE_HOUR = 19
const SLOT_INTERVAL = 15

function localDate() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10)
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function durationLabel(minutes: number) {
  if (minutes === 15) return '15 min'
  if (minutes === 30) return '30 min'
  if (minutes === 60) return '1 hour'
  if (minutes === 300) return '5 hours'
  return `${minutes} min`
}

export default function PLC() {
  const sb = supabaseBrowser()

  const [services, setServices] = useState<Service[]>([])
  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState(localDate())
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: club } = await sb
        .from('clubs')
        .select('id')
        .eq('slug', 'poti-lake-club')
        .single()

      if (!club) {
        setError('Club not found.')
        setLoading(false)
        return
      }

      const { data, error } = await sb
        .from('services')
        .select(
          'id,name,description,duration_minutes,price'
        )
        .eq('club_id', club.id)
        .eq('active', true)
        .order('name')

      if (error) {
        setError(error.message)
      } else {
        setServices(data || [])
      }

      setLoading(false)
    }

    load()
  }, [])

  const slots = useMemo(() => {
    if (!service) return []

    const opening = OPEN_HOUR * 60
    const closing = CLOSE_HOUR * 60
    const duration = service.duration_minutes

    const result: string[] = []

    for (
      let start = opening;
      start + duration <= closing;
      start += SLOT_INTERVAL
    ) {
      result.push(formatTime(start))
    }

    return result
  }, [service])

  const submit = async () => {
    setError('')

    if (!service || !time || !name.trim()) {
      setError(
        'Please select a service, time and enter your name.'
      )
      return
    }

    const starts = `${date}T${time}:00+04:00`

    const { data, error } = await sb.rpc('create_booking', {
      p_service_id: service.id,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_customer_email: email.trim(),
      p_starts_at: starts,
    })

    if (error) {
      if (error.message.includes('SLOT_UNAVAILABLE')) {
        setError(
          'That time is already booked. Please choose another slot.'
        )
      } else {
        setError(error.message)
      }
      return
    }

    setDone(data?.id || 'confirmed')
  }

  if (loading) {
    return <main className="center">Loading SportSlot…</main>
  }

  return (
    <main>
      <nav className="nav container">
        <div className="brand">
          Sport<span>Slot</span>
        </div>

        <div className="muted">Poti Lake Club</div>
      </nav>

      <section className="booking">
        <div className="eyebrow">Poti · Georgia</div>

        <h1 style={{ fontSize: 42, marginBottom: 5 }}>
          Poti Lake Club
        </h1>

        <p className="muted">
          Choose your activity, date and time.
        </p>

        {done ? (
          <div className="success">
            <h2>Booking confirmed ✓</h2>

            <p className="muted">
              Your reservation has been created successfully.
            </p>

            <strong>Booking ID: {done}</strong>
          </div>
        ) : (
          <>
            <h3>1. Choose a service</h3>

            <div className="service-grid">
              {services.map((s) => (
                <div
                  key={s.id}
                  className={`service ${
                    service?.id === s.id ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setService(s)
                    setTime('')
                  }}
                >
                  <strong>{s.name}</strong>

                  <div className="muted">
                    {durationLabel(s.duration_minutes)} ·{' '}
                    {s.price} GEL
                  </div>
                </div>
              ))}
            </div>

            <h3>2. Choose date</h3>

            <input
              className="input"
              type="date"
              value={date}
              min={localDate()}
              onChange={(e) => {
                setDate(e.target.value)
                setTime('')
              }}
            />

            <h3>3. Choose time</h3>

            {!service ? (
              <p className="muted">
                Select a service first.
              </p>
            ) : (
              <div className="times">
                {slots.map((t) => (
                  <button
                    className="time"
                    key={t}
                    onClick={() => setTime(t)}
                    style={
                      time === t
                        ? {
                            borderColor: 'var(--accent)',
                            background: '#0d2d35',
                          }
                        : {}
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <h3>4. Your details</h3>

            <div className="form">
              <input
                className="input"
                placeholder="Full name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="input"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <button
                className="btn primary"
                onClick={submit}
              >
                Confirm booking
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
