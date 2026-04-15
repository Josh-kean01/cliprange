import { createContext, useContext, useEffect, useRef, useState } from "react";

import ToastStack from "../../components/shared/ToastStack";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef(new Map());

  function dismissToast(toastId) {
    const timeoutId = toastTimeoutsRef.current.get(toastId);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(toastId);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function pushToast(title, detail = "", tone = "info") {
    const toastId =
      globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const timeoutId = window.setTimeout(() => {
      toastTimeoutsRef.current.delete(toastId);
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3600);

    toastTimeoutsRef.current.set(toastId, timeoutId);
    setToasts((current) => [
      ...current.slice(-2),
      { id: toastId, title, detail, tone },
    ]);
  }

  useEffect(() => {
    return () => {
      for (const timeoutId of toastTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      toastTimeoutsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ pushToast, dismissToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return value;
}
