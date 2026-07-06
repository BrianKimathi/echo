import { motion } from 'framer-motion'

export default function StatCard({ icon: Icon, label, value, color = 'primary', delay = 0, onClick }) {
  const colors = {
    primary: 'bg-primary-50 text-primary',
    secondary: 'bg-secondary-50 text-secondary',
    accent: 'bg-accent-50 text-accent-500',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className={`card p-5 ${onClick ? 'cursor-pointer transition hover:shadow-elevated' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}>
          {Icon && <Icon size={24} />}
        </div>
      </div>
    </motion.div>
  )
}
