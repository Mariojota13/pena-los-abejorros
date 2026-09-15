export default function Placeholder({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-neutral-400">
      <span className="text-4xl">{icon}</span>
      <p>
        <span className="font-medium text-neutral-600">{title}</span>
        <br />
        Próximamente
      </p>
    </div>
  )
}
