export function getCloudinaryPublicId(url: string) {
  const uploadIndex = url.indexOf("/upload/");

  if (uploadIndex === -1) {
    throw new Error("Invalid Cloudinary URL");
  }

  const afterUpload = url.substring(uploadIndex + 8);

  // Remove version prefix, if present.
  const withoutVersion = afterUpload.replace(/^v\d+\//, "");

  // Remove file extension.
  return withoutVersion.replace(/\.[^/.]+$/, "");
}