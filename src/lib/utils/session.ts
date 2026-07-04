import { auth } from "../auth"
import { Permission, hasPermission } from "../permissions"
import { UserRole } from "../models/User"

export async function getSession() {
  return auth()
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Non authentifié")
  }
  return user
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth()
  if (!hasPermission(user.role as UserRole, permission)) {
    throw new Error("Permission refusée")
  }
  return user
}

export function checkPermission(userRole: UserRole, permission: Permission): boolean {
  return hasPermission(userRole, permission)
}
