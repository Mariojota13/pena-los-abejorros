import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No autorizado.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'No autorizado.' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('id, is_admin')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()

    if (!callerProfile?.is_admin) {
      return json({ error: 'Solo un administrador puede eliminar miembros.' }, 403)
    }

    const body = await req.json()
    const profileId = body.profileId as string | undefined
    if (!profileId) {
      return json({ error: 'Falta el identificador del miembro.' }, 400)
    }
    if (profileId === callerProfile.id) {
      return json({ error: 'No puedes eliminar tu propia cuenta de administrador.' }, 400)
    }

    const { data: target, error: targetError } = await adminClient
      .from('profiles')
      .select('id, auth_user_id')
      .eq('id', profileId)
      .maybeSingle()

    if (targetError) return json({ error: targetError.message }, 400)
    if (!target) return json({ error: 'Miembro no encontrado.' }, 404)

    if (target.auth_user_id) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.auth_user_id)
      if (authDeleteError) {
        return json({ error: authDeleteError.message }, 400)
      }
    }

    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', profileId)
    if (profileDeleteError) {
      return json({ error: profileDeleteError.message }, 400)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
