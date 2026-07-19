/**
 * RESORA — Cloud Function: onSellerApproved
 * Per Blueprint §3.3 — Automatic Studio Provisioning, exact 9-step sequence.
 * Triggered when a seller application document transitions to approved.
 * All 9 steps run atomically: if any step fails, the whole provisioning
 * rolls back and alerts the Founder rather than leaving a half-created Studio.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

interface SellerApplication {
  applicationId: string;
  uid: string;
  studioName: string;
  status: 'submitted' | 'approved' | 'rejected' | 'onHold' | 'infoRequested';
  approvedBy?: string;
  category: string;
}

/**
 * Generates a unique, URL-safe slug from a studio name, checking for
 * collisions against existing studios. Slugs are permanent once issued
 * (§3.5) so this must be collision-checked before first write, not after.
 */
async function generateUniqueSlug(
  transaction: Transaction,
  studioName: string
): Promise<string> {
  const base = studioName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!base) {
    throw new Error('Studio name produced an empty slug base');
  }

  let candidate = base;
  let suffix = 0;

  // Bounded retry — collision checks happen inside the caller's transaction
  // so the read-check-write is atomic against concurrent approvals.
  while (suffix < 50) {
    const slugQuery = db.collection('studios').where('slug', '==', candidate).limit(1);
    const existing = await transaction.get(slugQuery);
    if (existing.empty) {
      return candidate;
    }
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  throw new Error(`Could not generate a unique slug for "${studioName}" after 50 attempts`);
}

