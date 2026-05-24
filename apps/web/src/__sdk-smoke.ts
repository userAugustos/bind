import { edenTreaty } from '@elysiajs/eden';

import type { BindApi } from '@bind/api/client';

const _client = edenTreaty<BindApi>('http://localhost:3000');

export type _HealthzReturn = Awaited<ReturnType<typeof _client.healthz.get>>;
