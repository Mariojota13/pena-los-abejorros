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
      .select('is_admin')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle()

    if (!callerProfile?.is_admin) {
      return json({ error: 'Solo un administrador puede crear miembros.' }, 403)
    }

    const body = await req.json()
    const email = (body.email as string | undefined)?.trim().toLowerCase()
    const password = body.password as string | undefined
    const name = (body.name as string | undefined)?.trim()
    const nickname = (body.nickname as string | undefined)?.trim() || null
    const birthday = (body.birthday as string | undefined) || null
    const roleTitle = (body.roleTitle as string | undefined)?.trim() || null
    const memberSinceYear = (body.memberSinceYear as number | undefined) || null

    if (!email || !password || !name) {
      return json({ error: 'Faltan datos obligatorios (nombre, email o contraseña).' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400)
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'No se pudo crear la cuenta.' }, 400)
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    const profileFields = {
      auth_user_id: created.user.id,
      name,
      nickname,
      birthday,
      role_title: roleTitle,
      member_since_year: memberSinceYear,
    }

    let profile
    let profileError
    if (existingProfile) {
      const res = await adminClient
        .from('profiles')
        .update(profileFields)
        .eq('id', existingProfile.id)
        .select()
        .single()
      profile = res.data
      profileError = res.error
    } else {
      const res = await adminClient
        .from('profiles')
        .insert({ ...profileFields, email })
        .select()
        .single()
      profile = res.data
      profileError = res.error
    }

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: profileError.message }, 400)
    }

    return json({ profile })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
