/**
 * Seed script — creates the initial Admin user using the Firebase Admin SDK.
 * The Admin SDK bypasses Realtime Database security rules, so this works
 * even before the tuktukSales rules are deployed.
 *
 * Usage:
 *   node backend/seed-admin.js
 *
 * Requires the service account key file at the project root:
 *   kile-kitabu-firebase-adminsdk-fbsvc-88110c9774.json
 */
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const SERVICE_ACCOUNT_PATH = 'kile-kitabu-firebase-adminsdk-fbsvc-88110c9774.json'

const ADMIN = {
  name: 'System Administrator',
  email: 'admin@tuktuk.com',
  password: 'Admin@12345',
  phone: '+254700000000',
  role: 'Admin',
  department: 'Administration',
}

async function main() {
  let serviceAccount
  try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
  } catch {
    console.error(`\n[ERROR] Could not read service account key at "${SERVICE_ACCOUNT_PATH}".\n`)
    process.exit(1)
  }

  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://kile-kitabu-default-rtdb.firebaseio.com',
  })

  const auth = getAuth(app)
  const db = getDatabase(app)

  // Check if admin already exists
  try {
    const existing = await auth.getUserByEmail(ADMIN.email)
    if (existing) {
      console.log(`\n[SKIP] Admin user "${ADMIN.email}" already exists (uid: ${existing.uid}).`)
      console.log('       Ensuring DB profile exists…')
      await db.ref(`tuktukSales/users/${existing.uid}`).set({
        uid: existing.uid,
        name: ADMIN.name,
        email: ADMIN.email,
        phone: ADMIN.phone,
        role: ADMIN.role,
        department: ADMIN.department,
        createdAt: Date.now(),
        active: true,
      })
      console.log('[DONE] DB profile ensured.\n')
      process.exit(0)
    }
  } catch (e) {
    // auth/user-not-found is expected — continue to create
    if (e.code !== 'auth/user-not-found') {
      console.error('[ERROR]', e.message)
      process.exit(1)
    }
  }

  // Create the auth user
  const userRecord = await auth.createUser({
    email: ADMIN.email,
    password: ADMIN.password,
    displayName: ADMIN.name,
    phoneNumber: ADMIN.phone,
    emailVerified: true,
  })

  const uid = userRecord.uid

  // Write the profile to the namespaced RTDB node
  await db.ref(`tuktukSales/users/${uid}`).set({
    uid,
    name: ADMIN.name,
    email: ADMIN.email,
    phone: ADMIN.phone,
    role: ADMIN.role,
    department: ADMIN.department,
    createdAt: Date.now(),
    active: true,
  })

  console.log('\n[SUCCESS] Admin user created:')
  console.log(`   Email:    ${ADMIN.email}`)
  console.log(`   Password: ${ADMIN.password}`)
  console.log(`   UID:      ${uid}`)
  console.log('\nIMPORTANT: Change this password after first login.\n')
  process.exit(0)
}

main().catch((e) => {
  console.error('\n[ERROR]', e.message, '\n')
  process.exit(1)
})
