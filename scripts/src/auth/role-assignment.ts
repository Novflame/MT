import type { Role } from "@/auth/permissions"

const staffRoles: Role[] = ["deputy", "head_of_class", "head_of_department", "teacher"]

/** A deputy can manage operational staff roles but cannot create another deputy or principal. */
export function canAssignStaffRole(actorRole: string, targetRole: string): boolean {
  if (!staffRoles.includes(targetRole as Role)) return false
  if (actorRole === "principal") return true
  return actorRole === "deputy" && ["teacher", "head_of_class", "head_of_department"].includes(targetRole)
}
