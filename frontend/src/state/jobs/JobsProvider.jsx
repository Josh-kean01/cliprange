import { createContext, useContext, useState } from "react";

const JobsContext = createContext(null);

export function JobsProvider({ children }) {
  const [state, setState] = useState({
    retrieve: {
      active: false,
      job: null,
    },
    export: {
      active: false,
      job: null,
    },
  });

  const value = {
    state,
    startJob(kind, initialJob = null) {
      setState((current) => ({
        ...current,
        [kind]: {
          active: true,
          job: initialJob,
        },
      }));
    },
    updateJob(kind, job) {
      setState((current) => ({
        ...current,
        [kind]: {
          active: true,
          job,
        },
      }));
    },
    clearJob(kind) {
      setState((current) => ({
        ...current,
        [kind]: {
          active: false,
          job: null,
        },
      }));
    },
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobsStore() {
  const value = useContext(JobsContext);

  if (!value) {
    throw new Error("useJobsStore must be used within JobsProvider.");
  }

  return value;
}
