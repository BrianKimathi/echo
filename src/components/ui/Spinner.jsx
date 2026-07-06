import { FiLoader } from 'react-icons/fi'

export default function Spinner({ size = 24, className = '' }) {
  return <FiLoader size={size} className={`animate-spin ${className}`} />
}

export const FullPageLoader = ({ label = 'Loading…' }) => (
  <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
    <Spinner size={40} className="text-primary" />
    <p className="text-sm text-slate-500">{label}</p>
  </div>
)

export const SectionLoader = ({ label = 'Loading…' }) => (
  <div className="flex w-full flex-col items-center justify-center gap-2 py-16">
    <Spinner size={28} className="text-primary" />
    <p className="text-sm text-slate-400">{label}</p>
  </div>
)

export const ButtonLoader = () => <FiLoader size={16} className="animate-spin" />
