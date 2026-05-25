import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

function Root() {
  return (
    <>
      <nav className="border-border flex gap-4 border-b px-4 py-2">
        <Link to="/" className="text-primary hover:underline">
          Home
        </Link>
        <Link to="/cases/" className="text-primary hover:underline">
          Cases
        </Link>
      </nav>
      <Outlet />
    </>
  );
}
