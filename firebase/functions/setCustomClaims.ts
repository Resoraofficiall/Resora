/**
 * RESORA — Cloud Function: setCustomClaims
 * Per Blueprint §6.5 (studioId custom claim set at approval time),
 * §16.2 (Founder/admin accounts require an explicit allow-list custom
 * claim — being logged in is never sufficient to reach /admin/*), and
 * §16.3 (RBAC matrix).
 *
 * This is the single, authoritative place custom claims are ever set.
 * onSellerApproved.ts calls the exported helper directly (same-process)
 * rather than re-implementing claim logic inline, so there is exactly
 * one code path that can grant elevated roles.
 *
 * Callable version is restricted to Founder/superAdmin only — no other
 * role may invoke it, since granting a role/studioId claim is itself a
 * security-critical action.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = getAuth();
const db = getFirestore();

export type ResoraRole =
  | 'visitor'
  | 'customer'
  | 'seller'
  | 'support'
  | 'contentManager'
  | 'financeManager'
  | 'marketingManager'
  | 'founder'
  | 'superAdmin';

// Roles that require an explicit allow-list entry to be granted at all —
// per §16.2, no toggle can silently make a regular account an admin.
const ALLOW_LISTED_ROLES: ResoraRole[] = [
  'founder',
  'superAdmin',
  'support',
  'contentManager',
  'financeManager',
  'marketingManager',
];

/**
 * Internal helper — used directly by onSellerApproved.ts and other
 * server-side triggers. Not exported as a callable; only the wrapped
 * callable below is externally invokable, and only by an existing admin.
 */
export async function applyCustomClaims(
  targetUid: string,
  claims: { role: ResoraRole; studioId?: string },
  actorUid: string
): Promise<void> {
  if (ALLOW_LISTED_ROLES.includes(claims.role)) {
    const allowListSnap = await db
      .collection('settings')
      .doc('adminAllowList')
      .get();
    const allowedUids: string[] = allowListSnap.exists
      ? (allowListSnap.data()!.uids as string[]) ?? []
      : [];

    if (!allowedUids.includes(targetUid)) {
      throw new HttpsError(
        'permission-denied',
        `UID ${targetUid} is not on the admin allow-list; cannot grant role "${claims.role}".`
      );
    }
  }

  const existingUser = await auth.getUser(targetUid);
  const existingClaims = existingUser.customClaims ?? {};

  const newClaims: Record<string, unknown> = {
    ...existingClaims,
    role: claims.role,
  };

  if (claims.studioId) {
    newClaims.studioId = claims.studioId;
  }

  await auth.setCustomUserClaims(targetUid, newClaims);

  // Firestore users/{uid}.role is kept in sync so UI reads (which should
  // never read the auth token directly for display purposes) stay
  // consistent with the enforced claim.
  await db.collection('users').doc(targetUid).update({
    role: claims.role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('auditLogs').add({
    actorUid,
    action: 'customClaimsSet',
    targetType: 'user',
    targetId: targetUid,
    previousValue: { role: existingClaims.role ?? null },
    newValue: { role: claims.role, studioId: claims.studioId ?? null },
    timestamp: FieldValue.serverTimestamp(),
  });

  logger.info('setCustomClaims: claims applied', {
    targetUid,
    role: claims.role,
    actorUid,
  });
}

interface SetCustomClaimsRequest {
  targetUid: string;
  role: ResoraRole;
  studioId?: string;
}

export const setCustomClaims = onCall(async (request) => {
  const actorUid = request.auth?.uid;
  const actorRole = request.auth?.token?.role as string | undefined;

  if (!actorUid) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }

  // Only Founder/superAdmin may invoke this callable directly. Seller-role
  // grants happen exclusively through onSellerApproved.ts's internal call
  // to applyCustomClaims, not through this externally callable entry point.
  if (actorRole !== 'founder' && actorRole !== 'superAdmin') {
    throw new HttpsError('permission-denied', 'Only Founder/superAdmin may modify roles.');
  }

  const data = request.data as SetCustomClaimsRequest;
  if (!data?.targetUid || !data?.role) {
    throw new HttpsError('invalid-argument', 'targetUid and role are required.');
  }

  await applyCustomClaims(data.targetUid, { role: data.role, studioId: data.studioId }, actorUid);

  return { success: true, targetUid: data.targetUid, role: data.role };
});
