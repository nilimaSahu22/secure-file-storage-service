import { S3Client, HeadObjectCommand, DeleteObjectCommand, HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import { createPresignedPost, PresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../lib/env";

export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB
const PRESIGNED_POST_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const PRESIGNED_GET_EXPIRY_SECONDS = 5 * 60; // 5 minutes

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function generatePresignedPost(
  key: string,
  mimeType: string
): Promise<PresignedPost> {
  return createPresignedPost(s3Client, {
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, MAX_UPLOAD_BYTES],
      ["eq", "$Content-Type", mimeType],
    ],
    Fields: {
      "Content-Type": mimeType,
    },
    Expires: PRESIGNED_POST_EXPIRY_SECONDS,
  });
}

export async function headObject(key: string): Promise<HeadObjectCommandOutput> {
  return s3Client.send(new HeadObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
}

export async function generatePresignedGetUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_GET_EXPIRY_SECONDS });
}

export async function deleteObject(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }));
}
