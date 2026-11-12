import {
  DeleteObjectsCommand,
  type DeleteObjectsCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";

const DELETE_BATCH_SIZE = 1000;

export interface R2CleanupResult {
  deleted: number;
  errors: number;
}

/**
 * Deletes everything under the given Cloudflare R2 prefixes. Returns null when
 * R2 is not configured.
 */
export async function cleanupR2Prefixes(
  prefixes: string[]
): Promise<R2CleanupResult | null> {
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
    credentials: { accessKeyId, secretAccessKey },
  });

  let deleted = 0;
  let errors = 0;

  for (const prefix of prefixes) {
    let continuationToken: string | undefined = undefined;
    do {
      const listResponse: ListObjectsV2CommandOutput = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const keys = (listResponse.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => typeof key === "string" && key !== "");

      for (let start = 0; start < keys.length; start += DELETE_BATCH_SIZE) {
        const chunk = keys.slice(start, start + DELETE_BATCH_SIZE);
        const deleteResponse: DeleteObjectsCommandOutput = await client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: chunk.map((key) => ({ Key: key })) },
          })
        );

        deleted += deleteResponse.Deleted?.length ?? 0;
        errors += deleteResponse.Errors?.length ?? 0;
      }

      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }

  console.log(`R2 cleanup completed: deleted=${deleted}, errors=${errors}`);
  return { deleted, errors };
}
