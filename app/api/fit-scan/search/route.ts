import { NextResponse } from 'next/server';

import {
  FitScanConfigError,
  getUploadConfig,
  uploadScanCrop,
} from '@/lib/fit-scan/uploadStorage.mjs';
import {
  FitScanSearchError,
  getSerpApiConfig,
  searchGoogleLens,
} from '@/lib/fit-scan/serpapiClient.mjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function fileError(code: string, message: string, status: number) {
  return errorResponse(code, message, status);
}

export async function POST(request: Request) {
  try {
    const serpApiConfig = getSerpApiConfig(process.env);
    const uploadConfig = getUploadConfig(process.env);
    const form = await request.formData();
    const crop = form.get('crop');

    if (!(crop instanceof File)) {
      return fileError(
        'FILE_REQUIRED',
        'Fit scan requires a captured crop image.',
        400,
      );
    }
    if (!crop.type.startsWith('image/')) {
      return fileError(
        'INVALID_CONTENT_TYPE',
        'Fit scan crop must be an image file.',
        400,
      );
    }
    if (crop.size > MAX_UPLOAD_BYTES) {
      return fileError(
        'FILE_TOO_LARGE',
        'Fit scan crop is too large. Capture a smaller crop.',
        413,
      );
    }

    const imageUrl = await uploadScanCrop({
      blob: crop,
      filename: crop.name || 'fit-scan-crop.jpg',
      config: uploadConfig,
    });
    const result = await searchGoogleLens({
      imageUrl,
      config: serpApiConfig,
    });

    if (!result.match) {
      return NextResponse.json({
        ok: false,
        imageUrl: result.imageUrl,
        error: {
          code: 'NO_MATCH_FOUND',
          message: 'No match found from the live Google Lens response.',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      imageUrl: result.imageUrl,
      match: result.match,
    });
  } catch (err) {
    if (err instanceof FitScanConfigError || err instanceof FitScanSearchError) {
      return errorResponse(err.code, err.message, err.status);
    }
    return errorResponse(
      'FIT_SCAN_FAILED',
      err instanceof Error ? err.message : 'Fit scan failed.',
      500,
    );
  }
}
