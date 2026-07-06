import { FiInbox } from 'react-icons/fi'

export default function EmptyState({ icon: Icon = FiInbox, title = 'Nothing here yet', subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={28} />
      </div>
      <div>
        <p className="font-medium text-slate-700">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
