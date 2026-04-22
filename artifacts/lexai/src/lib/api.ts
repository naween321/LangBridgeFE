const API_URL = import.meta.env.VITE_API_URL || "";
const BASE = API_URL ? (API_URL.endsWith("/") ? `${API_URL}api` : `${API_URL}/api`) : "/api";

export function getAuthHeaders(token: string | null) {
  const actualToken = token || localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(actualToken ? { Authorization: `Bearer ${actualToken}` } : {}),
  };
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function handleTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  if (isRefreshing) {
    return new Promise(resolve => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE}/authentication/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      const newAccess = data.access;
      localStorage.setItem("access_token", newAccess);
      onRefreshed(newAccess);
      return newAccess;
    } else {
      throw new Error("Refresh failed");
    }
  } catch (err) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("lexai_user");
    window.location.href = "/login";
    onRefreshed(null);
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const [urlPath, query] = path.split("?");
  const normalizedPath = urlPath.endsWith("/") ? urlPath : `${urlPath}/`;
  const finalPath = query ? `${normalizedPath}?${query}` : normalizedPath;

  let res = await fetch(`${BASE}${finalPath}`, {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...(options.headers || {}),
    },
  });
  
  if (!res.ok) {
    if (res.status === 401 && path !== "/authentication/token/refresh/") {
      const newToken = await handleTokenRefresh();
      if (newToken) {
        // Retry with new token
        res = await fetch(`${BASE}${finalPath}`, {
          ...options,
          headers: {
            ...getAuthHeaders(newToken),
            ...(options.headers || {}),
          },
        });
        
        if (res.ok) {
          return res.json();
        }
      } else {
        throw new Error("Unauthorized access. Please login again.");
      }
    }
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}
