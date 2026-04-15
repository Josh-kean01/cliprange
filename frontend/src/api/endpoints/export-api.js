import { normalizeTrimResult } from "../contracts/normalizers";
import { submitQueuedJob } from "./jobs-api";

export async function createTrimJob(payload, onProgress) {
  const finalJob = await submitQueuedJob(
    "/api/trim",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    onProgress,
    "The clip export failed.",
  );

  return {
    job: finalJob,
    result: normalizeTrimResult(finalJob.result),
  };
}
