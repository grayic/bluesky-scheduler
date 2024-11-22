import { BskyAgent, BlobRef } from '@atproto/api';

export const MAX_IMAGE_SIZE = 1000000; // 1MB in bytes

export async function sanitizeImage(file: File): Promise<{ 
  base64: string;
  mimeType: string;
  size: number;
}> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE / 1000000}MB`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          base64: reader.result,
          mimeType: file.type,
          size: file.size
        });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImageBlob(
  agent: BskyAgent, 
  imageData: { base64: string; mimeType: string }
): Promise<BlobRef> {
  try {
    // Convert base64 to Uint8Array
    const base64Data = imageData.base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    // Use the com.atproto.repo.uploadBlob endpoint directly
    const response = await agent.api.com.atproto.repo.uploadBlob(byteArrays, {
      encoding: imageData.mimeType,
    });

    if (!response.success || !response.data.blob) {
      throw new Error('Failed to upload image: No blob reference received');
    }

    return response.data.blob;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload image');
  }
}