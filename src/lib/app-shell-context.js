import { useOutletContext } from "react-router-dom";

export function useAppShellContext() {
  return useOutletContext();
}
