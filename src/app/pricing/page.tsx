'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '../../lib/supabase'
import Link from 'next/link'

type Plan = {
  id: string
  name: string
  monthly_price: number
  yearly_price: number
  description: string
  features: string[]
}

export default function PricingPage() {
  const sb = supabaseBrowser()

  const [plans, setPlans] = useState<Plan[]>([])
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlans() {
      const { data, error } = await sb
        .from('subscription_plans')
        .select('*')
        .eq('active', true)
        .order('monthly_price')

      if (!error) {
        setPlans(data || [])
      }

      setLoading(false)
    }

    loadPlans()
  }, [])

  return (
    <main>
      <nav className="nav container">
        <Link
          href="/"
          className="brand"
          style={{
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          Sport<span>Slot</span>
        </Link>

        <Link className="btn" href="/login">
          Sign in
        </Link>
      </nav>

      <section
        className="container"
        style={{
          maxWidth: 1100,
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 45 }}>
          <div className="eyebrow">
            Simple pricing for sports clubs
          </div>

          <h1 style={{ fontSize: 48, marginBottom: 12 }}>
            Choose your SportSlot plan
          </h1>

          <p
            className="muted"
            style={{
              fontSize: 18,
              maxWidth: 620,
              margin: '0 auto',
            }}
          >
            Start your 14-day free trial and give your club
            a professional online booking system.
          </p>

          <div
            style={{
              display: 'inline-flex',
              gap: 6,
              padding: 6,
              borderRadius: 999,
              background: '#f1f5f9',
              marginTop: 28,
            }}
          >
            <button
              className="btn"
              onClick={() => setBilling('monthly')}
              style={{
                borderRadius: 999,
                background:
                  billing === 'monthly'
                    ? '#0d2d35'
                    : 'transparent',
                color:
                  billing === 'monthly'
                    ? '#fff'
                    : '#0d2d35',
              }}
            >
              Monthly
            </button>

            <button
              className="btn"
              onClick={() => setBilling('yearly')}
              style={{
                borderRadius: 999,
                background:
                  billing === 'yearly'
                    ? '#0d2d35'
                    : 'transparent',
                color:
                  billing === 'yearly'
                    ? '#fff'
                    : '#0d2d35',
              }}
            >
              Yearly
              <span style={{ marginLeft: 6 }}>
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="center">
            Loading plans…
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {plans.map((plan) => {
              const price =
                billing === 'monthly'
                  ? plan.monthly_price
                  : plan.yearly_price

              const monthlyEquivalent =
                billing === 'yearly'
                  ? Math.round(
                      plan.yearly_price / 12
                    )
                  : plan.monthly_price

              return (
                <div
                  key={plan.id}
                  className="card"
                  style={{
                    padding: 30,
                    position: 'relative',
                  }}
                >
                  {plan.name === 'Professional' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: 20,
                        padding: '6px 12px',
                        borderRadius: 999,
                        background:
                          'var(--accent)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  <h2>{plan.name}</h2>

                  <p className="muted">
                    {plan.description}
                  </p>

                  <div style={{ margin: '25px 0' }}>
                    <strong
                      style={{
                        fontSize: 42,
                      }}
                    >
                      {price}
                    </strong>

                    <span className="muted">
                      {' '}
                      GEL
                      {billing === 'monthly'
                        ? ' / month'
                        : ' / year'}
                    </span>

                    {billing === 'yearly' && (
                      <div
                        className="muted"
                        style={{
                          marginTop: 5,
                        }}
                      >
                        ≈ {monthlyEquivalent} GEL/month
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      marginBottom: 30,
                    }}
                  >
                    {plan.features.map(
                      (feature) => (
                        <div key={feature}>
                          ✓ {feature}
                        </div>
                      )
                    )}
                  </div>

                  <Link
                    href={`/signup?plan=${plan.id}&billing=${billing}`}
                    className="btn primary"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    Start free trial
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        <p
          className="muted"
          style={{
            textAlign: 'center',
            marginTop: 30,
          }}
        >
          No payment required during your 14-day
          trial.
        </p>
      </section>
    </main>
  )
}
