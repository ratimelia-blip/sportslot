import { createBrowserClient } from '@supabase/ssr'

export function supabaseBrowser() {
  return createBrowserClient(
    'https://eiozupvpvgxaecgotbrd.supabase.co',
    'sb_publishable_o3zS4oEmXZ_yLGgMLdzy6Q_GC0P_7w2'
  )
}
