import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getErrorMessage } from "../../api/client/http-client";
import { listHistoryEntries } from "../../api/endpoints/history-api";

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  const requestRef = useRef(null);
  const stateRef = useRef(null);
  const [state, setState] = useState({
    items: [],
    loading: false,
    hasLoaded: false,
    error: "",
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshLibrary = useCallback(async () => {
    if (requestRef.current) {
      return requestRef.current;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    const request = listHistoryEntries()
      .then((items) => {
        setState({
          items,
          loading: false,
          hasLoaded: true,
          error: "",
        });
        return items;
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          loading: false,
          hasLoaded: true,
          error: getErrorMessage(
            error,
            "The library could not be loaded right now.",
          ),
        }));
        return [];
      })
      .finally(() => {
        requestRef.current = null;
      });

    requestRef.current = request;
    return request;
  }, []);

  const ensureLibraryLoaded = useCallback(() => {
    if (stateRef.current?.hasLoaded) {
      return Promise.resolve(stateRef.current.items);
    }

    return requestRef.current ?? refreshLibrary();
  }, [refreshLibrary]);

  const setItems = useCallback((items) => {
    setState((current) => ({
      ...current,
      hasLoaded: true,
      items,
    }));
  }, []);

  const value = useMemo(() => ({
    state,
    setItems,
    ensureLibraryLoaded,
    refreshLibrary,
  }), [ensureLibraryLoaded, refreshLibrary, setItems, state]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryStore() {
  const value = useContext(LibraryContext);

  if (!value) {
    throw new Error("useLibraryStore must be used within LibraryProvider.");
  }

  return value;
}
