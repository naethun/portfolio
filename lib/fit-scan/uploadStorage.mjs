export class FitScanConfigError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = 'FitScanConfigError';
    this.code = code;
    this.status = status;
  }
}

function publicHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getUploadConfig(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN;
  const storeId = env.BLOB_STORE_ID;
  if (!token && !storeId) {
    throw new FitScanConfigError(
      'STORAGE_NOT_CONFIGURED',
      'Fit scan upload storage is not configured. Connect Vercel Blob to the project or set BLOB_READ_WRITE_TOKEN.',
    );
  }
  return {
    token: token ?? '',
    storeId: storeId ?? '',
    prefix: env.FIT_SCAN_BLOB_PREFIX ?? 'fit-scan',
  };
}

async function defaultPut(pathname, blob, options) {
  const { put } = await import('@vercel/blob');
  return put(pathname, blob, options);
}

function safeFilename(filename) {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'crop.jpg';
}

export async function uploadScanCrop({
  blob,
  filename = 'fit-scan-crop.jpg',
  config,
  putImpl = defaultPut,
}) {
  if (!(blob instanceof Blob)) {
    throw new FitScanConfigError(
      'FILE_REQUIRED',
      'Fit scan upload requires a captured image file.',
      400,
    );
  }

  const pathname = `${config.prefix}/${Date.now()}-${safeFilename(filename)}`;
  const putOptions = {
    access: 'public',
    addRandomSuffix: true,
  };
  if (config.token) {
    putOptions.token = config.token;
  }
  if (config.storeId) {
    putOptions.storeId = config.storeId;
  }

  let upload;
  try {
    upload = await putImpl(pathname, blob, putOptions);
  } catch (err) {
    throw new FitScanConfigError(
      'UPLOAD_FAILED',
      `Vercel Blob upload failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  const candidates = [upload?.url, upload?.downloadUrl];
  const imageUrl = candidates.map(publicHttpsUrl).find(Boolean);
  if (!imageUrl) {
    throw new FitScanConfigError(
      'PUBLIC_URL_UNAVAILABLE',
      'Vercel Blob upload completed, but storage did not return a public https image URL.',
      502,
    );
  }
  return imageUrl;
}
