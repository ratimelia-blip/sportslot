'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabase'
import Link from 'next/link'

type Booking = {
  id: string
  customer_name: string
  starts_at: string
  ends_at: string
  price: number
  status: string
  services?: { name: string } | null
}

type Service = {
  id: string
  name: string
  description: string | null
  active: boolean
}

type ServiceOption = {
  id: string
  service_id: string
  duration_minutes: number
  price: number
  active: boolean
}

const durations = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 300, label: '5 hours' },
]

function durationLabel(minutes: number) {
  return (
    durations.find((d) => d.value === minutes)?.label ||
    `${minutes} minutes`
  )
}

export default function Dashboard() {
  const sb = supabaseBrowser()

  const [email, setEmail] = useState('')
  const [club, setClub] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [options, setOptions] = useState<ServiceOption[]>([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')

  const [editingService, setEditingService] =
    useState<string | null>(null)

  async function load() {
    const { data } = await sb.auth.getUser()

    if (!data.user) {
      location.href = '/login'
      return
    }

    setEmail(data.user.email || '')

    const c = await sb
      .from('clubs')
      .select('*')
      .eq('owner_id', data.user.id)
      .maybeSingle()

    if (c.data) {
      setClub(c.data)

      const [b, s, o] = await Promise.all([
        sb
          .from('bookings')
          .select(
            'id,customer_name,starts_at,ends_at,price,status,services(name)'
          )
          .eq('club_id', c.data.id)
          .order('starts_at', { ascending: true })
          .limit(100),

        sb
          .from('services')
          .select('id,name,description,active')
          .eq('club_id', c.data.id)
          .order('name'),

        sb
          .from('service_options')
          .select(
            'id,service_id,duration_minutes,price,active'
          )
          .eq('active', true)
          .order('duration_minutes'),
      ])

      setBookings((b.data || []) as any)
      setServices(s.data || [])
      setOptions(o.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addService = async () => {
    if (!club || !newName.trim()) return

    const { data: service, error } = await sb
      .from('services')
      .insert({
        club_id: club.id,
        name: newName.trim(),
        duration_minutes: 30,
        price: 100,
        active: true,
      })
      .select()
      .single()

    if (error || !service) {
      alert(error?.message || 'Could not create service')
      return
    }

    // Create all five duration options
    await sb.from('service_options').insert(
      durations.map((d) => ({
        service_id: service.id,
        duration_minutes: d.value,
        price: 0,
        active: true,
      }))
    )

    setNewName('')
    await load()
  }

  const updateOption = async (
    optionId: string,
    price: string
  ) => {
    const value = Number(price)

    if (Number.isNaN(value) || value < 0) return

    await sb
      .from('service_options')
      .update({ price: value })
      .eq('id', optionId)

    setOptions((current) =>
      current.map((o) =>
        o.id === optionId
          ? { ...o, price: value }
          : o
      )
    )
  }

  const toggleService = async (service: Service) => {
    await sb
      .from('services')
      .update({ active: !service.active })
      .eq('id', service.id)

    await load()
  }

  const signout = async () => {
    await sb.auth.signOut()
    location.href = '/login'
  }

  if (loading) {
    return (
      <main className="center">
        Loading SportSlot…
      </main>
    )
  }

  return (
    <main className="dashboard">
      <aside className="side">
        <div className="brand">
          Sport<span>Slot</span>
        </div>

        <div className="club-mini">
          {club?.name || 'No club yet'}
        </div>

        <nav className="dashnav">
          {[
            ['overview', 'Overview'],
            ['bookings', 'Bookings'],
            ['services', 'Services'],
            ['settings', 'Settings'],
          ].map((x) => (
            <button
              key={x[0]}
              className={`navitem ${
                tab === x[0] ? 'active' : ''
              }`}
              onClick={() => setTab(x[0])}
            >
              {x[1]}
            </button>
          ))}
        </nav>

        <div className="sidebottom">
          <Link
            className="btn"
            href={
              club
                ? `/clubs/${club.slug}`
                : '/clubs/poti-lake-club'
            }
          >
            Public page
          </Link>

          <button className="btn" onClick={signout}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="main">
        <div className="topline">
          <div>
            <div className="muted">{email}</div>

            <h1>
              {tab === 'overview'
                ? 'Overview'
                : tab[0].toUpperCase() +
                  tab.slice(1)}
            </h1>
          </div>

          <Link
            className="btn primary"
            href={
              club
                ? `/clubs/${club.slug}`
                : '/clubs/poti-lake-club'
            }
          >
            View booking page
          </Link>
        </div>

        {tab === 'overview' && (
          <>
            <div className="statgrid">
              <div className="stat">
                <span className="muted">
                  Upcoming bookings
                </span>

                <strong>
                  {
                    bookings.filter(
                      (b) =>
                        new Date(b.starts_at) >
                          new Date() &&
                        b.status !== 'cancelled'
                    ).length
                  }
                </strong>
              </div>

              <div className="stat">
                <span className="muted">
                  Services
                </span>

                <strong>{services.length}</strong>
              </div>

              <div className="stat">
                <span className="muted">
                  Booking revenue
                </span>

                <strong>
                  {bookings
                    .reduce(
                      (a, b) =>
                        a + (Number(b.price) || 0),
                      0
                    )
                    .toLocaleString()}{' '}
                  GEL
                </strong>
              </div>
            </div>

            <div className="card section">
              <h2>Upcoming bookings</h2>
              <BookingTable
                bookings={bookings.slice(0, 8)}
              />
            </div>
          </>
        )}

        {tab === 'bookings' && (
          <div className="card section">
            <h2>All bookings</h2>
            <BookingTable bookings={bookings} />
          </div>
        )}

        {tab === 'services' && (
          <div className="card section">
            <h2>Services & pricing</h2>

            <div className="addrow">
              <input
                className="input"
                placeholder="Service name"
                value={newName}
                onChange={(e) =>
                  setNewName(e.target.value)
                }
              />

              <button
                className="btn primary"
                onClick={addService}
              >
                Add service
              </button>
            </div>

            <div className="service-list">
              {services.map((service) => {
                const serviceOptions =
                  options.filter(
                    (o) =>
                      o.service_id === service.id
                  )

                return (
                  <div
                    className="card"
                    key={service.id}
                    style={{
                      marginTop: 16,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <div>
                        <strong>
                          {service.name}
                        </strong>

                        <div className="muted">
                          {service.active
                            ? 'Active'
                            : 'Inactive'}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                        }}
                      >
                        <button
                          className="btn"
                          onClick={() =>
                            setEditingService(
                              editingService ===
                                service.id
                                ? null
                                : service.id
                            )
                          }
                        >
                          {editingService ===
                          service.id
                            ? 'Close'
                            : 'Edit'}
                        </button>

                        <button
                          className="btn"
                          onClick={() =>
                            toggleService(service)
                          }
                        >
                          {service.active
                            ? 'Disable'
                            : 'Enable'}
                        </button>
                      </div>
                    </div>

                    {editingService ===
                      service.id && (
                      <div
                        style={{
                          marginTop: 20,
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <strong>
                          Duration & price
                        </strong>

                        {durations.map((d) => {
                          const current =
                            serviceOptions.find(
                              (o) =>
                                o.duration_minutes ===
                                d.value
                            )

                          return (
                            <div
                              key={d.value}
                              style={{
                                display: 'flex',
                                alignItems:
                                  'center',
                                gap: 12,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                }}
                              >
                                {d.label}
                              </div>

                              <input
                                className="input small"
                                type="number"
                                min="0"
                                value={
                                  current?.price ??
                                  0
                                }
                                onChange={(e) => {
                                  if (current) {
                                    updateOption(
                                      current.id,
                                      e.target.value
                                    )
                                  }
                                }}
                              />

                              <span className="muted">
                                GEL
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="card section">
            <h2>Club settings</h2>

            <p>
              <strong>{club?.name}</strong>
            </p>

            <p className="muted">
              Slug: /clubs/{club?.slug}
            </p>

            <p className="muted">
              Opening hours, blocked periods,
              branding and staff management will
              be added here.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function BookingTable({
  bookings,
}: {
  bookings: Booking[]
}) {
  return (
    <div className="table">
      {bookings.length === 0 ? (
        <p className="muted">No bookings yet.</p>
      ) : (
        bookings.map((b) => (
          <div
            className="table-row"
            key={b.id}
          >
            <div>
              <strong>{b.customer_name}</strong>

              <div className="muted">
                {b.services?.name || 'Service'} ·{' '}
                {new Date(
                  b.starts_at
                ).toLocaleString()}
              </div>
            </div>

            <div>
              <strong>{b.price} GEL</strong>

              <div className="pill">
                {b.status}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
