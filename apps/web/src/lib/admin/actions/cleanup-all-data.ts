"use server";

import {
  DeleteObjectsCommand,
  type DeleteObjectsCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { cleanupAllData } from "@peas/database";
import type { CleanupAllDataResult } from "@peas/features";

import { getAuthOrRedirect } from "../../auth/queries/get-auth-or-redirect";

export async function cleanupAllDataAction(): Promise<CleanupAllDataResult> {
  const { user } = await getAuthOrRedirect();

  if (user.userType !== "ADMIN") {
    return {
      success: false,
      message: "Only admins can delete all data",
    };
  }

  try {
    console.warn(
      `DANGEROUS OPERATION: ${user.email} is cleaning up all database data`
    );

    const { deletedCounts } = await cleanupAllData();

    console.log("Database cleanup completed:", deletedCounts);

    const r2Result = await cleanupR2Prefixes(["originals/", "processed/"]);

    return {
      success: true,
      message:
        "All data has been deleted from the database" +
        (r2Result ? " and R2 cleaned" : ""),
      deletedCounts,
    };
  } catch (error) {
    console.error("Failed to cleanup database:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Clean up Cloudflare R2 by deleting everything under the given prefixes.
 * Safe to call when R2 is not configured; it will no-op in that case.
 */
async function cleanupR2Prefixes(
  prefixes: string[]
): Promise<{ deleted: number; errors: number } | null> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.log("R2 not configured; skipping R2 cleanup");
    return null;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const prefix of prefixes) {
    let continuationToken: string | undefined = undefined;
    do {
      const listResp: ListObjectsV2CommandOutput = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const keys = (listResp.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => typeof key === "string" && key !== "");

      // DeleteObjects accepts at most 1000 keys per request
      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000);

        const delResp: DeleteObjectsCommandOutput = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: chunk.map((key) => ({ Key: key })) },
          })
        );

        totalDeleted += delResp.Deleted?.length ?? 0;
        totalErrors += delResp.Errors?.length ?? 0;
      }

      continuationToken = listResp.IsTruncated
        ? listResp.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }

  console.log(
    `R2 cleanup completed: deleted=${totalDeleted}, errors=${totalErrors}`
  );
  return { deleted: totalDeleted, errors: totalErrors };
}
