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

    // Create the Auth user
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

    createdUserId = userData.user.id

    // Create club + subscription using
    // the Supabase database function.
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
        'Club setup error:',
        setupError
      )

      // Remove the Auth user if the club
      // could not be created.
      try {
        await admin.auth.admin.deleteUser(
          createdUserId
        )
      } catch (deleteError) {
        console.error(
          'Could not clean up user:',
          deleteError
        )
      }

      return NextResponse.json(
        {
          error:
            'We could not finish creating your club: ' +
            setupError.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
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
      'Signup route error:',
      error
    )

    // Clean up an Auth user if something
    // unexpected happened.
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
                  autoRefreshToken:
                    false,
                  persistSession:
                    false,
                  detectSessionInUrl:
                    false,
                },
              }
            )

          await admin.auth.admin.deleteUser(
            createdUserId
          )
        }
      } catch (cleanupError) {
        console.error(
          'Cleanup error:',
          cleanupError
        )
      }
    }

    return NextResponse.json(
      {
        error:
          'Something went wrong while creating your club.',
      },
      { status: 500 }
    )
  }
}
