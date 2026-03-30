import { Elysia } from "elysia";
import { apiRoutes } from "./routes/api";
import { resolve, join } from "path";

export function createApp(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  const publicDir = resolve(import.meta.dir, "public");

  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
  };

  return new Elysia()
    .use(apiRoutes(dataDir, targetsPath))
    .get("/", () => new Response(Bun.file(join(publicDir, "index.html"))))
    .get("/:file", ({ params }) => {
      const ext = params.file.slice(params.file.lastIndexOf("."));
      const mime = mimeTypes[ext] || "application/octet-stream";
      const file = Bun.file(join(publicDir, params.file));
      return new Response(file, { headers: { "Content-Type": mime } });
    });
}
