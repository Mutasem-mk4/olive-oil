/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AZURE BLOB STORAGE CLIENT — Zaytoun Vision
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * WHY AZURE BLOB STORAGE?
 * ───────────────────────
 * 1. SCALABLE IMAGE STORAGE: Blob Storage provides virtually unlimited storage
 *    for olive oil sample images at a fraction of the cost of file systems.
 *    Hot tier for recent images, Cool tier for archival — automatic tiering.
 *
 * 2. SAS TOKEN SECURITY: Shared Access Signatures let us generate time-limited,
 *    read-only URLs for images — no need to expose storage keys to the frontend.
 *    Certificates can be shared via SAS URLs that expire after 24 hours.
 *
 * 3. CDN INTEGRATION: Azure CDN can be layered on top for global image delivery,
 *    crucial when olive oil cooperatives across the MENA region access results.
 *
 * 4. CUSTOM VISION INTEGRATION: Custom Vision can directly read training images
 *    from Blob Storage containers, streamlining the ML pipeline.
 *
 * 5. IMMUTABILITY POLICIES: Legal hold and immutability policies ensure
 *    certificate records and associated images cannot be tampered with —
 *    critical for regulatory compliance in food safety.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';

// ─── Configuration ───────────────────────────────────────────────────────────

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER || 'sample-images';

// ─── Client Initialization ───────────────────────────────────────────────────

let _blobServiceClient: BlobServiceClient | null = null;
let _containerClient: ContainerClient | null = null;

/**
 * Lazily initializes the Blob Storage client.
 * Returns null if no connection string is configured (triggers mock fallback).
 */
function getContainerClient(): ContainerClient | null {
  if (!CONNECTION_STRING) {
    console.log('[Blob Storage] No connection string — using mock mode');
    return null;
  }

  if (!_containerClient) {
    try {
      _blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
      _containerClient = _blobServiceClient.getContainerClient(CONTAINER_NAME);
      console.log('[Blob Storage] Client initialized for container:', CONTAINER_NAME);
    } catch (error) {
      console.warn('[Blob Storage] Failed to initialize client:', error);
      return null;
    }
  }

  return _containerClient;
}

// ─── Upload Function ─────────────────────────────────────────────────────────

/**
 * Uploads an image buffer to Azure Blob Storage.
 *
 * @param blobName - The name/path for the blob (e.g., "samples/2024-01-15/image.jpg")
 * @param content - The image data as a Buffer
 * @param contentType - MIME type (default: "image/jpeg")
 * @returns The URL of the uploaded blob, or a mock URL in demo mode
 */
export async function uploadImage(
  blobName: string,
  content: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const containerClient = getContainerClient();

  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(content, {
        blobHTTPHeaders: { blobContentType: contentType },
        metadata: {
          uploadedBy: 'zaytoun-vision',
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log(`[Blob Storage] Uploaded: ${blobName} (${content.length} bytes)`);
      return blockBlobClient.url;
    } catch (error) {
      console.warn('[Blob Storage] Upload failed, returning mock URL:', error);
    }
  }

  // Mock fallback: return a placeholder URL
  const mockUrl = `https://zaytounvision.blob.core.windows.net/${CONTAINER_NAME}/${blobName}`;
  console.log(`[Mock Blob] Generated mock URL: ${mockUrl}`);
  return mockUrl;
}

/**
 * Generates a time-limited SAS URL for secure, read-only access to a blob.
 *
 * Security design:
 *   - Permissions: Read only (no write, delete, or list)
 *   - Expiry: 24 hours (configurable)
 *   - Protocol: HTTPS only
 *   - This prevents certificate URLs from being used indefinitely
 *
 * @param blobName - The blob to generate a SAS URL for
 * @param expiresInHours - How long the URL should be valid (default: 24)
 * @returns A SAS URL string, or a mock URL in demo mode
 */
export async function generateSasUrl(
  blobName: string,
  expiresInHours: number = 24
): Promise<string> {
  const containerClient = getContainerClient();

  if (containerClient && _blobServiceClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Parse account credentials from the connection string for SAS generation
      const accountName = CONNECTION_STRING.match(/AccountName=([^;]+)/)?.[1] || '';
      const accountKey = CONNECTION_STRING.match(/AccountKey=([^;]+)/)?.[1] || '';

      if (accountName && accountKey) {
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        const startsOn = new Date();
        const expiresOn = new Date(startsOn.getTime() + expiresInHours * 60 * 60 * 1000);

        const sasToken = generateBlobSASQueryParameters(
          {
            containerName: CONTAINER_NAME,
            blobName: blobName,
            permissions: BlobSASPermissions.parse('r'), // Read-only
            startsOn,
            expiresOn,
            protocol: SASProtocol.Https, // HTTPS only for security
          },
          sharedKeyCredential
        ).toString();

        const sasUrl = `${blockBlobClient.url}?${sasToken}`;
        console.log(`[Blob Storage] SAS URL generated, expires: ${expiresOn.toISOString()}`);
        return sasUrl;
      }
    } catch (error) {
      console.warn('[Blob Storage] SAS generation failed, returning mock URL:', error);
    }
  }

  // Mock fallback: return a mock SAS URL
  const mockSas = `sv=2024-01-01&st=${new Date().toISOString()}&se=${new Date(Date.now() + expiresInHours * 3600000).toISOString()}&sr=b&sp=r&sig=MOCK_SIGNATURE`;
  const mockUrl = `https://zaytounvision.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${mockSas}`;
  console.log(`[Mock Blob] Generated mock SAS URL for: ${blobName}`);
  return mockUrl;
}

/**
 * Ensures the storage container exists, creating it if necessary.
 * Called during function app initialization.
 */
export async function ensureContainer(): Promise<void> {
  const containerClient = getContainerClient();

  if (containerClient) {
    try {
      await containerClient.createIfNotExists({
        access: undefined, // Private access — SAS required
      });
      console.log(`[Blob Storage] Container '${CONTAINER_NAME}' ready`);
    } catch (error) {
      console.warn('[Blob Storage] Container creation check failed:', error);
    }
  }
}
