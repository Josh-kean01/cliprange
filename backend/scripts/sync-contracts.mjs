import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const contractModuleUrl = pathToFileURL(
  path.join(repoRoot, "backend", "src", "contracts", "api-contracts.js"),
);
const outputPath = path.join(
  repoRoot,
  "frontend",
  "src",
  "api",
  "contracts",
  "generated",
  "api-contracts.generated.js",
);
const checkMode = process.argv.includes("--check");

const { getContractArtifact } = await import(contractModuleUrl.href);
const artifact = getContractArtifact();
const fileContents = `export const API_CONTRACTS = ${JSON.stringify(artifact, null, 2)};\n`;

if (checkMode) {
  const current = await fs.readFile(outputPath, "utf8").catch(() => "");

  if (current !== fileContents) {
    console.error("Generated frontend contracts are out of date.");
    process.exitCode = 1;
  }
} else {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, fileContents);
}
