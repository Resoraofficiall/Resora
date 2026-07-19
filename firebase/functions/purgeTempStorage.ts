/**
 * RESORA — Cloud Function: purgeTempStorage
 * Per Blueprint §6.3: "/temp/{uid}/{uploadSessionId}/ -- purged by
 * scheduled function after 24h."
 *
 * Runs on a schedule (once per hour is sufficient granularity for a
 * 24h retention window) and deletes any object under /temp/ whose
 * upload time exceeds 24 hours, regardless of whether it was ever
 * "claimed" (moved/copied) into a permanent path by the client.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';

if (!admin.apps.length) {
  admin.initializeApp();
}

const storage = getStorage();
const TEMP_PREFIX = 'temp/';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours, per §6.3

export const purgeTempStorage = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'Asia/Kolkata' },
  async () => {
    const bucket = storage.bucket();
    const now = Date.now();

    let deletedCount = 0;
    let scannedCount = 0;
    let pageToken: string | undefined;

    try {
      do {
        const [files, nextQuery] = await bucket.getFiles({
          prefix: TEMP_PREFIX,
          maxResults: 1000,
          pageToken,
        });

        pageToken = (nextQuery as { pageToken?: string } | undefined)?.pageToken;

        for (const file of files) {
          scannedCount += 1;

          const [metadata] = await file.getMetadata();
          const createdTime = metadata.timeCreated
            ? new Date(metadata.timeCreated).getTime()
            : 0;

          if (now - createdTime > MAX_AGE_MS) {
            try {
              await file.delete();
              deletedCount += 1;
            } catch (fileErr) {
              // Don't let one failed delete abort the whole sweep —
              // log and continue; the next hourly run will retry it.
              logger.error('purgeTempStorage: failed to delete file', {
                path: file.name,
                error: fileErr instanceof Error ? fileErr.message : String(fileErr),
              });
            }
          }
        }
      } while (pageToken);

      logger.info('purgeTempStorage: sweep complete', {
        scannedCount,
        deletedCount,
      });
    } catch (err) {
      logger.error('purgeTempStorage: sweep failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
);
