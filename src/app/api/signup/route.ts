import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  let createdUserId = ''

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
    // Validate signup data
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
          version: 'signup-v2-tennis',
          error: 'Please complete all signup fields.',
        },
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // Supabase configuration
    // --------------------------------------------------

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL

    const adminKey =
      process.env.SUPABASE_ADMIN_KEY

    if (!supabaseUrl || !adminKey) {
      return NextResponse.json(
        {
          success: false,
          version: 'signup-v2-tennis',
          error:
            'Server authentication is not configured.',
        },
        { status: 500 }
      )
    }

    // --------------------------------------------------
    // Create Supabase admin client
    // --------------------------------------------------

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
    // STEP 1
    // Create Auth user
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
        'Signup Auth user error:',
        userError
      )

      return NextResponse.json(
        {
          success: false,
          version: 'signup-v2-tennis',
          error: userError.message,
        },
        { status: 400 }
      )
    }

    if (!userData.user) {
      return NextResponse.json(
        {
          success: false,
          version: 'signup-v2-tennis',
          error:
            'Unable to create your account.',
        },
        { status: 500 }
      )
    }

    createdUserId = userData.user.id

    console.log(
      'SIGNUP-V2: Auth user created:',
      createdUserId
    )

    // --------------------------------------------------
    // STEP 2
    // Create club + 14-day trial
    // --------------------------------------------------

    const {
      data: setupData,
      error: setupError,
    } =
      await admin.rpc(
        'create_club_and_trial',
        {
          p_user_id: createdUserId,
          p_club_name: clubName,
          p_sport: sport,
          p_plan_id: planId,
          p_billing_interval: billing,
        }
      )

    if (setupError) {
      console.error(
        'SIGNUP-V2: Club setup error:',
        setupError
      )

      // --------------------------------------------------
      // Cleanup Auth user if club creation failed
      // --------------------------------------------------

      try {
        await admin.auth.admin.deleteUser(
          createdUserId
        )

        console.log(
          'SIGNUP-V2: Auth user cleaned up:',
          createdUserId
        )
      } catch (deleteError) {
        console.error(
          'SIGNUP-V2: Could not clean up user:',
          deleteError
        )
      }

      return NextResponse.json(
        {
          success: false,
          version: 'signup-v2-tennis',
          error:
            'SIGNUP-V2: We could not finish creating your club: ' +
            setupError.message,
        },
        { status: 400 }
      )
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    console.log(
      'SIGNUP-V2: Club successfully created:',
      setupData
    )

    return NextResponse.json({
      success: true,
      version: 'signup-v2-tennis',

      user_id: createdUserId,

      club_id:
        setupData?.club_id,

      plan_id:
        setupData?.plan_id,

      billing:
        setupData?.billing,

      trial_ends_at:
        setupData?.trial_ends_at,
    })
  } catch (error) {
    console.error(
      'SIGNUP-V2: Unexpected signup error:',
      error
    )

    // --------------------------------------------------
    // Cleanup Auth user if something unexpected happened
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
          const admin =
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

          await admin.auth.admin.deleteUser(
            createdUserId
          )

          console.log(
            'SIGNUP-V2: Cleanup successful:',
            createdUserId
          )
        }
      } catch (cleanupError) {
        console.error(
          'SIGNUP-V2: Cleanup error:',
          cleanupError
        )
      }
    }

    return NextResponse.json(
      {
        success: false,
        version: 'signup-v2-tennis',
        error:
          'SIGNUP-V2: Something went wrong while creating your club.',
      },
      { status: 500 }
    )
  }
}
