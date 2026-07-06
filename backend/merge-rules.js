/**
 * Merges tuktukSales rules into the existing Realtime Database security rules
 * without affecting rules for other apps (Notifications, debts, etc.).
 *
 * Usage: node backend/merge-rules.js
 */
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

const SERVICE_ACCOUNT_PATH = 'kile-kitabu-firebase-adminsdk-fbsvc-88110c9774.json'

const TUKTUK_RULES = {
  users: {
    '$uid': {
      '.read': 'auth != null',
      '.write': 'auth != null && (auth.uid === $uid || root.child("tuktukSales/users/" + auth.uid + "/role").val() === "Admin")',
    },
    '.read': 'auth != null',
  },
  customers: { '.read': 'auth != null', '.write': 'auth != null' },
  inquiries: { '.read': 'auth != null', '.write': 'auth != null' },
  vehicles: { '.read': 'auth != null', '.write': 'auth != null' },
  sales: { '.read': 'auth != null', '.write': 'auth != null' },
  payments: { '.read': 'auth != null', '.write': 'auth != null' },
  creditApplications: { '.read': 'auth != null', '.write': 'auth != null' },
  workshopJobs: { '.read': 'auth != null', '.write': 'auth != null' },
  ntsaProcesses: { '.read': 'auth != null', '.write': 'auth != null' },
  dispatchOrders: { '.read': 'auth != null', '.write': 'auth != null' },
  notifications: { '.read': 'auth != null', '.write': 'auth != null' },
  reports: { '.read': 'auth != null', '.write': 'auth != null' },
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

  // Get an access token from the admin credential
  const accessToken = await app.options.credential.getAccessToken()

  const rulesUrl =
    'https://kile-kitabu-default-rtdb.firebaseio.com/.settings/rules/.json?access_token=' +
    accessToken.access_token

  // Fetch current rules
  const getRes = await fetch(rulesUrl)
  const currentRules = await getRes.json()

  const currentKeys = Object.keys(currentRules.rules || {})
  console.log('[INFO] Current top-level rule keys:', currentKeys)

  // Merge tuktukSales rules into existing rules
  const merged = { ...currentRules }
  merged.rules = { ...(merged.rules || {}) }
  merged.rules.tuktukSales = TUKTUK_RULES

  // Write merged rules back
  const setRes = await fetch(rulesUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(merged),
  })

  if (setRes.ok) {
    console.log('[SUCCESS] tuktukSales rules merged into database. Existing rules untouched.')
    console.log('[INFO] Updated top-level rule keys:', Object.keys(merged.rules))
  } else {
    const txt = await setRes.text()
    console.error('[ERROR] Failed to set rules:', setRes.status, txt)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error('[ERROR]', e.message)
  process.exit(1)
})
