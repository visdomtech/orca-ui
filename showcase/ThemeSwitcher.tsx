import { ConfigProvider, App as AntApp } from "antd";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_THEME_ID, THEME_PRESETS } from "./themes";

interface ThemeCtx {
  activeId: string;
  setActiveId: (id: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = "orca-ui-showcase-theme";

function readStoredId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && THEME_PRESETS.some((p) => p.id === stored)) return stored;
  return DEFAULT_THEME_ID;
}

export function ThemeSwitcherProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveIdState] = useState<string>(() => readStoredId());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, activeId);
  }, [activeId]);

  const setActiveId = useCallback((id: string) => setActiveIdState(id), []);

  const config = useMemo(
    () => (THEME_PRESETS.find((p) => p.id === activeId) ?? THEME_PRESETS[0]).config,
    [activeId],
  );

  const ctxValue = useMemo<ThemeCtx>(() => ({ activeId, setActiveId }), [activeId, setActiveId]);

  return (
    <Ctx.Provider value={ctxValue}>
      <ConfigProvider theme={config}>
        <AntApp style={{ height: "100%" }}>{children}</AntApp>
      </ConfigProvider>
    </Ctx.Provider>
  );
}

export function useThemeSwitcher(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useThemeSwitcher must be used inside ThemeSwitcherProvider");
  return v;
}
