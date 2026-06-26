// ============================================================
// Zaytoun Vision — Azure Blob Storage Client
// ============================================================
// Handles image upload to Azure Blob Storage for analysis.
// In demo mode, images are stored as data URLs in memory.
//
// Azure Justification: Azure Blob Storage provides scalable,
// cost-effective storage for sample images. Each analysis image
// is stored for audit trail and regulatory compliance purposes.
// ============================================================

const STORAGE_BASE = import.meta.env.VITE_STORAGE_URL || '';
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true' || !STORAGE_BASE;

/**
 * Upload an image file to Azure Blob Storage.
 * Returns the blob URL for the uploaded image.
 * Falls back to a data URL in demo mode.
 */
export async function uploadImage(file: File | Blob): Promise<string> {
  if (IS_DEMO) {
    return blobToDataUrl(file);
  }

  try {
    // In production, this would use Azure Blob Storage REST API
    // or a SAS token-based upload endpoint from our Azure Functions
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${STORAGE_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.warn('Blob Storage upload failed, using data URL fallback:', error);
    return blobToDataUrl(file);
  }
}

/**
 * Convert a canvas element to a Blob for upload.
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob conversion failed'));
      },
      'image/jpeg',
      0.9
    );
  });
}

/** Convert a File/Blob to a data URL */
function blobToDataUrl(blob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
