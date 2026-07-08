import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FitScanConfigError,
  getUploadConfig,
  uploadScanCrop,
} from './uploadStorage.mjs';

describe('getUploadConfig', () => {
  it('throws an honest storage config error when Vercel Blob is not configured', () => {
    assert.throws(
      () => getUploadConfig({}),
      (err) =>
        err instanceof FitScanConfigError &&
        err.code === 'STORAGE_NOT_CONFIGURED' &&
        err.message.includes('BLOB_READ_WRITE_TOKEN'),
    );
  });
});

describe('uploadScanCrop', () => {
  it('uploads the crop to Vercel Blob and returns a public image URL', async () => {
    const calls = [];
    const putImpl = async (pathname, blob, options) => {
      calls.push({ pathname, blob, options });
      return { url: 'https://cdn.example.com/scan.jpg' };
    };

    const imageUrl = await uploadScanCrop({
      blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
      filename: 'scan.jpg',
      config: getUploadConfig({
        BLOB_READ_WRITE_TOKEN: 'blob-secret',
      }),
      putImpl,
    });

    assert.equal(imageUrl, 'https://cdn.example.com/scan.jpg');
    assert.match(calls[0].pathname, /^fit-scan\/\d+-scan\.jpg$/);
    assert.equal(calls[0].blob.type, 'image/jpeg');
    assert.equal(calls[0].options.access, 'public');
    assert.equal(calls[0].options.token, 'blob-secret');
    assert.equal(calls[0].options.storeId, undefined);
  });

  it('uploads the crop with the Vercel Blob OIDC store id when no read-write token is set', async () => {
    const calls = [];
    const putImpl = async (pathname, blob, options) => {
      calls.push({ pathname, blob, options });
      return { url: 'https://cdn.example.com/scan.jpg' };
    };

    const imageUrl = await uploadScanCrop({
      blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
      filename: 'scan.jpg',
      config: getUploadConfig({
        BLOB_STORE_ID: 'store_test123',
      }),
      putImpl,
    });

    assert.equal(imageUrl, 'https://cdn.example.com/scan.jpg');
    assert.match(calls[0].pathname, /^fit-scan\/\d+-scan\.jpg$/);
    assert.equal(calls[0].options.access, 'public');
    assert.equal(calls[0].options.token, undefined);
    assert.equal(calls[0].options.storeId, 'store_test123');
  });

  it('rejects upload responses that do not expose a public https URL', async () => {
    await assert.rejects(
      () =>
        uploadScanCrop({
          blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
          filename: 'scan.jpg',
          config: getUploadConfig({
            BLOB_READ_WRITE_TOKEN: 'blob-secret',
          }),
          putImpl: async () => ({ url: 'http://localhost/scan.jpg' }),
        }),
      (err) => err.code === 'PUBLIC_URL_UNAVAILABLE',
    );
  });
});
