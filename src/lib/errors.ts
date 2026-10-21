export function supabaseErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  return null
}

/** Pide confirmación, borra una fila y avisa si no se pudo. Devuelve true si se borró. */
export async function confirmAndDelete(
  run: () => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  what: string,
): Promise<boolean> {
  if (!window.confirm(`¿Seguro que quieres borrar ${what}? No se puede deshacer.`)) return false
  const { data, error } = await run()
  if (error || !data || data.length === 0) {
    const detail = supabaseErrorMessage(error)
    window.alert(`No se pudo borrar ${what}${detail ? `: ${detail}` : '. Puede que no tengas permiso o que ya no exista.'}`)
    return false
  }
  return true
}
