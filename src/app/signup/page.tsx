'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '../../lib/supabase'

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

function SignupForm() {
  const sb = supabaseBrowser()
  const searchParams = useSearchParams()

  const selectedSport =
    searchParams.get('sport') || ''

  const selectedPlan =
    searchParams.get('plan') || ''

  const billing =
    searchParams.get('billing') === 'yearly'
      ? 'yearly'
      : 'monthly'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [club, setClub] = useState('')
  const [sport, setSport] =
    useState(selectedSport)

  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [submitting, setSubmitting] =
    useState(false)

  const submit = async () => {
    setError('')

    if (
      !name.trim() ||
      !email.trim() ||
      password.length < 6 ||
      !club.trim() ||
      !sport
    ) {
      setError(
        'Please complete all fields. Password must be at least 6 characters.'
      )
      return
    }

    if (!selectedPlan) {
      setError(
        'Please choose a SportSlot plan before creating your club.'
      )
      return
    }

    setSubmitting(true)

    try {
      /*
       * STEP 1
       * Create the Supabase Auth user through our
       * server-side route.
       *
       * This does NOT use Supabase's email provider.
       */
      const response = await fetch(
        '/api/signup',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            name: name.trim(),
          }),
        }
      )

      const result =
        await response.json()

      if (!response.ok) {
        setError(
          result.error ||
            'Unable to create your account.'
        )
        setSubmitting(false)
        return
      }

      if (!result.user_id) {
        setError(
          'Unable to create your account.'
        )
        setSubmitting(false)
        return
      }

      /*
       * STEP 2
       * Sign in immediately.
       *
       * The server has already created and
       * confirmed the account, so no email
       * confirmation is required.
       */
      const {
        error: loginError,
      } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) {
        setError(
          loginError.message
        )
        setSubmitting(false)
        return
      }

      /*
       * STEP 3
       * Create the club.
       *
       * At this point the browser has an
       * authenticated Supabase session, so
       * the existing RLS policy can verify
       * the owner.
       */
      const slug = club
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const {
        data: clubData,
        error: clubError,
      } = await sb
        .from('clubs')
        .insert({
          name: club.trim(),
          short_name: club
            .trim()
            .slice(0, 3)
            .toUpperCase(),
          city: '',
          slug,
          owner_id: result.user_id,
          sport_type: sport,
        })
        .select('id')
        .single()

      if (clubError) {
        setError(
          clubError.message
        )
        setSubmitting(false)
        return
      }

      /*
       * STEP 4
       * Start the selected 14-day trial.
       */
      const {
        error: subscriptionError,
      } = await sb.rpc(
        'start_club_subscription',
        {
          p_club_id: clubData.id,
          p_plan_id: selectedPlan,
          p_billing_interval: billing,
        }
      )

      if (subscriptionError) {
        setError(
          subscriptionError.message
        )
        setSubmitting(false)
        return
      }

      /*
       * Everything succeeded.
       */
      setSubmitting(false)
      setOk(true)
    } catch (err) {
      console.error(
        'Signup error:',
        err
      )

      setError(
        'Something went wrong. Please try again.'
      )

      setSubmitting(false)
    }
  }

  return (
    <main>
      <nav className="nav container">
        <a
          href="/"
          className="brand"
          style={{
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          Sport<span>Slot</span>
        </a>

        <Link
          className="btn"
          href="/login"
        >
          Sign in
        </Link>
      </nav>

      <section className="auth-card">
        <div className="eyebrow">
          For club owners
        </div>

        <h1>
          Create your club
        </h1>

        <p className="muted">
          Start your 14-day free trial
          with SportSlot.
        </p>

        {selectedPlan ? (
          <div
            style={{
              marginBottom: 25,
              padding: 16,
              borderRadius: 12,
              background: '#f1f5f9',
            }}
          >
            <div
              className="muted"
              style={{
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              Selected plan
            </div>

            <strong>
              {billing === 'yearly'
                ? 'Yearly subscription'
                : 'Monthly subscription'}
            </strong>

            <div className="muted">
              14-day free trial
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: 25,
              padding: 16,
              borderRadius: 12,
              background: '#fff7ed',
            }}
          >
            <div
              style={{
                marginBottom: 10,
              }}
            >
              Please choose a SportSlot
              plan first.
            </div>

            <Link
              className="btn"
              href="/pricing"
            >
              View plans
            </Link>
          </div>
        )}

        {ok ? (
          <div className="success">
            <h2>
              Your club is ready ✓
            </h2>

            <p>
              Your 14-day free trial
              has started.
            </p>

            <p className="muted">
              Your account has been
              created successfully.
            </p>

            <Link
              className="btn primary"
              href="/login"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <div className="form">
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <input
              className="input"
              placeholder="Club name"
              value={club}
              onChange={(e) =>
                setClub(e.target.value)
              }
            />

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

            <input
              className="input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              className="input"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              className="btn primary"
              onClick={submit}
              disabled={
                submitting ||
                !selectedPlan
              }
            >
              {submitting
                ? 'Creating your club…'
                : 'Start free trial'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default function Signup() {
  return (
    <Suspense
      fallback={
        <main className="center">
          Loading SportSlot…
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
