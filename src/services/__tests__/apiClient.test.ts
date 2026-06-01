// Feature: backend-integration-refactor, Property 2: ApiError shape on HTTP failure
// Validates: Requirements 1.6

import * as fc from 'fast-check';
import {
  ApiError,
  configureUnauthorizedHandler,
  ensureAccessToken,
  request,
} from '../apiClient';
import { clearTokens, setTokens } from '../authStore';

/**
 * Property 2: ApiError shape on HTTP failure
 *
 * For any HTTP error status code (4xx or 5xx), when the apiClient encounters
 * that error in real mode, it should throw an ApiError whose `status` field
 * equals the HTTP status code and whose `message` field is a non-empty string.
 *
 * Validates: Requirements 1.6
 */
describe('apiClient — Property 2: ApiError shape on HTTP failure', () => {
  const TEST_BASE_URL = 'http://test.example.com';

  // Ensure global.fetch exists so jest.spyOn can attach to it
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Set the env var so apiClient runs in real mode (not mock mode)
    process.env.NEXT_PUBLIC_API_BASE_URL = TEST_BASE_URL;
    // Provide a no-op fetch stub if the environment doesn't have one
    if (!global.fetch) {
      global.fetch = jest.fn();
    }
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.restoreAllMocks();
    clearTokens();
    configureUnauthorizedHandler(() => {
      clearTokens();
    });
    // Restore original fetch (may be undefined in jsdom)
    global.fetch = originalFetch;
  });

  it('throws ApiError with matching status and non-empty message for any 4xx/5xx status code', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 599 }),
        async (statusCode) => {
          // Arrange: mock fetch to return a response with the generated error status.
          // We construct a plain object matching the Response interface because
          // the jsdom environment may not expose the global Response constructor.
          const mockResponse = {
            ok: false,
            status: statusCode,
            statusText: `HTTP Error ${statusCode}`,
            text: jest.fn().mockResolvedValue('Error from server'),
            json: jest.fn().mockResolvedValue({}),
          };
          global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

          // Act & Assert: request() must throw an ApiError
          let thrownError: unknown;
          try {
            await request<unknown>('GET', '/test-path');
          } catch (err) {
            thrownError = err;
          }

          // The thrown error must be an ApiError instance
          expect(thrownError).toBeInstanceOf(ApiError);

          const apiError = thrownError as ApiError;

          // status must equal the generated HTTP status code
          expect(apiError.status).toBe(statusCode);

          // message must be a non-empty string
          expect(typeof apiError.message).toBe('string');
          expect(apiError.message.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ensureAccessToken returns the current unexpired token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 60 * 60;
    const payload = Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64url');
    const accessToken = `header.${payload}.signature`;

    setTokens(accessToken, 'refresh-token');

    await expect(ensureAccessToken()).resolves.toBe(accessToken);
  });

  it('ensureAccessToken refreshes an expired token', async () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 60;
    const payload = Buffer.from(JSON.stringify({ exp: expiredExp })).toString('base64url');
    setTokens(`header.${payload}.signature`, 'refresh-token');

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({ access: 'fresh-access', refresh: 'fresh-refresh' }),
    });

    await expect(ensureAccessToken()).resolves.toBe('fresh-access');
  });

  it('ensureAccessToken invokes unauthorized handling when refresh fails', async () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 60;
    const payload = Buffer.from(JSON.stringify({ exp: expiredExp })).toString('base64url');
    setTokens(`header.${payload}.signature`, 'refresh-token');

    const unauthorizedHandler = jest.fn(() => {
      clearTokens();
    });
    configureUnauthorizedHandler(unauthorizedHandler);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(ensureAccessToken()).resolves.toBeNull();
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });
});
