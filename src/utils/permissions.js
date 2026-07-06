import { ROLES } from '../constants'

export const hasAccess = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(userRole)
}

export const isAdmin = (userRole) => userRole === ROLES.ADMIN

export const can = {
  manageUsers: (role) => role === ROLES.ADMIN,
  createUsers: (role) => role === ROLES.ADMIN,
  manageInventory: (role) => [ROLES.ADMIN, ROLES.SALES_AGENT].includes(role),
  manageSales: (role) => [ROLES.ADMIN, ROLES.SALES_AGENT, ROLES.FINANCE_OFFICER].includes(role),
  manageWorkshop: (role) => [ROLES.ADMIN, ROLES.WORKSHOP_OFFICER].includes(role),
  manageNtsa: (role) => [ROLES.ADMIN, ROLES.NTSA_OFFICER].includes(role),
  manageDispatch: (role) => [ROLES.ADMIN, ROLES.DISPATCH_OFFICER].includes(role),
  manageInquiries: (role) => [ROLES.ADMIN, ROLES.SALES_AGENT].includes(role),
  viewReports: (role) => [ROLES.ADMIN, ROLES.FINANCE_OFFICER].includes(role),
}
