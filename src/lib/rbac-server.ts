import "server-only";
import { requireUser, type SessionUser } from "./auth";
import { can, ForbiddenError, type Capability } from "./rbac";

/** Require an authenticated user that holds the given capability. */
export async function requireCapability(
  cap: Capability
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, cap)) throw new ForbiddenError(cap);
  return user;
}
