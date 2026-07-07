// All Tuk-Tuk Sales data is namespaced under this root node in the shared
// Realtime Database so it never touches data from other apps.
export const DB_ROOT = 'tuktukSales'

export const ROLES = {
  ADMIN: 'Admin',
  SALES_AGENT: 'Sales Agent',
  FINANCE_OFFICER: 'Finance Officer',
  WORKSHOP_OFFICER: 'Workshop Officer',
  NTSA_OFFICER: 'NTSA Officer',
  DISPATCH_OFFICER: 'Dispatch Officer',
}

export const DEPARTMENTS = {
  ADMINISTRATION: 'Administration',
  SALES: 'Sales',
  FINANCE: 'Finance',
  WORKSHOP: 'Workshop',
  NTSA: 'NTSA',
  DISPATCH: 'Dispatch',
}

export const ROLE_OPTIONS = Object.values(ROLES)
export const DEPARTMENT_OPTIONS = Object.values(DEPARTMENTS)

export const ROLE_DEPARTMENT = {
  [ROLES.ADMIN]: DEPARTMENTS.ADMINISTRATION,
  [ROLES.SALES_AGENT]: DEPARTMENTS.SALES,
  [ROLES.FINANCE_OFFICER]: DEPARTMENTS.FINANCE,
  [ROLES.WORKSHOP_OFFICER]: DEPARTMENTS.WORKSHOP,
  [ROLES.NTSA_OFFICER]: DEPARTMENTS.NTSA,
  [ROLES.DISPATCH_OFFICER]: DEPARTMENTS.DISPATCH,
}

export const INQUIRY_STATUS = ['New', 'Contacted', 'Negotiating', 'Converted', 'Cancelled']

export const VEHICLE_STATUS = ['Available', 'Reserved', 'Workshop', 'Delivered', 'Sold']

export const VEHICLE_MODELS = ['EcoRider Pro', 'CargoMax X1', 'CityCab Deluxe', 'FleetRunner S', 'Hauler HD']

export const VEHICLE_COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'White', 'Black', 'Orange', 'Silver']

export const CUSTOMER_TYPES = ['Passenger', 'Cargo']

export const SALE_STATUS = [
  'Payment Pending',
  'Payment Confirmed',
  'Workshop',
  'NTSA',
  'Ready for Dispatch',
  'Completed',
]

export const PAYMENT_METHODS = ['Cash', 'Credit']

export const PAYMENT_STATUS = ['Pending', 'Confirmed']

export const CREDIT_STATUS = ['Pending', 'Approved', 'Rejected', 'Disbursed']

// Default financiers seeded into the dashboard Settings. Admins can add or
// remove entries from the Settings page; these are only the starting values.
export const DEFAULT_FINANCIERS = [
  'Watu Credit Ltd',
  'Rafiki Bank',
  'M-Kopa Credit Ltd',
  'Fortune Credit',
]

// Default branches seeded into the dashboard Settings. A branch is attached to
// each sale when it is created.
export const DEFAULT_BRANCHES = [
  'Mombasa',
  'Bungoma',
  'Malindi',
  'Nairobi',
  'Kisumu',
  'Eldoret',
  'Nakuru',
  'Thika',
]

// Document categories required for a credit application. Each applicant must
// upload at least one file per category. `guarantors` may hold multiple files
// (one or more guarantors).
export const CREDIT_DOCUMENT_TYPES = [
  { key: 'id', label: 'National ID' },
  { key: 'kraPin', label: 'KRA PIN Certificate' },
  { key: 'drivingLicense', label: 'Driving License' },
  { key: 'guarantors', label: "Guarantor's Documents" },
]

// Standard VAT rate applied on the vehicle price (Kenya 16%).
export const VAT_RATE = 0.16

export const WORKSHOP_STATUS = ['Pending', 'In Progress', 'Completed']

export const NTSA_STATUS = ['Pending', 'Processing', 'Completed']

export const DISPATCH_STATUS = ['Pending', 'Completed']
