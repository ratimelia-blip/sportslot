'use client'

import { useState } from 'react'
import Link from 'next/link'

const sports = [
  'Watersports',
  'Tennis',
  'Football',
  'Basketball',
  'Swimming',
  'Martial Arts',
  'Fitness / Gym',
  'Golf',
  'Volleyball',
  'Badminton',
  'Athletics',
  'Other',
]

export default function Home() {
  const [sport, setSport] = useState('')

  return (
    <main>
      <nav className="nav container">
        <div className="brand">
          Sport<span>Slot</span>
        </div>

        <Link
          className="btn"
          href="/login"
        >
          Club owner login
        </Link>
      </nav>

      <section className="hero container">
        <div className="eyebrow">
          Booking infrastructure for sport
        </div>

        <h1>
          Turn your sports club into a bookable business.
        </h1>

        <p>
          SportSlot gives clubs a simple public booking page,
          owner dashboard, availability calendar and customer
          management — without complicated software.
        </p>

        <div
          style={{
            marginTop: 28,
            maxWidth: 520,
          }}
        >
          <div
            className="card"
            style={{
              padding: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              What type of sport does your club offer?
            </h3>

            <p className="muted">
              Choose your sport to create your club booking account.
            </p>

            <select
              className="input"
              value={sport}
              onChange={(e) =>
                setSport(e.target.value)
              }
            >
              <option value="">
                Select your sport
              </option>

              {sports.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 14 }}>
              {sport ? (
                <Link
                  className="btn primary"
                  href={`/signup?sport=${encodeURIComponent(
                    sport
                  )}`}
                  style={{
                    display: 'inline-block',
                  }}
                >
                  Continue with {sport}
                </Link>
              ) : (
                <button
                  className="btn primary"
                  disabled
                  style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                >
                  Select a sport first
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 20,
          }}
        >
          <Link
            className="btn"
            href="/clubs/poti-lake-club"
          >
            See PLC booking page
          </Link>

          <Link
            className="btn"
            href="/login"
          >
            Open dashboard
          </Link>
        </div>

        <div className="cards">
          <div className="card">
            <div>01</div>

            <h3>
              Get discovered
            </h3>

            <p className="muted">
              Give customers a clean,
              mobile-first booking page
              for your club.
            </p>
          </div>

          <div className="card">
            <div>02</div>

            <h3>
              Take bookings
            </h3>

            <p className="muted">
              Services, durations, prices
              and real-time availability
              in one flow.
            </p>
          </div>

          <div className="card">
            <div>03</div>

            <h3>
              Run the club
            </h3>

            <p className="muted">
              See bookings and customers
              from a simple owner dashboard.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
