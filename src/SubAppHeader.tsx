import type { ReactNode } from "react";
/** Header gradient — indigo to royal blue. */
const GRADIENT = "linear-gradient(135deg, #4a5bba 0%, #4d78d6 60%, #60a5fa 100%)";

export interface SubAppHeaderTab {
  key: string;
  label: string;
  /** Count shown as a badge pill. Omit, null, or 0 to hide the badge. */
  badge?: number | null;
}

export interface SubAppHeaderProps {
  /** Application title shown in the header band. */
  title: string;
  /** Optional subtitle below the title (e.g. workspace name, short description). */
  subtitle?: string;
  /** Home-navigation link rendered before the title (e.g. HostHomeLink). */
  homeLink?: ReactNode;
  /** Called when the title text is clicked — typically navigates home. */
  onTitleClick?: () => void;
  /** Right-aligned controls: user email, "Preview as" dropdown, settings icon, etc. */
  rightSlot?: ReactNode;
  /**
   * Content rendered between the title row and the tab strip — inside the brand
   * band. Suitable for preview-mode banners and error alerts that need to appear
   * above the navigation but are visually distinct from the tabs.
   */
  banner?: ReactNode;
  /** Navigation tabs shown below the title. Omit or pass an empty array for no strip. */
  tabs?: SubAppHeaderTab[];
  /** Active tab key. Pass null/undefined to show no tab as active (e.g. inside a workspace). */
  activeTab?: string | null;
  /** Called when the user selects a tab. */
  onTabChange?: (key: string) => void;
}

/**
 * Shared application header for Orca sub-apps.
 *
 * Renders a brand-colored (#1d6ffe) band with:
 * - A title row (home link, app name, subtitle, right-side controls)
 * - An optional banner slot (preview-mode warnings, error alerts)
 * - A sticky navigation tab strip (same background — no dividing border)
 *
 * The title row scrolls with the page; the tab strip freezes at the top.
 * Both sections share a single background so they read as one continuous band.
 */
export function SubAppHeader({
  title,
  subtitle,
  homeLink,
  onTitleClick,
  rightSlot,
  banner,
  tabs,
  activeTab,
  onTabChange,
}: SubAppHeaderProps) {
  const hasTabs = (tabs?.length ?? 0) > 0;

  return (
    <header className="sticky top-0 z-30" style={{ background: GRADIENT, color: "#fff" }}>
      {/* ── Title row ──────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-[72rem] flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pb-2 pt-4">
        {/* Left: home link + app title + subtitle */}
        <div className="flex min-w-0 items-center gap-2 [flex:1_1_320px]">
          {homeLink ? (
            <div className="-ml-2 flex-shrink-0">{homeLink}</div>
          ) : null}
          <div className="min-w-0">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className="cursor-pointer border-0 bg-transparent p-0 text-left text-[17px] font-semibold leading-tight tracking-tight text-white hover:text-white/85"
                style={{ fontFamily: "inherit" }}
              >
                {title}
              </button>
            ) : (
              <div className="text-[17px] font-semibold leading-tight tracking-tight text-white">
                {title}
              </div>
            )}
            {subtitle ? (
              <div className="mt-0.5 text-[13px] leading-snug text-white/65">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: email, preview-as, settings, etc. */}
        {rightSlot ? (
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3">
            {rightSlot}
          </div>
        ) : null}
      </div>

      {/* ── Banner slot (inside brand band, above tabs) ─────────────────── */}
      {banner}

      {/* ── Tab strip (inherits header gradient) ────────────────────────── */}
      {hasTabs ? (
        <nav
          aria-label="Primary navigation"
        >
          <div className="mx-auto max-w-[72rem] px-6">
            <ul className="flex gap-x-1 overflow-x-auto">
              {tabs!.map((tab) => {
                const isActive = tab.key === activeTab;
                const showBadge = tab.badge != null && tab.badge > 0;
                return (
                  <li key={tab.key} className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onTabChange?.(tab.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1.5 text-sm transition-colors " +
                        (isActive
                          ? "border-white font-semibold text-white"
                          : "border-transparent font-medium text-white/65 hover:border-white/30 hover:text-white")
                      }
                    >
                      {tab.label}
                      {showBadge ? (
                        <span
                          className={
                            "min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums " +
                            (isActive
                              ? "bg-white text-[#1d6ffe]"
                              : "bg-white/15 text-white/80")
                          }
                        >
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
