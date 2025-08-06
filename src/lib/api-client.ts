import { env } from "@/config/env";
import { getCookie } from "cookies-next";

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer | Record<string, any>;
  cookie?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

function buildUrlWithParams(
  url: string,
  params?: RequestOptions["params"]
): string {
  if (!params) return url;
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
  if (Object.keys(filteredParams).length === 0) return url;
  const queryString = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();

  return `${url}?${queryString}`;
}

async function fetchApi<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    cookie,
    params,
    cache = "no-store",
    next,
  } = options;
  const fullUrl = buildUrlWithParams(`${env.API_URL}${url}`, params);

  // Récupérer le token de session si en production
  const sessionToken =
    process.env.NODE_ENV === "production" ? getCookie("__session") : null;

  const response = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(process.env.NODE_ENV === "production" && sessionToken
        ? { Authorization: `Bearer ${sessionToken}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache,
    next,
  });

  return response.json();
}

export const api = {
  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: "GET" });
  },
  post<T>(
    url: string,
    body?: string | FormData | Blob | ArrayBuffer | Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    return fetchApi<T>(url, { ...options, method: "POST", body });
  },
  put<T>(
    url: string,
    body?: string | FormData | Blob | ArrayBuffer | Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    return fetchApi<T>(url, { ...options, method: "PUT", body });
  },
  patch<T>(
    url: string,
    body?: string | FormData | Blob | ArrayBuffer | Record<string, any>,
    options?: RequestOptions
  ): Promise<T> {
    return fetchApi<T>(url, { ...options, method: "PATCH", body });
  },
  delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return fetchApi<T>(url, { ...options, method: "DELETE" });
  },
};
