import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config is automatically picked up from process.env.CLOUDINARY_URL 
// if it exists, or you can configure it explicitly.
// We configure it lazily to ensure process.env is fully loaded from dotenv.

let isConfigured = false;

function configureCloudinary() {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isConfigured = true;
  }
}

/**
 * Uploads a base64 image string to Cloudinary
 * @param fileBase64 The base64 string of the file
 * @param folder The folder in Cloudinary to store the image
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(fileBase64: string, folder: string = 'team') {
  const fileStr = fileBase64.startsWith('data:') 
    ? fileBase64 
    : `data:image/png;base64,${fileBase64}`;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // If credentials are mock, placeholder or not set, use data URI fallback
  const isMockConfig = !cloudName || cloudName === 'demo' || !apiKey || apiKey === '123456789' || !apiSecret || apiSecret === 'abcdefghijklmnop';

  if (isMockConfig) {
    console.warn('[Cloudinary]: Mock or unconfigured credentials detected. Storing as data URI fallback.');
    return { url: fileStr, fileId: `local-${Date.now()}` };
  }

  try {
    configureCloudinary();

    const response = await cloudinary.uploader.upload(fileStr, {
      folder: folder,
      resource_type: 'auto'
    });
    
    return { url: response.secure_url, fileId: response.public_id };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    console.warn('[Cloudinary]: Upload failed. Falling back to data URI.');
    return { url: fileStr, fileId: `fallback-${Date.now()}` };
  }
}
