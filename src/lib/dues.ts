export function formatDuesLabel(paid: number, target: number | null) {
  if (!target) return `${paid.toFixed(2)} €`
  return `${paid.toFixed(2)} € de ${target.toFixed(2)} €`
}
