import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppShell from "./AppShell";

const HomePage = lazy(() => import("../pages/HomePage"));
const EditorPage = lazy(() => import("../pages/EditorPage"));
const LibraryPage = lazy(() => import("../pages/LibraryPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
