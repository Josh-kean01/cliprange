import { useEditorSessionStore } from "../../../state/editor-session/EditorSessionProvider";

export function useEditorSession() {
  return useEditorSessionStore();
}