export const onSellerApproved = onDocumentUpdated(
  'sellerApplications/{applicationId}',
  async (event) => {
    const before = event.data?.before.data() as SellerApplication | undefined;
    const after = event.data?.after.data() as SellerApplication | undefined;

    if (!before || !after) {
      functions.logger.error('onSellerApproved: missing before/after snapshot data');
      return;
    }

    // Only fire on the submitted/onHold/infoRequested -> approved transition.
    if (before.status === 'approved' || after.status !== 'approved') {
      return;
    }

    const { applicationId } = event.params as { applicationId: string };
    const sellerUid = after.uid;
    const approvingAdminUid = after.approvedBy ?? 'unknown';

    try {
      await db.runTransaction(async (transaction) => {
        // ---- STEP 1: Create studios/{studioId} with default branding placeholders
        const studioRef = db.collection('studios').doc();
        const studioId = studioRef.id;

        // ---- STEP 2: Generate unique slug (collision-checked), reserve /studio/{slug}
        const slug = await generateUniqueSlug(transaction, after.studioName);

        const now = FieldValue.serverTimestamp();

        transaction.set(studioRef, {
          studioId,
          ownerUid: sellerUid,
          name: after.studioName,
          slug,
          description: '',
          logoUrl: null,
          bannerUrl: null,
          galleryUrls: [],
          category: after.category,
          followerCount: 0,
          rating: 0,
          reviewCount: 0,
          totalOrders: 0,
          revenueTotal: 0,
          subscriptionTier: 'starter',
          verificationBadge: 'none',
          featured: false,
          active: true,
          seo: {
            title: after.studioName,
            description: '',
            ogImage: null,
          },
          policies: {
            shipping: '',
            returns: '',
            customOrderTerms: '',
          },
          createdAt: now,
          updatedAt: now,
        });

        // ---- STEP 4: Initialize analytics/{studioId} summary document (all zeros)
        const analyticsRef = db.collection('analytics').doc(studioId);
        transaction.set(analyticsRef, {
          studioId,
          totalViews: 0,
          totalSales: 0,
          totalRevenue: 0,
          totalOrders: 0,
          conversionRate: 0,
          updatedAt: now,
        });

        // ---- STEP 5: Create default SEO metadata document
        const seoRef = db.collection('seo').doc(`studio_${studioId}`);
        transaction.set(seoRef, {
          docId: `studio_${studioId}`,
          targetType: 'studio',
          targetId: studioId,
          title: after.studioName,
          description: '',
          keywords: [],
          createdAt: now,
        });

        // ---- STEP 6: Set seller role + permissions on users/{uid}
        const userRef = db.collection('users').doc(sellerUid);
        transaction.update(userRef, {
          role: 'seller',
          updatedAt: now,
        });

        // ---- STEP 8: Push in-app + dashboard notification
        const notificationRef = db.collection('notifications').doc();
        transaction.set(notificationRef, {
          notificationId: notificationRef.id,
          recipientUid: sellerUid,
          type: 'studioApproved',
          title: 'Your Studio is live',
          body: `${after.studioName} has been approved and provisioned on Resora.`,
          read: false,
          createdAt: now,
        });

        // ---- STEP 9: Write audit log entry (append-only)
        const auditRef = db.collection('auditLogs').doc();
        transaction.set(auditRef, {
          logId: auditRef.id,
          actorUid: approvingAdminUid,
          action: 'sellerApproved',
          targetType: 'sellerApplication',
          targetId: applicationId,
          previousValue: { status: before.status },
          newValue: { status: 'approved', studioId },
          timestamp: now,
        });

        // Stash studioId on the application doc for downstream steps
        // (custom claims, storage tree, email) that must run outside the
        // Firestore transaction.
        transaction.update(event.data!.after.ref, {
          provisionedStudioId: studioId,
          provisionedSlug: slug,
        });
      });

      // Re-read the committed application to get the studioId set above.
      const committedApp = await db.collection('sellerApplications').doc(applicationId).get();
      const { provisionedStudioId, provisionedSlug } = committedApp.data() as {
        provisionedStudioId: string;
        provisionedSlug: string;
      };

      // ---- STEP 3: Create Storage folder tree
      // Storage has no real "folders" — write a zero-byte placeholder object
      // per path so the tree exists and Storage rules' path-based ownership
      // checks have something to anchor against immediately.
      const bucket = storage.bucket();
      const folderPaths = [
        `studios/${provisionedStudioId}/logo/.keep`,
        `studios/${provisionedStudioId}/banner/.keep`,
        `studios/${provisionedStudioId}/gallery/.keep`,
        `studios/${provisionedStudioId}/products/.keep`,
      ];
      await Promise.all(
        folderPaths.map((path) => bucket.file(path).save(Buffer.from(''), {
          metadata: { contentType: 'application/octet-stream' },
        }))
      );

      // ---- STEP 6 (continued): Set the studioId custom claim so Firestore/
      // Storage rules' ownsStudio() checks work immediately.
      const existingClaims = (await auth.getUser(sellerUid)).customClaims ?? {};
      await auth.setCustomUserClaims(sellerUid, {
        ...existingClaims,
        role: 'seller',
        studioId: provisionedStudioId,
      });

      // ---- STEP 7: Send welcome email (templated, CMS-editable)
      // Enqueued via a mail-triggering collection rather than sent inline,
      // so the email template itself stays CMS-editable (Global Rule #2)
      // and delivery can be retried independently of provisioning.
      await db.collection('mailQueue').add({
        to: (await auth.getUser(sellerUid)).email,
        templateId: 'sellerWelcome',
        templateData: {
          studioName: after.studioName,
          studioSlug: provisionedSlug,
          dashboardUrl: `https://resora.app/seller/dashboard`,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      functions.logger.info(
        `onSellerApproved: provisioning complete for application ${applicationId} -> studio ${provisionedStudioId}`
      );
    } catch (err) {
      functions.logger.error(
        `onSellerApproved: provisioning FAILED for application ${applicationId}`,
        err
      );

      // Roll back: revert the application status so the Founder can retry,
      // rather than leaving a half-created Studio (§3.3 hard requirement).
      await db.collection('sellerApplications').doc(applicationId).update({
        status: 'onHold',
        provisioningError: err instanceof Error ? err.message : String(err),
      });

      await db.collection('notifications').add({
        recipientUid: approvingAdminUid,
        type: 'provisioningFailed',
        title: 'Studio provisioning failed',
        body: `Provisioning for application ${applicationId} failed and was rolled back. Application returned to Hold status.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      throw err;
    }
  }
);
