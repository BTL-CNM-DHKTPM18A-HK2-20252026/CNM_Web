export interface PresignedUpload {
  presignedUrl: string;
  s3Url: string;
  s3Key: string;
}

export function normalizeS3PublicUrl(presignedUrl: string) {
  return presignedUrl.split('?')[0];
}
