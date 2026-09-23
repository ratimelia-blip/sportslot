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

    if (
      !email ||
      !password ||
      password.length < 6 ||
      !name
    ) {
      return NextResponse.json(
        {
          error:
            'Please provide a valid name, email, and password.',
        },
        { status: 400 }
      )
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL

    // IMPORTANT:
    // This reads the secret from the Vercel
    // environment variable named SUPABASE_ADMIN_KEY.
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

    const { data, error } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: 'club_owner',
        },
      })

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            'Unable to create your account.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user_id: data.user.id,
    })
  } catch (error) {
    console.error(
      'Signup route error:',
      error
    )

    return NextResponse.json(
      {
        error:
          'Unable to create your account.',
      },
      { status: 500 }
    )
  }
}
