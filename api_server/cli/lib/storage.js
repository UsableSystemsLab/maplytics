import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET_NAME, initBucket } from "../../configs/s3Client.js";

export async function uploadToS3(csvContent, key) {
  await initBucket();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: csvContent,
      ContentType: "text/csv",
    })
  );

  return { bucket: BUCKET_NAME, key };
}

export async function downloadFromS3(key) {
  await initBucket();

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );

  return response.Body.transformToString("utf-8");
}

export async function uploadGeoJSONToS3(content, key) {
  await initBucket();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: "application/geo+json",
    })
  );

  return { bucket: BUCKET_NAME, key };
}
