import { useAuth } from "./auth";

export function useAuthenticatedQuery(hook: any, token: string | null, ...args: any[]) {
  return hook(...args, {
    query: {
      enabled: !!token,
    },
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}
