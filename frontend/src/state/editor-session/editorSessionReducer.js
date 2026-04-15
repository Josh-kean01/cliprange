import { DEFAULT_RETRIEVE_QUALITY } from "../../utils/retrieve-quality";

const INITIAL_SOURCE_STATUS = "Ready to load a clip source.";
const INITIAL_EXPORT_STATUS = "Select a range, then export your clip.";

export const initialEditorSessionState = {
  requestUrl: "",
  requestQuality: DEFAULT_RETRIEVE_QUALITY,
  session: null,
  selection: {
    durationSeconds: 0,
    startSeconds: 0,
    endSeconds: 0,
    headSeconds: 0,
  },
  outputMode: "share",
  title: "",
  playing: false,
  outputOptions: {
    removeWatermark: true,
    autoSubtitles: false,
  },
  playback: {
    playerMuted: false,
    captionsEnabled: false,
  },
  sourceStatus: INITIAL_SOURCE_STATUS,
  exportStatus: INITIAL_EXPORT_STATUS,
  latestResult: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function normalizeSelection(selection) {
  const durationSeconds = Math.max(0, Number(selection.durationSeconds) || 0);

  if (!durationSeconds) {
    return {
      durationSeconds: 0,
      startSeconds: 0,
      endSeconds: 0,
      headSeconds: 0,
    };
  }

  const startSeconds = clamp(selection.startSeconds, 0, durationSeconds);
  const endSeconds = clamp(selection.endSeconds, startSeconds, durationSeconds);
  const headSeconds = clamp(selection.headSeconds, startSeconds, endSeconds);

  return {
    durationSeconds,
    startSeconds,
    endSeconds,
    headSeconds,
  };
}

function buildHydratedState(state, session, options = {}) {
  const durationSeconds = Math.max(0, Number(session.durationSeconds) || 0);
  const startSeconds = clamp(
    options.startSeconds ?? session.selection.startSeconds ?? 0,
    0,
    durationSeconds,
  );
  const endSeconds = clamp(
    options.endSeconds ?? session.selection.endSeconds ?? durationSeconds,
    startSeconds,
    durationSeconds,
  );

  return {
    ...state,
    session,
    selection: normalizeSelection({
      durationSeconds,
      startSeconds,
      endSeconds,
      headSeconds: options.headSeconds ?? startSeconds,
    }),
    title: options.title ?? session.title,
    outputMode: options.outputMode ?? state.outputMode,
    outputOptions: options.outputOptions ?? state.outputOptions,
    playing: false,
    playback: {
      ...state.playback,
      captionsEnabled: false,
    },
    latestResult: options.latestResult ?? state.latestResult,
    requestUrl: session.source.sourceUrl ?? state.requestUrl,
    requestQuality:
      session.source.requestedQuality?.key ??
      options.requestQuality ??
      state.requestQuality,
  };
}

export function editorSessionReducer(state, action) {
  switch (action.type) {
    case "editor/requestUrlSet":
      return {
        ...state,
        requestUrl: action.payload,
      };
    case "editor/requestQualitySet":
      return {
        ...state,
        requestQuality: action.payload,
      };
    case "editor/sourceStatusSet":
      return {
        ...state,
        sourceStatus: action.payload,
      };
    case "editor/exportStatusSet":
      return {
        ...state,
        exportStatus: action.payload,
      };
    case "editor/sessionLoaded":
      return buildHydratedState(state, action.payload.session, action.payload.options);
    case "editor/sessionCleared":
      return {
        ...initialEditorSessionState,
      };
    case "editor/selectionSet":
      return {
        ...state,
        selection: normalizeSelection({
          ...state.selection,
          ...action.payload,
        }),
      };
    case "editor/outputModeSet":
      return {
        ...state,
        outputMode: action.payload,
      };
    case "editor/titleSet":
      return {
        ...state,
        title: action.payload,
      };
    case "editor/playingSet":
      return {
        ...state,
        playing: Boolean(action.payload),
      };
    case "editor/outputOptionsSet":
      return {
        ...state,
        outputOptions: {
          ...state.outputOptions,
          ...action.payload,
        },
      };
    case "editor/playbackSet":
      return {
        ...state,
        playback: {
          ...state.playback,
          ...action.payload,
        },
      };
    case "editor/latestResultSet":
      return {
        ...state,
        latestResult: action.payload,
      };
    default:
      return state;
  }
}

export {
  INITIAL_EXPORT_STATUS,
  INITIAL_SOURCE_STATUS,
  normalizeSelection,
};
