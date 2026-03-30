import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { apiRoutes } from "./routes/api";
import { resolve } from "path";

export function createApp(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  const publicDir = resolve(import.meta.dir, "public");

  return new Elysia()
    .use(apiRoutes(dataDir, targetsPath))
    .use(staticPlugin({ assets: publicDir, prefix: "/" }));
}
