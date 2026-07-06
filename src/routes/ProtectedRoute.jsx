import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FullPageLoader } from '../components/ui/Spinner'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader label="Authenticating…" />

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (profile && profile.active === false) {
    return <Navigate to="/login" state={{ deactivated: true }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
