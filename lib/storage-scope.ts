import type { MarketingSession } from "@/lib/product-session";

export type StorageScope =
  | { mode: "local" }
  | { mode: "platform"; tenantId: string; actorId: string };

let activeScope: StorageScope = { mode: "local" };

export function storageScopeForSession(session: MarketingSession): StorageScope {
  return session.mode === "platform"
    ? { mode: "platform", tenantId: session.tenant.id, actorId: session.actor.id }
    : { mode: "local" };
}

export function setActiveStorageScope(session: MarketingSession) {
  activeScope = storageScopeForSession(session);
}

export function getActiveStorageScope() {
  return activeScope;
}

function scopePrefix(scope: StorageScope) {
  if (scope.mode === "local") return "";
  return `marketing:scope:${encodeURIComponent(scope.tenantId)}:${encodeURIComponent(scope.actorId)}:`;
}

export function scopedStorageKeyForScope(logicalKey: string, scope: StorageScope) {
  if (!logicalKey.startsWith("marketing:") || scope.mode === "local") return logicalKey;
  return `${scopePrefix(scope)}${logicalKey.slice("marketing:".length)}`;
}

export function scopedStorageKey(logicalKey: string) {
  return scopedStorageKeyForScope(logicalKey, activeScope);
}

export function logicalStorageKeyForScope(physicalKey: string, scope: StorageScope): string | null {
  if (scope.mode === "local") return physicalKey.startsWith("marketing:") && !physicalKey.startsWith("marketing:scope:") ? physicalKey : null;
  const prefix = scopePrefix(scope);
  return physicalKey.startsWith(prefix) ? `marketing:${physicalKey.slice(prefix.length)}` : null;
}

export function logicalStorageKey(physicalKey: string) {
  return logicalStorageKeyForScope(physicalKey, activeScope);
}
