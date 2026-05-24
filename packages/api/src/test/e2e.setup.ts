import { treaty } from '@elysiajs/eden';

import { createApp } from '@api/app';
import type { BindApi } from '@api/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = treaty<BindApi>(createApp() as any);
