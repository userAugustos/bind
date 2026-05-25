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
      <nav
        style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #eee',
          display: 'flex',
          gap: '1rem',
        }}
      >
        <Link to="/" style={{ color: '#0070f3' }}>
          Home
        </Link>
        <Link to="/cases/" style={{ color: '#0070f3' }}>
          Cases
        </Link>
      </nav>
      <Outlet />
    </>
  );
}
