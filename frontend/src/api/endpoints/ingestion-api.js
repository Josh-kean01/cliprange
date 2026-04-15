import { normalizeEditorSession } from "../contracts/normalizers";
import { submitQueuedJob } from "./jobs-api";

export async function createRetrieveJob(url, quality, onProgress) {
  const finalJob = await submitQueuedJob(
    "/api/retrieve",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, quality }),
    },
    onProgress,
    "The source could not be retrieved.",
  );

  return {
    job: finalJob,
    session: normalizeEditorSession(finalJob.result),
  };
}
