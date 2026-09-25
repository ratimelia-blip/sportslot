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

type OpeningDay = {
  weekday: number
  enabled: boolean
  start_time: string
  end_time: string
}

type BlockedPeriod = {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

const defaultOpeningHours: OpeningDay[] =
  dayNames.map((_, weekday) => ({
    weekday,
    enabled: weekday !== 0,
    start_time: '09:00',
    end_time: '19:00',
  }))

export default function SettingsPanel({
  club,
  onClubUpdated,
}: {
  club: Club
  onClubUpdated: (club: Club) => void
}) {
  const sb = supabaseBrowser()

  const [section, setSection] =
    useState('club')

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [clubForm, setClubForm] =
    useState({
      name: club.name || '',
      short_name:
        club.short_name || '',
      city: club.city || '',
      address:
        club.address || '',
      phone:
        club.phone || '',
      contact_email:
        club.contact_email || '',
      website:
        club.website || '',
    })

  const [bookingForm, setBookingForm] =
    useState({
      booking_interval_minutes:
        club.booking_interval_minutes ||
        15,

      advance_booking_days:
        club.advance_booking_days ??
        30,

      same_day_booking:
        club.same_day_booking ??
        true,

      cancellation_hours:
        club.cancellation_hours ??
        24,

      allow_customer_cancellation:
        club.allow_customer_cancellation ??
        true,

      auto_confirm_bookings:
        club.auto_confirm_bookings ??
        false,

      buffer_minutes:
        club.buffer_minutes ??
        0,

      timezone:
        club.timezone ||
        'Asia/Tbilisi',

      currency:
        club.currency ||
        'GEL',
    })

  const [openingHours, setOpeningHours] =
    useState<OpeningDay[]>(
      defaultOpeningHours
    )

  const [blockedPeriods, setBlockedPeriods] =
    useState<BlockedPeriod[]>([])

  const [newBlocked, setNewBlocked] =
    useState({
      starts_at: '',
      ends_at: '',
      reason: '',
    })

  async function loadSettings() {
    const [
      hoursResult,
      blockedResult,
    ] = await Promise.all([
      sb
        .from('availability_rules')
        .select(
          'weekday,start_time,end_time'
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

    if (hoursResult.data?.length) {
      setOpeningHours(
        defaultOpeningHours.map(
          (day) => {
            const rule =
              hoursResult.data.find(
                (r) =>
                  Number(r.weekday) ===
                  day.weekday
              )

            if (!rule) {
              return day
            }

            return {
              ...day,
              enabled: true,
              start_time:
                String(
                  rule.start_time
                ).slice(0, 5),
              end_time:
                String(
                  rule.end_time
                ).slice(0, 5),
            }
          }
        )
      )
    } else {
      setOpeningHours(
        defaultOpeningHours
      )
    }

    setBlockedPeriods(
      (blockedResult.data ||
        []) as BlockedPeriod[]
    )
  }

  useEffect(() => {
    loadSettings()
  }, [club.id])

  const saveClub = async () => {
    if (!clubForm.name.trim()) {
      setMessage(
        'Club name is required.'
      )
      return
    }

    setSaving(true)
    setMessage('')

    const { data, error } =
      await sb
        .from('clubs')
        .update({
          name:
            clubForm.name.trim(),

          short_name:
            clubForm.short_name.trim(),

          city:
            clubForm.city.trim(),

          address:
            clubForm.address.trim(),

          phone:
            clubForm.phone.trim(),

          contact_email:
            clubForm.contact_email.trim(),

          website:
            clubForm.website.trim(),
        })
        .eq('id', club.id)
        .select('*')
        .single()

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    onClubUpdated(
      data as Club
    )

    setMessage(
      'Club information saved.'
    )
  }

  const saveBookingSettings =
    async () => {
      setSaving(true)
      setMessage('')

      const { data, error } =
        await sb
          .from('clubs')
          .update({
            booking_interval_minutes:
              bookingForm.booking_interval_minutes,

            advance_booking_days:
              bookingForm.advance_booking_days,

            same_day_booking:
              bookingForm.same_day_booking,

            cancellation_hours:
              bookingForm.cancellation_hours,

            allow_customer_cancellation:
              bookingForm.allow_customer_cancellation,

            auto_confirm_bookings:
              bookingForm.auto_confirm_bookings,

            buffer_minutes:
              bookingForm.buffer_minutes,

            timezone:
              bookingForm.timezone,

            currency:
              bookingForm.currency,
          })
          .eq('id', club.id)
          .select('*')
          .single()

      setSaving(false)

      if (error) {
        setMessage(error.message)
        return
      }

      onClubUpdated(
        data as Club
      )

      setMessage(
        'Booking settings saved.'
      )
    }

  const saveOpeningHours =
    async () => {
      setSaving(true)
      setMessage('')

      const {
        error: deleteError,
      } = await sb
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

      const rows =
        openingHours
          .filter(
            (day) => day.enabled
          )
          .map((day) => ({
            club_id: club.id,
            weekday: day.weekday,
            start_time:
              day.start_time +
              ':00',
            end_time:
              day.end_time +
              ':00',
            active: true,
          }))

      if (rows.length) {
        const { error } =
          await sb
            .from(
              'availability_rules'
            )
            .insert(rows)

        if (error) {
          setSaving(false)
          setMessage(
            error.message
          )
          return
        }
      }

      setSaving(false)

      setMessage(
        'Opening hours saved.'
      )

      await loadSettings()
    }

  const addBlockedPeriod =
    async () => {
      if (
        !newBlocked.starts_at ||
        !newBlocked.ends_at
      ) {
        setMessage(
          'Please enter both start and end times.'
        )
        return
      }

      const start =
        new Date(
          newBlocked.starts_at
        )

      const end =
        new Date(
          newBlocked.ends_at
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
              newBlocked.reason.trim() ||
              null,
          })

      setSaving(false)

      if (error) {
        setMessage(error.message)
        return
      }

      setNewBlocked({
        starts_at: '',
        ends_at: '',
        reason: '',
      })

      setMessage(
        'Blocked period added.'
      )

      await loadSettings()
    }

  const deleteBlockedPeriod =
    async (id: string) => {
      const confirmed =
        window.confirm(
          'Remove this blocked period?'
        )

      if (!confirmed) {
        return
      }

      const { error } =
        await sb
          .from(
            'blocked_periods'
          )
          .delete()
          .eq('id', id)

      if (error) {
        setMessage(error.message)
        return
      }

      await loadSettings()
    }

  const sections = [
    {
      id: 'club',
      title:
        'Club Information',
      description:
        'Name, location and contact details',
      icon: '🏢',
    },

    {
      id: 'booking',
      title:
        'Booking Settings',
      description:
        'Booking rules and confirmations',
      icon: '📅',
    },

    {
      id: 'hours',
      title:
        'Opening Hours',
      description:
        'When customers can book',
      icon: '🕐',
    },

    {
      id: 'blocked',
      title:
        'Blocked Periods',
      description:
        'Holidays and closures',
      icon: '🚫',
    },
  ]

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
            'minmax(220px,280px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* SETTINGS MENU */}

        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >
          {sections.map(
            (item) => (
              <button
                key={item.id}
                className="btn"
                onClick={() =>
                  setSection(
                    item.id
                  )
                }
                style={{
                  textAlign: 'left',
                  padding: 16,
                  borderColor:
                    section ===
                    item.id
                      ? '#2dd4bf'
                      : undefined,
                  background:
                    section ===
                    item.id
                      ? '#102c3d'
                      : undefined,
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    marginBottom: 5,
                  }}
                >
                  {item.icon}{' '}
                  {item.title}
                </div>

                <div
                  className="muted"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {
                    item.description
                  }
                </div>
              </button>
            )
          )}

          <a
            className="btn"
            href={
              '/clubs/' +
              club.slug
            }
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 8,
              textAlign:
                'center',
            }}
          >
            🌐 Open public page
          </a>
        </div>

        {/* CONTENT */}

        <div className="card">

          {/* CLUB INFORMATION */}

          {section ===
            'club' && (
            <>
              <h2>
                Club Information
              </h2>

              <p className="muted">
                This information
                will be shown to
                your customers.
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
                  value={
                    clubForm.name
                  }
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        name: value,
                      })
                    )
                  }
                />

                <Field
                  label="Short name"
                  value={
                    clubForm.short_name
                  }
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        short_name:
                          value,
                      })
                    )
                  }
                />

                <Field
                  label="City"
                  value={
                    clubForm.city
                  }
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        city: value,
                      })
                    )
                  }
                />

                <Field
                  label="Address"
                  value={
                    clubForm.address
                  }
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        address:
                          value,
                      })
                    )
                  }
                />

                <Field
                  label="Phone"
                  value={
                    clubForm.phone
                  }
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        phone: value,
                      })
                    )
                  }
                />

                <Field
                  label="Contact email"
                  value={
                    clubForm.contact_email
                  }
                  type="email"
                  onChange={(value) =>
                    setClubForm(
                      (c) => ({
                        ...c,
                        contact_email:
                          value,
                      })
                    )
                  }
                />

                <div
                  style={{
                    gridColumn:
                      '1 / -1',
                  }}
                >
                  <Field
                    label="Website"
                    value={
                      clubForm.website
                    }
                    placeholder="https://..."
                    onChange={(value) =>
                      setClubForm(
                        (c) => ({
                          ...c,
                          website:
                            value,
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div
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
              </div>

              <button
                className="btn primary"
                onClick={
                  saveClub
                }
                disabled={saving}
                style={{
                  marginTop: 20,
                }}
              >
                {saving
                  ? 'Saving...'
                  : 'Save club information'}
              </button>
            </>
          )}

          {/* BOOKING SETTINGS */}

          {section ===
            'booking' && (
            <>
              <h2>
                Booking Settings
              </h2>

              <p className="muted">
                Control how
                customers can
                book your club.
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
                    value={
                      bookingForm.booking_interval_minutes
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          booking_interval_minutes:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
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
                    Advance booking limit
                  </span>

                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={
                      bookingForm.advance_booking_days
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          advance_booking_days:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      )
                    }
                  />

                  <small className="muted">
                    days ahead
                  </small>
                </label>

                <label>
                  <span>
                    Cancellation deadline
                  </span>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={
                      bookingForm.cancellation_hours
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          cancellation_hours:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
                      )
                    }
                  />

                  <small className="muted">
                    hours before
                    booking
                  </small>
                </label>

                <label>
                  <span>
                    Buffer between bookings
                  </span>

                  <select
                    className="input"
                    value={
                      bookingForm.buffer_minutes
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          buffer_minutes:
                            Number(
                              e
                                .target
                                .value
                            ),
                        })
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
                    value={
                      bookingForm.timezone
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          timezone:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="Asia/Tbilisi">
                      Georgia —
                      Tbilisi
                    </option>

                    <option value="Europe/London">
                      United Kingdom
                      — London
                    </option>

                    <option value="Europe/Berlin">
                      Germany —
                      Berlin
                    </option>

                    <option value="Europe/Paris">
                      France —
                      Paris
                    </option>

                    <option value="America/New_York">
                      USA — New York
                    </option>

                    <option value="America/Los_Angeles">
                      USA — Los Angeles
                    </option>
                  </select>
                </label>

                <label>
                  <span>
                    Currency
                  </span>

                  <select
                    className="input"
                    value={
                      bookingForm.currency
                    }
                    onChange={(e) =>
                      setBookingForm(
                        (c) => ({
                          ...c,
                          currency:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    <option value="GEL">
                      GEL — Georgian
                      Lari
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
                  checked={
                    bookingForm.same_day_booking
                  }
                  onChange={(value) =>
                    setBookingForm(
                      (c) => ({
                        ...c,
                        same_day_booking:
                          value,
                      })
                    )
                  }
                />

                <Toggle
                  label="Allow customers to cancel bookings"
                  checked={
                    bookingForm.allow_customer_cancellation
                  }
                  onChange={(value) =>
                    setBookingForm(
                      (c) => ({
                        ...c,
                        allow_customer_cancellation:
                          value,
                      })
                    )
                  }
                />

                <Toggle
                  label="Automatically confirm new bookings"
                  checked={
                    bookingForm.auto_confirm_bookings
                  }
                  onChange={(value) =>
                    setBookingForm(
                      (c) => ({
                        ...c,
                        auto_confirm_bookings:
                          value,
                      })
                    )
                  }
                />
              </div>

              <button
                className="btn primary"
                onClick={
                  saveBookingSettings
                }
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

          {/* OPENING HOURS */}

          {section ===
            'hours' && (
            <>
              <h2>
                Opening Hours
              </h2>

              <p className="muted">
                Customers will
                only be able to
                book during these
                hours.
              </p>

              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                {openingHours.map(
                  (day) => (
                    <div
                      key={
                        day.weekday
                      }
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          '120px 50px 1fr 1fr',
                        gap: 10,
                        alignItems:
                          'center',
                      }}
                    >
                      <strong>
                        {
                          dayNames[
                            day.weekday
                          ]
                        }
                      </strong>

                      <input
                        type="checkbox"
                        checked={
                          day.enabled
                        }
                        onChange={(
                          e
                        ) =>
                          setOpeningHours(
                            (
                              current
                            ) =>
                              current.map(
                                (
                                  d
                                ) =>
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
                        value={
                          day.start_time
                        }
                        onChange={(
                          e
                        ) =>
                          setOpeningHours(
                            (
                              current
                            ) =>
                              current.map(
                                (
                                  d
                                ) =>
                                  d.weekday ===
                                  day.weekday
                                    ? {
                                        ...d,
                                        start_time:
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
                        value={
                          day.end_time
                        }
                        onChange={(
                          e
                        ) =>
                          setOpeningHours(
                            (
                              current
                            ) =>
                              current.map(
                                (
                                  d
                                ) =>
                                  d.weekday ===
                                  day.weekday
                                    ? {
                                        ...d,
                                        end_time:
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
                  )
                )}
              </div>

              <button
                className="btn primary"
                onClick={
                  saveOpeningHours
                }
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

          {/* BLOCKED PERIODS */}

          {section ===
            'blocked' && (
            <>
              <h2>
                Blocked Periods
              </h2>

              <p className="muted">
                Temporarily close
                your club for
                tournaments,
                maintenance,
                holidays or
                other events.
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
                    value={
                      newBlocked.starts_at
                    }
                    onChange={(e) =>
                      setNewBlocked(
                        (c) => ({
                          ...c,
                          starts_at:
                            e
                              .target
                              .value,
                        })
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
                    value={
                      newBlocked.ends_at
                    }
                    onChange={(e) =>
                      setNewBlocked(
                        (c) => ({
                          ...c,
                          ends_at:
                            e
                              .target
                              .value,
                        })
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
                    value={
                      newBlocked.reason
                    }
                    onChange={(e) =>
                      setNewBlocked(
                        (c) => ({
                          ...c,
                          reason:
                            e
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <button
                className="btn primary"
                onClick={
                  addBlockedPeriod
                }
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
                  marginTop: 28,
                }}
              >
                {blockedPeriods.length ===
                0 ? (
                  <div className="muted">
                    No blocked
                    periods.
                  </div>
                ) : (
                  blockedPeriods.map(
                    (period) => (
                      <div
                        key={
                          period.id
                        }
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
                            gap: 16,
                            alignItems:
                              'center',
                          }}
                        >
                          <div>
                            <strong>
                              {period.reason ||
                                'Blocked period'}
                            </strong>

                            <div className="muted">
                              {formatDate(
                                period.starts_at
                              )}{' '}
                              →
                              {' '}
                              {formatDate(
                                period.ends_at
                              )}
                            </div>
                          </div>

                          <button
                            className="btn"
                            onClick={() =>
                              deleteBlockedPeriod(
                                period.id
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
        placeholder={
          placeholder
        }
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
