import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { Button } from '@repo/ui/shadcn/button';
import { apiCall, bindApi } from '@/api';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  const healthQuery = useQuery({
    queryKey: ['healthz'],
    queryFn: () => apiCall<{ status: string }>(() => bindApi.healthz.get()),
  });
  const status = healthQuery.isPending ? 'idle' : healthQuery.isError ? 'error' : 'ok';

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div data-testid="home" className="text-center">
        <h1 className="text-2xl font-semibold">Bind</h1>
        <p data-testid="api-status" className="text-muted-foreground text-sm">
          API: {status}
        </p>
        <Button
          data-testid="ping-btn"
          disabled={healthQuery.isFetching}
          onClick={() => void healthQuery.refetch()}
        >
          Ping API
        </Button>
      </div>
    </main>
  );
}
