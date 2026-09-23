import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const email = String(body.email || '')
      .trim()
      .toLowerCase()

    const password = String(body.password || '')
    const name = String(body.name || '').trim()
    const clubName = String(body.club || '').trim()
    const sport = String(body.sport || '').trim()
    const planId = String(body.planId || '').trim()

    const billing =
      body.billing === 'yearly'
        ? 'yearly'
        : 'monthly'

    if (
      !email ||
      !password ||
      password.length < 6 ||
      !name ||
      !clubName ||
      !sport ||
      !planId
    ) {
      return NextResponse.json(
        {
          error:
            'Please complete all signup fields.',
        },
        { status: 400 }
      )
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL

    const adminKey =
      process.env.SUPABASE_ADMIN_KEY

    if (!supabaseUrl || !adminKey) {
      return NextResponse.json(
        {
          error:
            'Server authentication is not configured.',
        },
        { status: 500 }
      )
    }

    const admin = createClient(
      supabaseUrl,
      adminKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    )

    /*
     * 1. Create Auth user
     */
    const {
      data: userData,
      error: userError,
    } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'club_owner',
      },
    })

    if (userError) {
      return NextResponse.json(
        {
          error: userError.message,
        },
        { status: 400 }
      )
    }

    if (!userData.user) {
      return NextResponse.json(
        {
          error:
            'Unable to create your account.',
        },
        { status: 500 }
      )
    }

    const userId = userData.user.id

    /*
     * 2. Create club slug
     */
    const slug = clubName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    /*
     * 3. Create club using the server-side
     * admin client.
     */
    const {
      data: clubData,
      error: clubError,
    } = await admin
      .from('clubs')
      .insert({
        name: clubName,
        short_name: clubName
          .slice(0, 3)
          .toUpperCase(),
        city: '',
        slug,
        owner_id: userId,
        sport_type: sport,
      })
      .select('id')
      .single()

    if (clubError) {
      console.error(
        'Club creation error:',
        clubError
      )

      return NextResponse.json(
        {
          error:
            'Account created, but we could not create your club: ' +
            clubError.message,
        },
        { status: 400 }
      )
    }

    /*
     * 4. Verify selected subscription plan
     */
    const {
      data: plan,
      error: planError,
    } = await admin
      .from('subscription_plans')
      .select('id,name,active')
      .eq('id', planId)
      .eq('active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        {
          error:
            'The selected SportSlot plan is no longer available.',
        },
        { status: 400 }
      )
    }

    /*
     * 5. Start 14-day trial
     */
    const now = new Date()

    const trialEnd = new Date(now)
    trialEnd.setDate(
      trialEnd.getDate() + 14
    )

    const {
      error: subscriptionError,
    } = await admin
      .from('club_subscriptions')
      .insert({
        club_id: clubData.id,
        plan_id: plan.id,
        billing_interval: billing,
        status: 'trial',
        current_period_start:
          now.toISOString(),
        current_period_end:
          trialEnd.toISOString(),
      })

    if (subscriptionError) {
      console.error(
        'Subscription creation error:',
        subscriptionError
      )

      return NextResponse.json(
        {
          error:
            'Club created, but we could not start the trial: ' +
            subscriptionError.message,
        },
        { status: 400 }
      )
    }

    /*
     * Everything succeeded.
     */
    return NextResponse.json({
      success: true,
      user_id: userId,
      club_id: clubData.id,
      plan_id: plan.id,
      plan_name: plan.name,
      billing,
    })
  } catch (error) {
    console.error(
      'Signup route error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Something went wrong while creating your club.',
      },
      { status: 500 }
    )
  }
}
