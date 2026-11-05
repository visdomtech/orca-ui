import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { ThemeSwitcherProvider } from "./ThemeSwitcher";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeSwitcherProvider>
      <App />
    </ThemeSwitcherProvider>
  </StrictMode>,
);
