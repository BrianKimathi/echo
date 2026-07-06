import { Link } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-7xl font-bold text-primary">404</p>
        <p className="mt-4 text-lg font-medium text-slate-700">Page not found</p>
        <p className="mt-1 text-sm text-slate-400">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary mt-6">Back to Dashboard</Link>
      </div>
    </AppLayout>
  )
}
