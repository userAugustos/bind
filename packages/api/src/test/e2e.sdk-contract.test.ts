import { describe, expect, test } from 'bun:test';

import { api } from './e2e.setup';

describe('SDK contract', () => {
  test('healthz round-trip via treaty<BindApi> preserves shape', async () => {
    const { data, error } = await api.healthz.get();
    expect(error).toBeNull();
    if (!data) throw new Error('healthz returned no data');
    data satisfies { status: string; version: string; timestamp: string };
    expect(data.status).toBe('ok');
  });
});
