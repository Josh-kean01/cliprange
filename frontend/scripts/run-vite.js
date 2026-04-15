import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRootDir = path.resolve(__dirname, "..");

const viteCandidates = [
  path.join(frontendRootDir, "node_modules", "vite", "bin", "vite.js"),
  path.join(frontendRootDir, "..", "node_modules", "vite", "bin", "vite.js"),
];

const viteBinary = viteCandidates.find((candidate) => fs.existsSync(candidate));

if (!viteBinary) {
  console.error(
    "Vite was not found. Run npm install in frontend/ or restore the root node_modules install.",
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [viteBinary, ...process.argv.slice(2)], {
  cwd: frontendRootDir,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
