import { QueryClient } from "@tanstack/react-query";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

const QUERY_CACHE_KEY = "newpdfgen:react-query";

export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
export const QUERY_CACHE_BUSTER =
  import.meta.env.VITE_QUERY_CACHE_BUSTER ?? "newpdfgen-cache-v1";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE,
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const queryPersister: Persister = {
  persistClient: (client) => set(QUERY_CACHE_KEY, client),
  restoreClient: () => get<PersistedClient>(QUERY_CACHE_KEY),
  removeClient: () => del(QUERY_CACHE_KEY),
};

export async function clearPersistedQueryCache(client: QueryClient) {
  client.clear();
  await queryPersister.removeClient();
}
