import { useAuth } from "./auth";

export function useAuthenticatedQuery(hook: any, token: string | null, ...args: any[]) {
  const options = args[args.length - 1] && typeof args[args.length - 1] === 'object' ? args.pop() : {};
  return hook(...args, {
    ...options,
    query: {
      ...(options.query || {}),
      enabled: !!token && (options.query?.enabled ?? true),
    },
    request: {
      ...(options.request || {}),
      headers: {
        ...(options.request?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
    },
  });
}
