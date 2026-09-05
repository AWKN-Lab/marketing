export const MARKETING_CAPABILITIES = [
  "workspace.read",
  "workspace.create",
  "workspace.write",
  "material.write",
  "task.create",
  "task.run",
  "feedback.write",
  "outcome.write",
  "evolution.review",
  "learning.manage",
  "team.manage",
] as const;

export const SESSION_ERROR_CODES = [
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "SESSION_UNAVAILABLE",
  "INVALID_SESSION_RESPONSE",
] as const;

export const MARKETING_SESSION_REFRESH_EVENT = "awkn-marketing:session-refresh";
export const MARKETING_SESSION_REFRESH_INTERVAL_MS = 60_000;

const SESSION_INVALIDATING_PRODUCT_ERRORS = new Set([
  "AUTH_REQUIRED",
  "FORBIDDEN",
  "WORKSPACE_REVOKED",
]);

export type MarketingCapability = (typeof MARKETING_CAPABILITIES)[number];
export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];
export type WorkspaceAccess = "read" | "write" | "admin";
export type WorkspaceGrant = { workspaceId: string; access: WorkspaceAccess };
export type MarketingSession = {
  mode: "local" | "platform";
  tenant: { id: string; name: string };
  actor: { id: string; name: string };
  roles: string[];
  capabilities: MarketingCapability[];
  workspaceGrants: WorkspaceGrant[];
  teamEnabled: boolean;
};

const LOCAL_CAPABILITIES: MarketingCapability[] = MARKETING_CAPABILITIES.filter((item) => item !== "team.manage");
export const LOCAL_MARKETING_SESSION: MarketingSession = {
  mode: "local",
  tenant: { id: "local", name: "Local P0" },
  actor: { id: "local-owner", name: "Local Owner" },
  roles: ["owner"],
  capabilities: LOCAL_CAPABILITIES,
  workspaceGrants: [],
  teamEnabled: false,
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalizeCapability(value: string): MarketingCapability | null {
  return (MARKETING_CAPABILITIES as readonly string[]).includes(value) ? value as MarketingCapability : null;
}

function normalizeWorkspaceAccess(value: unknown): WorkspaceAccess | null {
  const access = text(value).toLowerCase();
  return access === "read" || access === "write" || access === "admin" ? access : null;
}

function normalizeSessionMode(value: unknown): MarketingSession["mode"] | null {
  const mode = text(value).toLowerCase();
  if (!mode || mode === "platform") return "platform";
  if (mode === "local") return "local";
  return null;
}

function normalizeTeamEnabled(value: unknown): boolean | null {
  if (typeof value === "undefined") return true;
  return typeof value === "boolean" ? value : null;
}

export function sessionErrorCodeForStatus(status: number): SessionErrorCode {
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  return "SESSION_UNAVAILABLE";
}

export function shouldRefreshMarketingSessionForProductError(code: string | undefined) {
  return Boolean(code && SESSION_INVALIDATING_PRODUCT_ERRORS.has(code));
}

export function signalMarketingSessionRefresh(target?: EventTarget | null) {
  const resolvedTarget = target ?? (typeof window !== "undefined" ? window : null);
  if (!resolvedTarget || typeof Event === "undefined") return false;
  resolvedTarget.dispatchEvent(new Event(MARKETING_SESSION_REFRESH_EVENT));
  return true;
}

export function normalizeMarketingSession(input: unknown): MarketingSession | null {
  const root = record(input);
  if (!root) return null;
  const row = record(root.data) ?? root;
  const tenantRow = record(row.tenant);
  const actorRow = record(row.actor ?? row.user);
  const tenantId = text(row.tenant_id ?? tenantRow?.id);
  const actorId = text(row.actor_id ?? row.user_id ?? actorRow?.id);
  if (!tenantId || !actorId) return null;

  const mode = normalizeSessionMode(row.mode);
  const teamEnabled = normalizeTeamEnabled(row.team_enabled ?? row.teamEnabled);
  if (!mode || teamEnabled === null) return null;

  const rawCapabilities = strings(row.capabilities);
  const normalizedCapabilities = rawCapabilities.map(normalizeCapability);
  if (normalizedCapabilities.some((value) => value === null)) return null;
  const capabilities = [...new Set(normalizedCapabilities as MarketingCapability[])];

  const rawGrants = row.workspace_grants ?? row.workspaceGrants ?? [];
  if (!Array.isArray(rawGrants)) return null;
  const workspaceGrants: WorkspaceGrant[] = [];
  const seenWorkspaceIds = new Set<string>();
  for (const item of rawGrants) {
    const grant = record(item);
    const workspaceId = text(grant?.workspace_id ?? grant?.workspaceId);
    const access = normalizeWorkspaceAccess(grant?.access);
    if (!workspaceId || !access || seenWorkspaceIds.has(workspaceId)) return null;
    seenWorkspaceIds.add(workspaceId);
    workspaceGrants.push({ workspaceId, access });
  }

  return {
    mode,
    tenant: { id: tenantId, name: text(tenantRow?.name ?? row.tenant_name) || tenantId },
    actor: { id: actorId, name: text(actorRow?.name ?? actorRow?.display_name ?? row.actor_name) || actorId },
    roles: [...new Set(strings(row.roles))],
    capabilities,
    workspaceGrants,
    teamEnabled,
  };
}

export function hasMarketingCapability(session: MarketingSession, capability: MarketingCapability) {
  return session.capabilities.includes(capability);
}

const accessRank: Record<WorkspaceAccess, number> = { read: 1, write: 2, admin: 3 };

export function hasWorkspaceAccess(session: MarketingSession, workspaceId: string, required: WorkspaceAccess) {
  if (session.mode === "local") return true;
  const grant = session.workspaceGrants.find((item) => item.workspaceId === workspaceId);
  return Boolean(grant && accessRank[grant.access] >= accessRank[required]);
}

export function canMarketingAction(
  session: MarketingSession,
  capability: MarketingCapability,
  workspaceId?: string,
  required: WorkspaceAccess = "write",
) {
  if (!hasMarketingCapability(session, capability)) return false;
  return workspaceId ? hasWorkspaceAccess(session, workspaceId, required) : true;
}

export function canReadWorkspace(session: MarketingSession, workspaceId: string) {
  return canMarketingAction(session, "workspace.read", workspaceId, "read");
}

export function filterReadableWorkspaceItems<T>(session: MarketingSession, items: T[], workspaceIdOf: (item: T) => string) {
  return items.filter((item) => canReadWorkspace(session, workspaceIdOf(item)));
}
