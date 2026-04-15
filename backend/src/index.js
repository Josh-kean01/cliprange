import { createApp } from "./app/create-app.js";
import {
  frontendIndexHtmlPath,
  port,
  usingEphemeralSessionSecret,
} from "./config/runtime.js";
import { fileExists } from "./utils/filesystem.js";
import { cleanupJobs, hydrateJobStore } from "./jobs/job-store.js";
import { cleanupRateLimits } from "./jobs/policies/rate-limit-policy.js";
import { getMediaTools } from "./media/media-pipeline.js";
import { cleanupStorage, ensureStorageDirectories } from "./storage/maintenance-service.js";
import { hydrateShareLookup } from "./storage/share-index-repository.js";

const hasBuiltClient = await fileExists(frontendIndexHtmlPath);
await ensureStorageDirectories();
await hydrateJobStore();

const app = createApp({ hasBuiltClient });
void cleanupJobs();
cleanupRateLimits();

setInterval(() => {
  void cleanupJobs();
  cleanupRateLimits();
  void cleanupStorage();
}, 10 * 60 * 1000).unref();

app.listen(port, () => {
  console.log(`ClipRange server listening on port ${port}.`);
  warmStartupTasks();

  if (usingEphemeralSessionSecret) {
    console.warn(
      "SESSION_SECRET is not set. Workspace sessions will reset after each restart.",
    );
  }

  if (!hasBuiltClient) {
    console.log(
      "Frontend build not found. Run npm run build to serve the app from this server.",
    );
  }
});

function warmStartupTasks() {
  for (const [label, task] of [
    ["storage cleanup", cleanupStorage],
    ["share index hydration", hydrateShareLookup],
    ["media tool discovery", getMediaTools],
  ]) {
    void Promise.resolve()
      .then(() => task())
      .catch((error) => {
        console.warn(`Background ${label} failed:`, error);
      });
  }
}
