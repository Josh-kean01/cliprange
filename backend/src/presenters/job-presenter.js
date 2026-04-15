function slugifyStage(stage) {
  return String(stage ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "queued";
}

export function presentJobStatus(job) {
  return {
    jobId: job.id,
    jobType: job.type,
    status: job.status,
    stageCode: slugifyStage(job.stage),
    progressPercent: job.progress,
    submittedAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
    message: job.stage,
    result: job.result,
    error: job.error,
  };
}
