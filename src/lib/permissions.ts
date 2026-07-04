import { UserRole } from "./models/User"

export type Permission =
  | "orders:view"
  | "orders:create"
  | "orders:edit"
  | "orders:delete"
  | "orders:import"
  | "orders:export"
  | "shipments:view"
  | "shipments:create"
  | "shipments:edit"
  | "shipments:delete"
  | "shipments:sync"
  | "shipments:print"
  | "scan:sort"
  | "scan:handover"
  | "scan:return"
  | "preparation:view"
  | "preparation:process"
  | "recettes:view"
  | "recettes:create"
  | "recettes:confirm"
  | "recettes:undo"
  | "recettes:reconcile"
  | "returns:view"
  | "returns:inspect"
  | "returns:restock"
  | "inventory:view"
  | "inventory:adjust"
  | "analytics:view"
  | "settings:view"
  | "settings:edit"
  | "users:view"
  | "users:create"
  | "users:edit"
  | "users:delete"
  | "audit:view"
  | "navex:view-logs"
  | "navex:configure"
  | "dashboard:view"

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "orders:view", "orders:create", "orders:edit", "orders:delete",
    "orders:import", "orders:export",
    "shipments:view", "shipments:create", "shipments:edit", "shipments:delete",
    "shipments:sync", "shipments:print",
    "scan:sort", "scan:handover", "scan:return",
    "preparation:view", "preparation:process",
    "recettes:view", "recettes:create", "recettes:confirm", "recettes:undo", "recettes:reconcile",
    "returns:view", "returns:inspect", "returns:restock",
    "inventory:view", "inventory:adjust",
    "analytics:view",
    "settings:view", "settings:edit",
    "users:view", "users:create", "users:edit", "users:delete",
    "audit:view",
    "navex:view-logs", "navex:configure",
    "dashboard:view",
  ],
  ADMIN: [
    "orders:view", "orders:create", "orders:edit", "orders:delete",
    "orders:import", "orders:export",
    "shipments:view", "shipments:create", "shipments:edit", "shipments:delete",
    "shipments:sync", "shipments:print",
    "scan:sort", "scan:handover", "scan:return",
    "preparation:view", "preparation:process",
    "recettes:view", "recettes:create", "recettes:confirm", "recettes:reconcile",
    "returns:view", "returns:inspect", "returns:restock",
    "inventory:view", "inventory:adjust",
    "analytics:view",
    "settings:view", "settings:edit",
    "users:view", "users:create", "users:edit",
    "audit:view",
    "navex:view-logs", "navex:configure",
    "dashboard:view",
  ],
  MANAGER: [
    "orders:view", "orders:edit", "orders:export",
    "shipments:view", "shipments:create", "shipments:edit",
    "shipments:sync", "shipments:print",
    "scan:sort", "scan:handover",
    "preparation:view", "preparation:process",
    "recettes:view",
    "returns:view", "returns:inspect", "returns:restock",
    "inventory:view",
    "analytics:view",
    "settings:view",
    "dashboard:view",
  ],
  WAREHOUSE_OPERATOR: [
    "orders:view",
    "shipments:view", "shipments:print",
    "scan:sort", "scan:handover", "scan:return",
    "preparation:view", "preparation:process",
    "returns:view", "returns:inspect",
    "inventory:view",
    "dashboard:view",
  ],
  FINANCE: [
    "orders:view", "orders:export",
    "shipments:view",
    "recettes:view", "recettes:create", "recettes:confirm", "recettes:reconcile",
    "returns:view",
    "analytics:view",
    "settings:view",
    "dashboard:view",
  ],
  VIEWER: [
    "orders:view",
    "shipments:view",
    "recettes:view",
    "returns:view",
    "analytics:view",
    "dashboard:view",
  ],
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function getAllPermissions(): Permission[] {
  return ROLE_PERMISSIONS.SUPER_ADMIN
}
