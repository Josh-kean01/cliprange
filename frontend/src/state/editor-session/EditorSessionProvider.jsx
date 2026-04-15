import { createContext, useContext, useMemo, useReducer } from "react";

import {
  editorSessionReducer,
  initialEditorSessionState,
} from "./editorSessionReducer";

const EditorSessionStateContext = createContext(null);
const EditorSessionActionsContext = createContext(null);

export function EditorSessionProvider({ children }) {
  const [state, dispatch] = useReducer(
    editorSessionReducer,
    initialEditorSessionState,
  );

  const actions = useMemo(
    () => ({
      setRequestUrl(value) {
        dispatch({ type: "editor/requestUrlSet", payload: value });
      },
      setRequestQuality(value) {
        dispatch({ type: "editor/requestQualitySet", payload: value });
      },
      setSourceStatus(value) {
        dispatch({ type: "editor/sourceStatusSet", payload: value });
      },
      setExportStatus(value) {
        dispatch({ type: "editor/exportStatusSet", payload: value });
      },
      loadSession(session, options = {}) {
        dispatch({
          type: "editor/sessionLoaded",
          payload: {
            session,
            options,
          },
        });
      },
      clearSession() {
        dispatch({ type: "editor/sessionCleared" });
      },
      setSelection(patch) {
        dispatch({ type: "editor/selectionSet", payload: patch });
      },
      setOutputMode(value) {
        dispatch({ type: "editor/outputModeSet", payload: value });
      },
      setTitle(value) {
        dispatch({ type: "editor/titleSet", payload: value });
      },
      setPlaying(value) {
        dispatch({ type: "editor/playingSet", payload: value });
      },
      setOutputOptions(patch) {
        dispatch({ type: "editor/outputOptionsSet", payload: patch });
      },
      setPlayback(patch) {
        dispatch({ type: "editor/playbackSet", payload: patch });
      },
      setLatestResult(value) {
        dispatch({ type: "editor/latestResultSet", payload: value });
      },
    }),
    [],
  );

  return (
    <EditorSessionStateContext.Provider value={state}>
      <EditorSessionActionsContext.Provider value={actions}>
        {children}
      </EditorSessionActionsContext.Provider>
    </EditorSessionStateContext.Provider>
  );
}

export function useEditorSessionStore() {
  const state = useContext(EditorSessionStateContext);
  const actions = useContext(EditorSessionActionsContext);

  if (!state || !actions) {
    throw new Error("useEditorSessionStore must be used within EditorSessionProvider.");
  }

  return useMemo(
    () => ({
      state,
      ...actions,
    }),
    [actions, state],
  );
}

export function useEditorSessionState() {
  const state = useContext(EditorSessionStateContext);

  if (!state) {
    throw new Error("useEditorSessionState must be used within EditorSessionProvider.");
  }

  return state;
}

export function useEditorSessionActions() {
  const actions = useContext(EditorSessionActionsContext);

  if (!actions) {
    throw new Error("useEditorSessionActions must be used within EditorSessionProvider.");
  }

  return actions;
}
