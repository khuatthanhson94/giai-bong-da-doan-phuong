import { v2 as cloudinary } from 'cloudinary';

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Cloudinary] Configured successfully.');
} else {
  console.warn('[Cloudinary] Missing credentials. Cloudinary upload disabled.');
}

/**
 * Uploads a file to Cloudinary
 * @param {string} filepath Absolute path to local file
 * @param {string} filename Original filename or name to use
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadToCloudinary(filepath, filename) {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  // Custom folder to organize files in Cloudinary
  const folder = 'giai-bong-da-doan-phuong';
  const publicId = filename ? filename.split('.')[0] : undefined;

  const result = await cloudinary.uploader.upload(filepath, {
    folder,
    public_id: publicId,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    public_id: result.public_id,
  };
}

/**
 * Deletes a file from Cloudinary by public ID or URL
 * @param {string} identifier public_id or full URL of the resource
 * @returns {Promise<any>}
 */
export async function deleteFromCloudinary(identifier) {
  if (!isConfigured) return;

  try {
    let publicId = identifier;
    if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
      // Extract public_id from Cloudinary URL:
      // Format: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<folder>/<public_id>.<ext>
      const match = identifier.match(/\/image\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (match && match[1]) {
        publicId = match[1];
      } else {
        console.warn(`[Cloudinary] Could not parse public_id from URL: ${identifier}`);
        return;
      }
    }

    console.log(`[Cloudinary] Deleting resource: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    console.error(`[Cloudinary] Failed to delete resource ${identifier}:`, err.message);
  }
}

export { isConfigured };
