import { EditorSessionProvider } from "../../state/editor-session/EditorSessionProvider";
import { JobsProvider } from "../../state/jobs/JobsProvider";
import { LibraryProvider } from "../../state/library/LibraryProvider";
import { ToastProvider } from "../../state/ui/ToastProvider";

export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <JobsProvider>
        <LibraryProvider>
          <EditorSessionProvider>{children}</EditorSessionProvider>
        </LibraryProvider>
      </JobsProvider>
    </ToastProvider>
  );
}
