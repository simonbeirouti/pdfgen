import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { EditDocumentRoute } from "@/routes/edit";
import { DocumentsIndexRoute } from "@/routes";
import { RootRoute } from "@/routes/root";

const rootRoute = createRootRoute({
  component: RootRoute,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DocumentsIndexRoute,
});

const editRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit/$documentId",
  component: EditDocumentRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, editRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
