import {
  MAX_ACTIVE_JOBS_GLOBAL,
  MAX_ACTIVE_JOBS_PER_WORKSPACE,
} from "../../config/runtime.js";
import { createHttpError } from "../../utils/http.js";
import { listActiveJobs } from "../job-store.js";

export function assertJobCapacity(workspaceId) {
  const activeJobs = listActiveJobs();
  const activeWorkspaceJobs = activeJobs.filter(
    (job) => job.workspaceId === workspaceId,
  );

  if (activeJobs.length >= MAX_ACTIVE_JOBS_GLOBAL) {
    throw createHttpError(
      429,
      "ClipRange is busy right now. Please wait for a running job to finish.",
      {
        code: "JOB_CAPACITY",
        stage: "job-capacity",
        retryable: true,
      },
    );
  }

  if (activeWorkspaceJobs.length >= MAX_ACTIVE_JOBS_PER_WORKSPACE) {
    throw createHttpError(
      429,
      "Finish or wait for your current job before starting another one.",
      {
        code: "JOB_CAPACITY",
        stage: "job-capacity",
        retryable: true,
      },
    );
  }
}
