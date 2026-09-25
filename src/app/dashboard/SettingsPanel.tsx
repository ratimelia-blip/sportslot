'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabase'

type Club = {
  id: string
  name: string
  short_name: string | null
  city: string | null
  slug: string
  sport_type: string | null
  address?: string | null
  phone?: string | null
  contact_email?: string | null
  website?: string | null
  timezone?: string | null
  currency?: string | null
  booking_interval_minutes?: number | null
  advance_booking_days?: number | null
  same_day_booking?: boolean | null
  cancellation_hours?: number | null
  allow_customer_cancellation?: boolean | null
  auto_confirm_bookings?: boolean | null
  buffer_minutes?: number | null
}

type Day = {
  weekday: number
  enabled: boolean
  start: string
  end: string
}

type Blocked = {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function defaultDays(): Day[] {
  return days.map((_, i) => ({
    weekday: i,
    enabled: i !== 0,
    start: '09:00',
    end: '19:00',
  }))
}

export default function ClubSettings({
  club,
  onClubUpdated,
}: {
  club: Club
  onClubUpdated: (club: Club) => void
}) {
  const sb = supabaseBrowser()

  const [tab, setTab] = useState('club')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [name, setName] = useState(club.name || '')
  const [shortName, setShortName] = useState(
    club.short_name || ''
  )
  const [city, setCity] = useState(club.city || '')
  const [address, setAddress] = useState(
    club.address || ''
  )
  const [phone, setPhone] = useState(
    club.phone || ''
  )
  const [email, setEmail] = useState(
    club.contact_email || ''
  )
  const [website, setWebsite] = useState(
    club.website || ''
  )

  const [interval, setInterval] = useState(
    club.booking_interval_minutes ?? 15
  )
  const [advanceDays, setAdvanceDays] =
    useState(
      club.advance_booking_days ?? 30
    )
  const [sameDay, setSameDay] = useState(
    club.same_day_booking ?? true
  )
  const [cancelHours, setCancelHours] =
    useState(
      club.cancellation_hours ?? 24
    )
  const [allowCancel, setAllowCancel] =
    useState(
      club.allow_customer_cancellation ??
        true
    )
  const [autoConfirm, setAutoConfirm] =
    useState(
      club.auto_confirm_bookings ?? false
    )
  const [buffer, setBuffer] = useState(
    club.buffer_minutes ?? 0
  )
  const [timezone, setTimezone] =
    useState(
      club.timezone || 'Asia/Tbilisi'
    )
  const [currency, setCurrency] =
    useState(
      club.currency || 'GEL'
    )

  const [opening, setOpening] =
    useState<Day[]>(defaultDays())

  const [blocked, setBlocked] =
    useState<Blocked[]>([])

  const [blockStart, setBlockStart] =
    useState('')
  const [blockEnd, setBlockEnd] =
    useState('')
  const [blockReason, setBlockReason] =
    useState('')

  useEffect(() => {
    loadData()
  }, [club.id])

  async function loadData() {
    const [hours, blocks] =
      await Promise.all([
        sb
          .from('availability_rules')
          .select(
            'weekday,start_time,end_time,active'
          )
          .eq('club_id', club.id)
          .order('weekday'),

        sb
          .from('blocked_periods')
          .select(
            'id,starts_at,ends_at,reason'
          )
          .eq('club_id', club.id)
          .order('starts_at'),
      ])

    const base = defaultDays()

    if (hours.data) {
      for (const rule of hours.data) {
        const index = Number(
          rule.weekday
        )

        if (base[index]) {
          base[index] = {
            weekday: index,
            enabled:
              rule.active !== false,
            start: String(
              rule.start_time
            ).slice(0, 5),
            end: String(
              rule.end_time
            ).slice(0, 5),
          }
        }
      }
    }

    setOpening(base)
    setBlocked(
      (blocks.data || []) as Blocked[]
    )
  }

  async function saveClub() {
    setSaving(true)
    setMessage('')

    const { data, error } =
      await sb
        .from('clubs')
        .update({
          name: name.trim(),
          short_name:
            shortName.trim(),
          city: city.trim(),
          address:
            address.trim(),
          phone:
            phone.trim(),
          contact_email:
            email.trim(),
          website:
            website.trim(),
        })
        .eq('id', club.id)
        .select('*')
        .single()

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    onClubUpdated(data as Club)
    setMessage(
      'Club information saved.'
    )
  }

  async function saveBooking() {
    setSaving(true)
    setMessage('')

    const { data, error } =
      await sb
        .from('clubs')
        .update({
          booking_interval_minutes:
            interval,
          advance_booking_days:
            advanceDays,
          same_day_booking:
            sameDay,
          cancellation_hours:
            cancelHours,
          allow_customer_cancellation:
            allowCancel,
          auto_confirm_bookings:
            autoConfirm,
          buffer_minutes: buffer,
          timezone,
          currency,
        })
        .eq('id', club.id)
        .select('*')
        .single()

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    onClubUpdated(data as Club)
    setMessage(
      'Booking settings saved.'
    )
  }

  async function saveHours() {
    setSaving(true)
    setMessage('')

    const { error: deleteError } =
      await sb
        .from('availability_rules')
        .delete()
        .eq('club_id', club.id)

    if (deleteError) {
      setSaving(false)
      setMessage(
        deleteError.message
      )
      return
    }

    const rows = opening
      .filter((d) => d.enabled)
      .map((d) => ({
        club_id: club.id,
        weekday: d.weekday,
        start_time:
          d.start + ':00',
        end_time:
          d.end + ':00',
        active: true,
      }))

    if (rows.length > 0) {
      const { error } =
        await sb
          .from('availability_rules')
          .insert(rows)

      if (error) {
        setSaving(false)
        setMessage(error.message)
        return
      }
    }

    setSaving(false)
    setMessage(
      'Opening hours saved.'
    )

    await loadData()
  }

  async function addBlock() {
    if (!blockStart || !blockEnd) {
      setMessage(
        'Please enter start and end times.'
      )
      return
    }

    const start = new Date(
      blockStart
    )
    const end = new Date(
      blockEnd
    )

    if (end <= start) {
      setMessage(
        'End time must be after start time.'
      )
      return
    }

    setSaving(true)
    setMessage('')

    const { error } =
      await sb
        .from('blocked_periods')
        .insert({
          club_id: club.id,
          starts_at:
            start.toISOString(),
          ends_at:
            end.toISOString(),
          reason:
            blockReason.trim() ||
            null,
        })

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setBlockStart('')
    setBlockEnd('')
    setBlockReason('')

    setMessage(
      'Blocked period added.'
    )

    await loadData()
  }

  async function removeBlock(
    id: string
  ) {
    if (
      !window.confirm(
        'Remove this blocked period?'
      )
    ) {
      return
    }

    const { error } =
      await sb
        .from('blocked_periods')
        .delete()
        .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadData()
  }

  return (
    <div>
      {message && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: 14,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '260px 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >
          <button
            className="btn"
            onClick={() =>
              setTab('club')
            }
          >
            🏢 Club Information
          </button>

          <button
            className="btn"
            onClick={() =>
              setTab('booking')
            }
          >
            📅 Booking Settings
          </button>

          <button
            className="btn"
            onClick={() =>
              setTab('hours')
            }
          >
            🕐 Opening Hours
          </button>

          <button
            className="btn"
            onClick={() =>
              setTab('blocked')
            }
          >
            🚫 Blocked Periods
          </button>

          <a
            className="btn"
            href={`/clubs/${club.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            🌐 Public page
          </a>
        </div>

        <div className="card">

          {tab === 'club' && (
            <>
              <h2>
                Club Information
              </h2>

              <p className="muted">
                Basic information about
                your club.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <Field
                  label="Club name"
                  value={name}
                  onChange={setName}
                />

                <Field
                  label="Short name"
                  value={shortName}
                  onChange={setShortName}
                />

                <Field
                  label="City"
                  value={city}
                  onChange={setCity}
                />

                <Field
                  label="Address"
                  value={address}
                  onChange={setAddress}
                />

                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                />

                <Field
                  label="Contact email"
                  value={email}
                  type="email"
                  onChange={setEmail}
                />

                <div
                  style={{
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <Field
                    label="Website"
                    value={website}
                    placeholder="https://..."
                    onChange={setWebsite}
                  />
                </div>
              </div>

              <p
                className="muted"
                style={{
                  marginTop: 20,
                }}
              >
                Sport:{' '}
                {club.sport_type ||
                  '—'}
                <br />
                Public URL:{' '}
                /clubs/
                {club.slug}
              </p>

              <button
                className="btn primary"
                onClick={saveClub}
                disabled={saving}
                style={{
                  marginTop: 10,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Save changes'}
              </button>
            </>
          )}

          {tab === 'booking' && (
            <>
              <h2>
                Booking Settings
              </h2>

              <p className="muted">
                Control how customers
                can book your club.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <label>
                  <span>
                    Booking interval
                  </span>

                  <select
                    className="input"
                    value={interval}
                    onChange={(e) =>
                      setInterval(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >
                    <option value={15}>
                      15 minutes
                    </option>
                    <option value={30}>
                      30 minutes
                    </option>
                    <option value={60}>
                      1 hour
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Advance booking days
                  </span>

                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={advanceDays}
                    onChange={(e) =>
                      setAdvanceDays(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Cancellation hours
                  </span>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={cancelHours}
                    onChange={(e) =>
                      setCancelHours(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Buffer between bookings
                  </span>

                  <select
                    className="input"
                    value={buffer}
                    onChange={(e) =>
                      setBuffer(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >
                    <option value={0}>
                      No buffer
                    </option>
                    <option value={15}>
                      15 minutes
                    </option>
                    <option value={30}>
                      30 minutes
                    </option>
                    <option value={60}>
                      1 hour
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Time zone
                  </span>

                  <select
                    className="input"
                    value={timezone}
                    onChange={(e) =>
                      setTimezone(
                        e.target.value
                      )
                    }
                  >
                    <option value="Asia/Tbilisi">
                      Georgia — Tbilisi
                    </option>
                    <option value="Europe/London">
                      United Kingdom — London
                    </option>
                    <option value="Europe/Berlin">
                      Germany — Berlin
                    </option>
                    <option value="Europe/Paris">
                      France — Paris
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Currency
                  </span>

                  <select
                    className="input"
                    value={currency}
                    onChange={(e) =>
                      setCurrency(
                        e.target.value
                      )
                    }
                  >
                    <option value="GEL">
                      GEL — Georgian Lari
                    </option>
                    <option value="USD">
                      USD — US Dollar
                    </option>
                    <option value="EUR">
                      EUR — Euro
                    </option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 14,
                  marginTop: 24,
                }}
              >
                <Toggle
                  label="Allow same-day bookings"
                  checked={sameDay}
                  onChange={setSameDay}
                />

                <Toggle
                  label="Allow customers to cancel bookings"
                  checked={allowCancel}
                  onChange={
                    setAllowCancel
                  }
                />

                <Toggle
                  label="Automatically confirm new bookings"
                  checked={autoConfirm}
                  onChange={
                    setAutoConfirm
                  }
                />
              </div>

              <button
                className="btn primary"
                onClick={saveBooking}
                disabled={saving}
                style={{
                  marginTop: 24,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Save booking settings'}
              </button>
            </>
          )}

          {tab === 'hours' && (
            <>
              <h2>
                Opening Hours
              </h2>

              <p className="muted">
                Set the hours when
                customers can book.
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                {opening.map((day) => (
                  <div
                    key={day.weekday}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '120px 40px 1fr 1fr',
                      gap: 10,
                      alignItems:
                        'center',
                    }}
                  >
                    <strong>
                      {days[
                        day.weekday
                      ]}
                    </strong>

                    <input
                      type="checkbox"
                      checked={
                        day.enabled
                      }
                      onChange={(e) =>
                        setOpening(
                          (current) =>
                            current.map(
                              (d) =>
                                d.weekday ===
                                day.weekday
                                  ? {
                                      ...d,
                                      enabled:
                                        e
                                          .target
                                          .checked,
                                    }
                                  : d
                            )
                        )
                      }
                    />

                    <input
                      className="input"
                      type="time"
                      disabled={
                        !day.enabled
                      }
                      value={day.start}
                      onChange={(e) =>
                        setOpening(
                          (current) =>
                            current.map(
                              (d) =>
                                d.weekday ===
                                day.weekday
                                  ? {
                                      ...d,
                                      start:
                                        e
                                          .target
                                          .value,
                                    }
                                  : d
                            )
                        )
                      }
                    />

                    <input
                      className="input"
                      type="time"
                      disabled={
                        !day.enabled
                      }
                      value={day.end}
                      onChange={(e) =>
                        setOpening(
                          (current) =>
                            current.map(
                              (d) =>
                                d.weekday ===
                                day.weekday
                                  ? {
                                      ...d,
                                      end:
                                        e
                                          .target
                                          .value,
                                    }
                                  : d
                            )
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <button
                className="btn primary"
                onClick={saveHours}
                disabled={saving}
                style={{
                  marginTop: 24,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Save opening hours'}
              </button>
            </>
          )}

          {tab === 'blocked' && (
            <>
              <h2>
                Blocked Periods
              </h2>

              <p className="muted">
                Block times when your
                club is unavailable.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <label>
                  <span>
                    Starts
                  </span>

                  <input
                    className="input"
                    type="datetime-local"
                    value={blockStart}
                    onChange={(e) =>
                      setBlockStart(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>
                    Ends
                  </span>

                  <input
                    className="input"
                    type="datetime-local"
                    value={blockEnd}
                    onChange={(e) =>
                      setBlockEnd(
                        e.target.value
                      )
                    }
                  />
                </label>

                <label
                  style={{
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <span>
                    Reason
                  </span>

                  <input
                    className="input"
                    placeholder="Tournament, maintenance, holiday..."
                    value={blockReason}
                    onChange={(e) =>
                      setBlockReason(
                        e.target.value
                      )
                    }
                  />
                </label>
              </div>

              <button
                className="btn primary"
                onClick={addBlock}
                disabled={saving}
                style={{
                  marginTop: 16,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Add blocked period'}
              </button>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  marginTop: 24,
                }}
              >
                {blocked.length ===
                0 ? (
                  <p className="muted">
                    No blocked periods.
                  </p>
                ) : (
                  blocked.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="card"
                        style={{
                          padding: 16,
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'center',
                            gap: 16,
                          }}
                        >
                          <div>
                            <strong>
                              {item.reason ||
                                'Blocked period'}
                            </strong>

                            <div className="muted">
                              {formatDate(
                                item.starts_at
                              )}
                              {' → '}
                              {formatDate(
                                item.ends_at
                              )}
                            </div>
                          </div>

                          <button
                            className="btn"
                            onClick={() =>
                              removeBlock(
                                item.id
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label>
      <span>{label}</span>

      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (
    value: boolean
  ) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
      />

      <span>{label}</span>
    </label>
  )
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}
