import { Elysia } from "elysia";
import { apiRoutes } from "./routes/api";

export function createApp(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  return new Elysia()
    .onBeforeHandle(({ request, set }) => {
      const origin = request.headers.get("origin");
      if (origin) {
        set.headers["Access-Control-Allow-Origin"] = origin;
        set.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
        set.headers["Access-Control-Allow-Headers"] = "Content-Type";
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }
    })
    .use(apiRoutes(dataDir, targetsPath));
}
