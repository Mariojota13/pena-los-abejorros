import { formatDuesLabel } from '../lib/dues'

export default function DuesProgress({ paid, target }: { paid: number; target: number | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-neutral-900">{formatDuesLabel(paid, target)}</span>
      {target && target > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-[#EAE032]"
            style={{ width: `${Math.min(100, (paid / target) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
