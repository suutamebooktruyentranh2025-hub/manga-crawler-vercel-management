const PACKAGE_APP = 'app';
const PACKAGE_CATALOG_Y1 = 'catalog_y1';
const PACKAGE_CATALOG_Y2 = 'catalog_y2';

function isAdminSession(session) {
  if (session?.isAdmin === true) return true;
  return String(session?.userType || '').trim().toLowerCase() === 'admin';
}

function isEntitlementActive(row, nowMs = Date.now()) {
  if (!row) return false;
  const raw = row.expiresAt ?? row.expires_at;
  if (raw == null || raw === '') return true;
  const expiresMs = Date.parse(raw);
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs > nowMs;
}

function legacyEntitlementsForUserType(userType) {
  const normalized_type = String(userType || '').trim().toLowerCase();
  if (normalized_type === 'premium member') {
    return [
      { packageKey: PACKAGE_APP, expiresAt: null },
      { packageKey: PACKAGE_CATALOG_Y1, expiresAt: null },
      { packageKey: PACKAGE_CATALOG_Y2, expiresAt: null },
    ];
  }
  if (normalized_type === 'super member') {
    return [
      { packageKey: PACKAGE_APP, expiresAt: null },
      { packageKey: PACKAGE_CATALOG_Y1, expiresAt: null },
    ];
  }
  if (normalized_type === 'member') {
    return [{ packageKey: PACKAGE_APP, expiresAt: null }];
  }
  return [];
}

function sessionEntitlementRows(session) {
  if (Array.isArray(session?.entitlements)) return session.entitlements;
  return legacyEntitlementsForUserType(session?.userType);
}

function hasActivePackage(session, packageKey, nowMs = Date.now()) {
  if (isAdminSession(session)) return true;
  const entitlement_rows = sessionEntitlementRows(session);
  return entitlement_rows.some((row) => {
    const entitlement_key = String(row?.packageKey || row?.package_key || '');
    return entitlement_key === packageKey && isEntitlementActive(row, nowMs);
  });
}

function hasApp(session, nowMs) {
  return hasActivePackage(session, PACKAGE_APP, nowMs);
}
function hasCatalogY1(session, nowMs) {
  return hasActivePackage(session, PACKAGE_CATALOG_Y1, nowMs);
}
function hasCatalogY2(session, nowMs) {
  return hasActivePackage(session, PACKAGE_CATALOG_Y2, nowMs);
}

function defaultExpiresAtIso(packageKey, now = new Date()) {
  if (packageKey === PACKAGE_APP) return null;
  const expiry_date = new Date(now);
  expiry_date.setFullYear(expiry_date.getFullYear() + 1);
  return expiry_date.toISOString();
}

export {
  PACKAGE_APP,
  PACKAGE_CATALOG_Y1,
  PACKAGE_CATALOG_Y2,
  isEntitlementActive,
  hasActivePackage,
  sessionEntitlementRows,
  hasApp,
  hasCatalogY1,
  hasCatalogY2,
  defaultExpiresAtIso,
};
