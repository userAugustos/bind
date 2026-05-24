import { describe, expect, test } from 'bun:test';

import { api } from './e2e.setup';

describe('healthz', () => {
  test('returns ok', async () => {
    const { data, error } = await api.healthz.get();
    expect(error).toBeNull();
    expect(data?.status).toBe('ok');
    expect(data?.timestamp).toBeTruthy();
  });
});
