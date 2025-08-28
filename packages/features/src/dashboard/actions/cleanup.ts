"use server";

import {
  DeleteObjectsCommand,
  type DeleteObjectsCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import { cleanupAllData } from "@peas/database";

export async function cleanupAllDataAction(): Promise<{
  success: boolean;
  message: string;
  deletedCounts?: Record<string, number>;
  r2?: { deleted: number; errors: number };
  imagesRemoved?: number;
}> {
  try {
    console.warn("DANGEROUS OPERATION: Cleaning up all database data");

    const { deletedCounts } = await cleanupAllData();

    console.log("Database cleanup completed:", deletedCounts);

    // Optionally cleanup Cloudflare R2 "originals/" and "processed/" prefixes
    const r2Result = await cleanupR2Prefixes(["originals/", "processed/"]);

    return {
      success: true,
      message:
        "All data has been deleted from the database" +
        (r2Result ? " and R2 cleaned" : ""),
      deletedCounts,
      r2: r2Result || undefined,
      imagesRemoved: r2Result?.deleted,
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
  // Support Next.js runtime env (process.env) and .env.local with NEXT_PUBLIC_ fallback
  const accountId =
    process.env.R2_ACCOUNT_ID || process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;
  const bucketName =
    process.env.R2_BUCKET_NAME || process.env.NEXT_PUBLIC_R2_BUCKET_NAME;

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

      const objects = (listResp.Contents ?? []) as NonNullable<
        ListObjectsV2CommandOutput["Contents"]
      >;
      if (objects.length === 0) {
        continuationToken = listResp.IsTruncated
          ? listResp.NextContinuationToken
          : undefined;
        continue;
      }

      // Delete in chunks of up to 1000
      for (let i = 0; i < objects.length; i += 1000) {
        const chunk: typeof objects = objects.slice(i, i + 1000);
        const keys: string[] = chunk
          .map((o: (typeof objects)[number]) => o.Key)
          .filter(
            (k: string | undefined): k is string =>
              typeof k === "string" && k.length > 0
          );
        if (keys.length === 0) continue;

        const delResp: DeleteObjectsCommandOutput = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: keys.map((key: string) => ({ Key: key })) },
          })
        );

        totalDeleted += delResp.Deleted?.length || 0;
        totalErrors += delResp.Errors?.length || 0;
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
