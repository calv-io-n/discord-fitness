import { createApp } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");
const PORT = Number(process.env.PORT) || 3000;

const app = createApp(dataDir, targetsPath);
app.listen(PORT);

console.log(`Dashboard running at http://localhost:${PORT}`);
