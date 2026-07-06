import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { ref, get, set, update } from 'firebase/database'
import { auth, db, secondaryAuth } from '../firebase/config'
import { ROLES, ROLE_DEPARTMENT, DB_ROOT } from '../constants'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid) => {
    const snap = await get(ref(db, `${DB_ROOT}/users/${uid}`))
    if (snap.exists()) {
      const data = snap.val()
      setProfile({ uid, ...data })
      return { uid, ...data }
    }
    setProfile(null)
    return null
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await loadProfile(firebaseUser.uid)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [loadProfile])

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const prof = await loadProfile(cred.user.uid)
    if (prof && prof.active === false) {
      await signOut(auth)
      throw new Error('Your account has been deactivated. Contact the administrator.')
    }
    return cred.user
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const createUser = async ({ name, email, password, phone, role }) => {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const uid = cred.user.uid
    const userData = {
      uid,
      name,
      email,
      phone: phone || '',
      role,
      department: ROLE_DEPARTMENT[role] || '',
      createdAt: Date.now(),
      active: true,
    }
    await set(ref(db, `${DB_ROOT}/users/${uid}`), userData)
    await signOut(secondaryAuth)
    return userData
  }

  const updateUserProfile = async (uid, data) => {
    await update(ref(db, `${DB_ROOT}/users/${uid}`), data)
    if (uid === profile?.uid) {
      setProfile({ ...profile, ...data })
    }
  }

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    resetPassword,
    createUser,
    updateUserProfile,
    isAdmin: profile?.role === ROLES.ADMIN,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
