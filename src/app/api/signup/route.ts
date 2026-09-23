import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  let createdUserId = ''
  let createdClubId = ''

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

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

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
          success: false,
          version: 'signup-v3-direct',
          error: 'Please complete all signup fields.',
        },
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // SUPABASE CONFIG
    // --------------------------------------------------

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL

    const adminKey =
      process.env.SUPABASE_ADMIN_KEY

    if (!supabaseUrl || !adminKey) {
      return NextResponse.json(
        {
          success: false,
          version: 'signup-v3-direct',
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

    // --------------------------------------------------
    // STEP 1: CREATE AUTH USER
    // --------------------------------------------------

    const {
      data: userData,
      error: userError,
    } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: 'club_owner',
        },
      })

    if (userError) {
      console.error(
        'SIGNUP-V3 Auth error:',
        userError
      )

      return NextResponse.json(
        {
          success: false,
          version: 'signup-v3-direct',
          error: userError.message,
        },
        { status: 400 }
      )
    }

    if (!userData.user) {
      return NextResponse.json(
        {
          success: false,
          version: 'signup-v3-direct',
          error:
            'Unable to create your account.',
        },
        { status: 500 }
      )
    }

    createdUserId = userData.user.id

    console.log(
      'SIGNUP-V3: User created:',
      createdUserId
    )

    // --------------------------------------------------
    // STEP 2: VERIFY PLAN
    // --------------------------------------------------

    const {
      data: plan,
      error: planError,
    } =
      await admin
        .from('subscription_plans')
        .select('id')
        .eq('id', planId)
        .eq('active', true)
        .maybeSingle()

    if (planError) {
      console.error(
        'SIGNUP-V3 Plan error:',
        planError
      )

      throw new Error(
        'Could not verify the selected plan: ' +
          planError.message
      )
    }

    if (!plan) {
      throw new Error(
        'The selected subscription plan is not available.'
      )
    }

    // --------------------------------------------------
    // STEP 3: CREATE UNIQUE CLUB SLUG
    // --------------------------------------------------

    let baseSlug = clubName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!baseSlug) {
      baseSlug = 'club'
    }

    let slug = baseSlug
    let suffix = 1

    while (true) {
      const {
        data: existingClub,
        error: slugCheckError,
      } =
        await admin
          .from('clubs')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

      if (slugCheckError) {
        console.error(
          'SIGNUP-V3 Slug check error:',
          slugCheckError
        )

        throw new Error(
          'Could not check club availability: ' +
            slugCheckError.message
        )
      }

      if (!existingClub) {
        break
      }

      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    // --------------------------------------------------
    // STEP 4: CREATE CLUB DIRECTLY
    //
    // IMPORTANT:
    // We are intentionally NOT using
    // create_club_and_trial.
    // --------------------------------------------------

    const {
      data: club,
      error: clubError,
    } =
      await admin
        .from('clubs')
        .insert({
          name: clubName,
          short_name: clubName
            .substring(0, 3)
            .toUpperCase(),
          city: '',
          slug,
          owner_id: createdUserId,
          sport_type: sport,
        })
        .select('id')
        .single()

    if (clubError) {
      console.error(
        'SIGNUP-V3 Club creation error:',
        clubError
      )

      throw new Error(
        'Could not create your club: ' +
          clubError.message
      )
    }

    if (!club) {
      throw new Error(
        'Club was not created.'
      )
    }

    createdClubId = club.id

    console.log(
      'SIGNUP-V3: Club created:',
      createdClubId
    )

    // --------------------------------------------------
    // STEP 5: CREATE 14-DAY TRIAL
    // --------------------------------------------------

    const trialStart = new Date()

    const trialEnd = new Date(
      trialStart.getTime() +
        14 * 24 * 60 * 60 * 1000
    )

    const {
      error: subscriptionError,
    } =
      await admin
        .from('club_subscriptions')
        .insert({
          club_id: createdClubId,
          plan_id: plan.id,
          billing_interval: billing,
          status: 'trial',
          current_period_start:
            trialStart.toISOString(),
          current_period_end:
            trialEnd.toISOString(),
        })

    if (subscriptionError) {
      console.error(
        'SIGNUP-V3 Subscription error:',
        subscriptionError
      )

      throw new Error(
        'Could not create your free trial: ' +
          subscriptionError.message
      )
    }

    console.log(
      'SIGNUP-V3: Trial created:',
      createdClubId
    )

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      version: 'signup-v3-direct',

      user_id: createdUserId,

      club_id: createdClubId,

      plan_id: plan.id,

      billing,

      trial_ends_at:
        trialEnd.toISOString(),
    })
  } catch (error) {
    console.error(
      'SIGNUP-V3 ERROR:',
      error
    )

    // --------------------------------------------------
    // CLEANUP CLUB
    // --------------------------------------------------

    if (createdClubId) {
      try {
        const supabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL

        const adminKey =
          process.env.SUPABASE_ADMIN_KEY

        if (
          supabaseUrl &&
          adminKey
        ) {
          const cleanupClient =
            createClient(
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

          await cleanupClient
            .from('club_subscriptions')
            .delete()
            .eq(
              'club_id',
              createdClubId
            )

          await cleanupClient
            .from('clubs')
            .delete()
            .eq(
              'id',
              createdClubId
            )
        }
      } catch (cleanupError) {
        console.error(
          'SIGNUP-V3 club cleanup error:',
          cleanupError
        )
      }
    }

    // --------------------------------------------------
    // CLEANUP AUTH USER
    // --------------------------------------------------

    if (createdUserId) {
      try {
        const supabaseUrl =
          process.env.NEXT_PUBLIC_SUPABASE_URL

        const adminKey =
          process.env.SUPABASE_ADMIN_KEY

        if (
          supabaseUrl &&
          adminKey
        ) {
          const cleanupClient =
            createClient(
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

          await cleanupClient.auth.admin.deleteUser(
            createdUserId
          )
        }
      } catch (cleanupError) {
        console.error(
          'SIGNUP-V3 user cleanup error:',
          cleanupError
        )
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Something went wrong while creating your club.'

    return NextResponse.json(
      {
        success: false,
        version: 'signup-v3-direct',
        error:
          'SIGNUP-V3: ' + message,
      },
      { status: 500 }
    )
  }
}
