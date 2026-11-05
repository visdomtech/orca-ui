import {
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  HomeOutlined,
  InboxOutlined,
  StarOutlined as StarIcon,
} from "@ant-design/icons";
import { Space, Typography as AntTypography } from "antd";
import { useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";

import {
  AdminTable,
  AmbientBackground,
  AuditLog,
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  CohortCurve,
  CollapsibleBanner,
  DashboardShell,
  DataTable,
  DateRangePicker,
  DetailLayout,
  DetailRow,
  DetailSkeleton,
  DistributionBar,
  Drawer,
  EmployeeDrawer,
  EmptyState,
  EvidencePanel,
  ExpandableTaskCard,
  Field,
  FilterBar,
  FormSection,
  GlassCard,
  GradientText,
  Heatmap,
  KpiRow,
  KpiTile,
  LeftRailWorkspace,
  MeatballMenu,
  Menu,
  MeterBar,
  Modal,
  MonthYearPicker,
  NotificationsTray,
  NumberInput,
  PageHeader,
  PeoplePicker,
  PeoplePickerMulti,
  ProgressBar,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonBlock,
  SkeletonText,
  Sparkline,
  StatusPill,
  SubAppHeader,
  TableSkeleton,
  Tabs,
  TextArea,
  TextInput,
  Timeline,
  Toggle,
  Tooltip,
  TrendChart,
  TwoPane,
  UserChip,
  Wizard,
  type AdminTableColumn,
  type Citation,
  type DataTableColumn,
  type DateRange,
  type EmployeeDrawerSection,
  type FilterSpec,
  type FilterState,
  type NotificationItem,
  type PeopleSource,
  type SortState,
  type StatusPillTone,
  type TimelineItem,
  type UserRef,
  type WizardStep,
  type WizardValidationState,
} from "@orca-ui";

import { StoryPanel, Variant } from "./StoryPanel";

// ── MUI → antd/HTML shims ────────────────────────────────────────────
// These shims translate the sx/variant conventions used across the showcase
// to plain CSS + antd Typography so stories don't need to be rewritten.

type SxLike = CSSProperties | Record<string, unknown>;

const spacingNum = (v: unknown): number | undefined =>
  typeof v === "number" ? v * 8 : undefined;

function sxToStyle(sx: SxLike | SxLike[] | undefined): CSSProperties {
  if (!sx) return {};
  const list = Array.isArray(sx) ? sx : [sx];
  const out: Record<string, unknown> = {};
  for (const s of list) {
    if (!s || typeof s !== "object") continue;
    for (const [k, v] of Object.entries(s)) {
      // Map MUI spacing shortcuts to px
      if (["p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr", "gap"].includes(k)) {
        const n = spacingNum(v);
        if (n === undefined) continue;
        const map: Record<string, string | string[]> = {
          p: "padding",
          px: ["paddingLeft", "paddingRight"],
          py: ["paddingTop", "paddingBottom"],
          pt: "paddingTop",
          pb: "paddingBottom",
          pl: "paddingLeft",
          pr: "paddingRight",
          m: "margin",
          mx: ["marginLeft", "marginRight"],
          my: ["marginTop", "marginBottom"],
          mt: "marginTop",
          mb: "marginBottom",
          ml: "marginLeft",
          mr: "marginRight",
          gap: "gap",
        };
        const target = map[k];
        if (Array.isArray(target)) target.forEach((t) => (out[t] = n));
        else out[target] = n;
        continue;
      }
      // Pass-through for standard CSS props
      out[k] = v;
    }
  }
  return out as CSSProperties;
}

interface BoxProps {
  sx?: SxLike | SxLike[];
  component?: keyof HTMLElementTagNameMap;
  children?: ReactNode;
  onClick?: () => void;
  [key: string]: unknown;
}

function Box({ sx, component = "div", children, ...rest }: BoxProps) {
  const Comp = component as "div";
  return (
    <Comp {...(rest as Record<string, unknown>)} style={{ ...sxToStyle(sx), ...((rest as { style?: CSSProperties }).style ?? {}) }}>
      {children}
    </Comp>
  );
}

interface StackProps {
  direction?: "row" | "column";
  spacing?: number;
  sx?: SxLike | SxLike[];
  children?: ReactNode;
}

function Stack({ direction = "column", spacing = 1, sx, children }: StackProps) {
  return (
    <Space
      direction={direction === "row" ? "horizontal" : "vertical"}
      size={spacing * 8}
      style={sxToStyle(sx)}
      wrap={direction === "row"}
    >
      {children}
    </Space>
  );
}

interface TypographyProps {
  variant?: "h4" | "h5" | "h6" | "subtitle1" | "subtitle2" | "body1" | "body2" | "caption" | "overline";
  sx?: SxLike | SxLike[];
  color?: string;
  component?: keyof HTMLElementTagNameMap;
  children?: ReactNode;
  noWrap?: boolean;
}

function Typography({ variant = "body1", sx, color, children, noWrap }: TypographyProps) {
  const style = sxToStyle(sx);
  if (noWrap) {
    style.whiteSpace = "nowrap";
    style.overflow = "hidden";
    style.textOverflow = "ellipsis";
  }
  const level = variant === "h4" ? 2 : variant === "h5" ? 3 : variant === "h6" ? 4 : null;
  if (level !== null) {
    return (
      <AntTypography.Title level={level as 2 | 3 | 4 | 5} style={style}>
        {children}
      </AntTypography.Title>
    );
  }
  const sizes: Record<string, number> = {
    subtitle1: 14,
    subtitle2: 13,
    body1: 14,
    body2: 13,
    caption: 12,
    overline: 11,
  };
  const base: CSSProperties = { fontSize: sizes[variant] ?? 14 };
  if (variant === "overline") {
    base.textTransform = "uppercase";
    base.letterSpacing = "0.08em";
    base.fontWeight = 600;
  }
  if (color === "text.secondary") base.color = "rgba(0,0,0,0.65)";
  return (
    <AntTypography.Text style={{ ...base, ...style }} type={color === "text.secondary" ? "secondary" : undefined}>
      {children}
    </AntTypography.Text>
  );
}

const USERS = [
  { name: "Ada Lovelace", email: "ada@orca.dev", avatarUrl: undefined },
  { name: "Grace Hopper", email: "grace@orca.dev" },
  { name: "Katherine Johnson", email: "kj@orca.dev" },
  { name: "Linus T", email: "linus@orca.dev" },
];

// ----------------------------- Chip ---------------------------------

export function ChipStory() {
  return (
    <StoryPanel
      title="Chip"
      description="Compact label with 6 tones and 2 sizes. Supports leading icon, delete, and click."
    >
      <Variant label="Tones (size=md)">
        <Chip tone="neutral">Neutral</Chip>
        <Chip tone="success">Approved</Chip>
        <Chip tone="warning">Pending</Chip>
        <Chip tone="danger">Overdue</Chip>
        <Chip tone="info">Info</Chip>
        <Chip tone="accent">Accent</Chip>
      </Variant>
      <Variant label="Size=sm">
        <Chip size="sm" tone="success">sm success</Chip>
        <Chip size="sm" tone="warning">sm warning</Chip>
        <Chip size="sm" tone="info">sm info</Chip>
      </Variant>
      <Variant label="With icon & delete">
        <Chip tone="accent" icon={<StarIcon />}>Featured</Chip>
        <Chip tone="danger" onDelete={() => alert("delete")}>Removable</Chip>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Button -------------------------------

export function ButtonStory() {
  const [loading, setLoading] = useState(false);
  return (
    <StoryPanel
      title="Button"
      description="5 variants × 3 sizes, leading/trailing icon slots, loading state (disables + spinner)."
    >
      <Variant label="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
      </Variant>
      <Variant label="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Variant>
      <Variant label="With icons">
        <Button variant="primary" leading={<EditIcon style={{ fontSize: 14 }}/>}>Edit</Button>
        <Button variant="secondary" trailing={<DeleteIcon style={{ fontSize: 14 }}/>}>Delete</Button>
      </Variant>
      <Variant label="Loading & disabled">
        <Button
          variant="primary"
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          Click to load
        </Button>
        <Button variant="secondary" disabled>Disabled</Button>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Card ---------------------------------

export function CardStory() {
  return (
    <StoryPanel
      title="Card"
      description="Flat surface with Header/Body/Footer slots. Pass interactive + onClick for keyboard-accessible card buttons."
    >
      <Variant label="Simple card">
        <Box sx={{ width: 320 }}>
          <Card>
            <Card.Header>
              <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Overview</Typography>
              <Chip tone="success" size="sm">Live</Chip>
            </Card.Header>
            <Card.Body>
              <Typography variant="body2" color="text.secondary">
                A compact, bordered surface. Padding is controlled by the padding prop.
              </Typography>
            </Card.Body>
          </Card>
        </Box>
      </Variant>
      <Variant label="With footer + interactive">
        <Box sx={{ width: 320 }}>
          <Card interactive onClick={() => alert("card clicked")}>
            <Card.Header>
              <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Click me</Typography>
            </Card.Header>
            <Card.Body>
              <Typography variant="body2" color="text.secondary">
                Interactive cards get hover + focus styles and keyboard support.
              </Typography>
            </Card.Body>
            <Card.Footer>
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button variant="primary" size="sm">Save</Button>
            </Card.Footer>
          </Card>
        </Box>
      </Variant>
      <Variant label="Paddings">
        <Stack direction="row" spacing={2}>
          {(["sm", "md", "lg"] as const).map((p) => (
            <Card key={p} padding={p} style={{ width: 140 }}>
              <Typography variant="caption">padding={p}</Typography>
            </Card>
          ))}
        </Stack>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Banner -------------------------------

export function BannerStory() {
  return (
    <StoryPanel
      title="Banner"
      description="Inline alert with 5 tones, default icons, optional action and dismiss. CollapsibleBanner adds expand/collapse."
    >
      <Variant label="Tones">
        <Stack spacing={1.5} sx={{ width: "100%" }}>
          <Banner tone="info" title="FYI" detail="This is an informational banner." />
          <Banner tone="success" title="Saved" detail="Your changes are now live." />
          <Banner tone="warning" title="Heads up" detail="This action will notify three approvers." />
          <Banner tone="danger" title="Failed" detail="Upload rejected: file too large." />
          <Banner tone="soft" title="Neutral note" detail="This is a soft, non-tonal banner." />
        </Stack>
      </Variant>
      <Variant label="With action + dismiss">
        <Banner
          tone="warning"
          title="Approval pending"
          detail="3 line items need review before you can submit."
          action={<Button size="sm" variant="secondary">Review</Button>}
          onDismiss={() => alert("dismissed")}
        />
      </Variant>
      <Variant label="Collapsible">
        <CollapsibleBanner
          tone="info"
          title="Why am I seeing this?"
          summary="(click to expand)"
          detail="Because the approver assigned to step 2 of this workflow has delegated their approvals to you until Friday."
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Field + inputs ----------------------

export function InputsStory() {
  const [text, setText] = useState("");
  const [area, setArea] = useState("Hello");
  const [sel, setSel] = useState<"us" | "eu" | "apac">("us");
  const [num, setNum] = useState<number | "">(42);
  return (
    <StoryPanel
      title="Form inputs"
      description="TextInput, TextArea, Select, NumberInput, plus Field for custom children. All default to size=small outlined."
    >
      <Variant label="TextInput">
        <Box sx={{ width: 320 }}>
          <TextInput
            label="Full name"
            placeholder="Ada Lovelace"
            value={text}
            onChange={(e) => setText(e.target.value)}
            hint="Shown on approval chains and audit logs."
          />
        </Box>
      </Variant>
      <Variant label="TextInput — error state">
        <Box sx={{ width: 320 }}>
          <TextInput
            label="Email"
            value="not-an-email"
            onChange={() => undefined}
            error="Enter a valid email address."
          />
        </Box>
      </Variant>
      <Variant label="TextArea">
        <Box sx={{ width: 420 }}>
          <TextArea
            label="Justification"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            minRows={3}
            maxRows={6}
          />
        </Box>
      </Variant>
      <Variant label="Select">
        <Box sx={{ width: 240 }}>
          <Select
            label="Region"
            value={sel}
            onChange={(v) => setSel(v as "us" | "eu" | "apac")}
            options={[
              { value: "us", label: "US" },
              { value: "eu", label: "EU" },
              { value: "apac", label: "APAC" },
            ]}
          />
        </Box>
      </Variant>
      <Variant label="NumberInput">
        <Box sx={{ width: 220 }}>
          <NumberInput label="Headcount" value={num} onChange={setNum} min={0} max={1000} step={1} />
        </Box>
      </Variant>
      <Variant label="Field wrapping custom children">
        <Box sx={{ width: 320 }}>
          <Field label="Custom child" hint="Field only owns label/hint/error layout.">
            <input
              style={{
                padding: 8,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                width: "100%",
                boxSizing: "border-box",
              }}
              placeholder="any input you want"
            />
          </Field>
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Avatar -------------------------------

export function AvatarStory() {
  return (
    <StoryPanel
      title="Avatar"
      description="Initials fallback with deterministic hue per email/name. Sizes xs/sm/md/lg. Circle or rounded."
    >
      <Variant label="Sizes">
        <Avatar user={USERS[0]} size="xs" />
        <Avatar user={USERS[0]} size="sm" />
        <Avatar user={USERS[0]} size="md" />
        <Avatar user={USERS[0]} size="lg" />
      </Variant>
      <Variant label="Several users (hue hashed)">
        {USERS.map((u) => (
          <Avatar key={u.email} user={u} size="md" showTooltip />
        ))}
      </Variant>
      <Variant label="Rounded shape">
        <Avatar user={USERS[1]} size="lg" shape="rounded" />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Toggle -------------------------------

export function ToggleStory() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <StoryPanel title="Toggle" description="Switch with inline label + hint.">
      <Variant label="Bare">
        <Toggle checked={a} onChange={setA} />
      </Variant>
      <Variant label="With label and hint">
        <Toggle
          checked={b}
          onChange={setB}
          label="Email notifications"
          hint="Daily digest at 9am local time."
        />
      </Variant>
      <Variant label="Small, disabled">
        <Toggle checked size="sm" onChange={() => undefined} label="Small" />
        <Toggle checked={false} disabled onChange={() => undefined} label="Disabled" />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- SegmentedControl --------------------

export function SegmentedControlStory() {
  const [view, setView] = useState<"table" | "board" | "chart">("table");
  return (
    <StoryPanel title="SegmentedControl" description="Mutually-exclusive view toggles with optional counts.">
      <Variant label="Basic">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Table" },
            { value: "board", label: "Board" },
            { value: "chart", label: "Chart" },
          ]}
        />
      </Variant>
      <Variant label="With counts">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Open", count: 12 },
            { value: "board", label: "Review", count: 3 },
            { value: "chart", label: "Done", count: 48 },
          ]}
        />
      </Variant>
      <Variant label="Small">
        <SegmentedControl
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "A" },
            { value: "board", label: "B" },
            { value: "chart", label: "C" },
          ]}
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Modal --------------------------------

export function ModalStory() {
  const [size, setSize] = useState<"sm" | "md" | "lg" | "xl" | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <StoryPanel
      title="Modal"
      description="Four sizes, optional title/footer, dismissible flag, initialFocusRef."
    >
      <Variant label="Open a modal">
        <Stack direction="row" spacing={1.5}>
          <Button onClick={() => setSize("sm")}>Small</Button>
          <Button onClick={() => setSize("md")}>Medium</Button>
          <Button onClick={() => setSize("lg")}>Large</Button>
          <Button onClick={() => setSize("xl")}>XL</Button>
        </Stack>
      </Variant>
      <Modal
        open={size !== null}
        onClose={() => setSize(null)}
        size={size ?? "md"}
        title={`${size?.toUpperCase() ?? ""} Modal`}
        initialFocusRef={inputRef}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSize(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => setSize(null)}>Confirm</Button>
          </>
        }
      >
        <TextInput
          inputRef={inputRef}
          label="Focus lands here on open"
          placeholder="autofocused via initialFocusRef"
        />
      </Modal>
    </StoryPanel>
  );
}

// ----------------------------- Drawer -------------------------------

export function DrawerStory() {
  const [side, setSide] = useState<"left" | "right" | null>(null);
  return (
    <StoryPanel title="Drawer" description="Side panel with title/footer; opens from left or right.">
      <Variant label="Open">
        <Stack direction="row" spacing={1.5}>
          <Button onClick={() => setSide("right")}>Right drawer</Button>
          <Button variant="secondary" onClick={() => setSide("left")}>Left drawer</Button>
        </Stack>
      </Variant>
      <Drawer
        open={side !== null}
        onClose={() => setSide(null)}
        side={side ?? "right"}
        title="Edit record"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSide(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => setSide(null)}>Save</Button>
          </>
        }
      >
        <Stack spacing={2}>
          <TextInput label="Name" />
          <TextArea label="Notes" minRows={4} />
        </Stack>
      </Drawer>
    </StoryPanel>
  );
}

// ----------------------------- Skeleton -----------------------------

export function SkeletonStory() {
  return (
    <StoryPanel title="Skeleton" description="Base Skeleton (passthrough), SkeletonText, and SkeletonBlock.">
      <Variant label="Base variants">
        <Stack spacing={1} sx={{ width: 320 }}>
          <Skeleton variant="text" />
          <Skeleton variant="rectangular" height={60} />
          <Skeleton variant="circular" width={40} height={40} />
        </Stack>
      </Variant>
      <Variant label="SkeletonText — 4 lines">
        <Box sx={{ width: 420 }}>
          <SkeletonText lines={4} />
        </Box>
      </Variant>
      <Variant label="SkeletonBlock">
        <SkeletonBlock height={100} width={320} />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Tabs ---------------------------------

export function TabsStory() {
  const [tab, setTab] = useState<"overview" | "activity" | "settings">("overview");
  return (
    <StoryPanel title="Tabs" description="In-page tab bar (not the SubAppHeader). Supports counts per tab.">
      <Variant label="Basic">
        <Box sx={{ width: 520 }}>
          <Tabs
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "activity", label: "Activity", count: 7 },
              { id: "settings", label: "Settings" },
            ]}
            activeId={tab}
            onChange={setTab}
          />
          <Box sx={{ p: 2, color: "text.secondary" }}>Active: {tab}</Box>
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Tooltip ------------------------------

export function TooltipStory() {
  return (
    <StoryPanel title="Tooltip" description="Thin wrapper over MUI Tooltip; no-op when content is empty.">
      <Variant label="Placements">
        <Tooltip content="top (default)"><Button>Top</Button></Tooltip>
        <Tooltip content="bottom" placement="bottom"><Button>Bottom</Button></Tooltip>
        <Tooltip content="left" placement="left"><Button>Left</Button></Tooltip>
        <Tooltip content="right" placement="right"><Button>Right</Button></Tooltip>
      </Variant>
      <Variant label="Empty content ⇒ no tooltip wrapper">
        <Tooltip content=""><Button>No tooltip</Button></Tooltip>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Menu + MeatballMenu ------------------

export function MenuStory() {
  const [last, setLast] = useState("—");
  return (
    <StoryPanel
      title="Menu / MeatballMenu"
      description="Menu takes a trigger render-prop. MeatballMenu is a specialization with a dots trigger."
    >
      <Variant label="MeatballMenu">
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <MeatballMenu
            items={[
              { id: "edit", label: "Edit", icon: <EditIcon style={{ fontSize: 14 }}/> },
              { id: "star", label: "Favorite", icon: <StarIcon style={{ fontSize: 14 }}/> },
              "divider",
              { id: "delete", label: "Delete", icon: <DeleteIcon style={{ fontSize: 14 }}/>, danger: true },
            ]}
            onSelect={setLast}
          />
          <Typography variant="caption">Last selected: {last}</Typography>
        </Stack>
      </Variant>
      <Variant label="Menu with custom trigger">
        <Menu
          items={[
            { id: "export-csv", label: "Export as CSV" },
            { id: "export-xlsx", label: "Export as XLSX" },
            { id: "export-pdf", label: "Export as PDF" },
          ]}
          onSelect={setLast}
          trigger={({ toggle }) => (
            <Button variant="secondary" onClick={toggle} trailing={<span>▾</span>}>
              Export
            </Button>
          )}
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- TwoPane ------------------------------

export function TwoPaneStory() {
  return (
    <StoryPanel
      title="TwoPane"
      description="Left + right panes. 'fixed' uses a static leftWidth; 'resizable' adds a drag handle."
    >
      <Variant label="Fixed">
        <Box sx={{ width: 720, height: 220, border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <TwoPane
            leftWidth={200}
            left={<Box sx={{ p: 2 }}><strong>Left pane</strong><br /><small>fixed 200px</small></Box>}
            right={<Box sx={{ p: 2 }}>Right pane (flex)</Box>}
          />
        </Box>
      </Variant>
      <Variant label="Resizable (drag the divider)">
        <Box sx={{ width: 720, height: 220, border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <TwoPane
            split="resizable"
            leftWidth={240}
            left={<Box sx={{ p: 2 }}><strong>Left pane</strong></Box>}
            right={<Box sx={{ p: 2 }}>Drag the divider to resize me.</Box>}
          />
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- LeftRailWorkspace -------------------

export function LeftRailWorkspaceStory() {
  const [sel, setSel] = useState<string>("c-01");
  const items = [
    { id: "c-01", label: "Nikita Shaw", meta: "Due Nov 5 · 3 open tasks" },
    { id: "c-02", label: "Priya Rao", meta: "Due Nov 8 · 5 open tasks" },
    { id: "c-03", label: "Omar Khan", meta: "Due Nov 12 · 1 open task" },
    { id: "c-04", label: "Mika Tanaka", meta: "Done" },
  ];
  return (
    <StoryPanel
      title="LeftRailWorkspace"
      description="Case/thread list on the left + workspace on the right. Supports header, search, footer slots."
    >
      <Variant label="Onboarding-style">
        <Box sx={{ width: 820, height: 320, border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <LeftRailWorkspace
            rail={{
              items,
              selectedId: sel,
              onSelect: setSel,
              header: <strong>New hires</strong>,
              search: <TextInput placeholder="Search…" />,
              footer: <Button size="sm" variant="secondary">New case</Button>,
            }}
          >
            <Box sx={{ p: 3 }}>
              <Typography variant="h6">Selected: {sel}</Typography>
              <Typography variant="body2" color="text.secondary">
                Right-hand workspace. Swap in your task board, timeline, or form.
              </Typography>
            </Box>
          </LeftRailWorkspace>
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DashboardShell ----------------------

export function DashboardShellStory() {
  return (
    <StoryPanel
      title="DashboardShell"
      description="Canonical KPI row + filter row + content, with optional right secondary rail."
    >
      <Variant label="With KPIs + filters + secondary">
        <DashboardShell
          kpis={
            <KpiRow>
              <KpiTile label="Headcount" value="4,218" delta={{ value: "+42", direction: "up", tone: "positive" }} />
              <KpiTile label="Attrition" value="7.2%" delta={{ value: "-0.4pp", direction: "down", tone: "positive" }} />
              <KpiTile label="Open roles" value="124" delta={{ value: "+18", direction: "up", tone: "neutral" }} />
              <KpiTile label="Cost / FTE" value="$132k" delta={{ value: "flat", direction: "flat", tone: "neutral" }} />
            </KpiRow>
          }
          filters={
            <Card padding="sm">
              <Stack direction="row" spacing={1}>
                <Chip tone="info">Q4 2026</Chip>
                <Chip tone="neutral" onDelete={() => undefined}>Engineering</Chip>
                <Chip tone="neutral" onDelete={() => undefined}>US</Chip>
              </Stack>
            </Card>
          }
          primary={
            <Card>
              <Card.Header>
                <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Headcount trend</Typography>
              </Card.Header>
              <Card.Body>
                <TrendChart
                  series={[{ id: "hc", label: "Headcount", points: [1, 2, 3, 4, 5, 6, 7, 8].map((m) => ({ x: `M${m}`, y: 3800 + m * 50 + Math.round(Math.random() * 30) })) }]}
                  height={200}
                />
              </Card.Body>
            </Card>
          }
          secondary={
            <Card>
              <Card.Header>
                <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>Insights</Typography>
              </Card.Header>
              <Card.Body>
                <Stack spacing={1.5}>
                  <Banner tone="warning" title="3 teams above budget" />
                  <Banner tone="success" title="Hiring up 12% MoM" />
                </Stack>
              </Card.Body>
            </Card>
          }
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- KpiTile / KpiRow --------------------

export function KpiTileStory() {
  return (
    <StoryPanel
      title="KpiTile / KpiRow"
      description="Metric tile with value, delta, optional sparkline, footnote. KpiRow lays them out responsively."
    >
      <Variant label="Row of 4">
        <Box sx={{ width: "100%", maxWidth: 920 }}>
          <KpiRow>
            <KpiTile label="Revenue" value="$12.4M" delta={{ value: "+8%", direction: "up", tone: "positive" }} />
            <KpiTile label="Churn" value="2.1%" delta={{ value: "-0.3pp", direction: "down", tone: "positive" }} />
            <KpiTile label="NPS" value="42" delta={{ value: "flat", direction: "flat", tone: "neutral" }} footnote="vs last quarter" />
            <KpiTile
              label="Signups"
              value="1,284"
              delta={{ value: "+12%", direction: "up", tone: "positive" }}
              sparkline={{ points: [12, 18, 15, 22, 24, 30, 28, 36] }}
            />
          </KpiRow>
        </Box>
      </Variant>
      <Variant label="Clickable">
        <Box sx={{ width: 240 }}>
          <KpiTile label="Open roles" value="124" footnote="Click to open the list" onClick={() => alert("drill in")} />
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Sparkline ---------------------------

export function SparklineStory() {
  return (
    <StoryPanel title="Sparkline" description="Tiny SVG trend. Area + stroke, tone-controlled.">
      <Variant label="Tones">
        <Sparkline points={[3, 5, 2, 8, 6, 10, 7, 12]} tone="accent" />
        <Sparkline points={[12, 10, 11, 9, 8, 6, 7, 5]} tone="danger" />
        <Sparkline points={[4, 4, 5, 5, 6, 7, 7, 8]} tone="success" />
      </Variant>
      <Variant label="Line only (no area)">
        <Sparkline points={[1, 3, 2, 5, 4, 7, 6]} showArea={false} width={160} height={32} />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- TrendChart --------------------------

export function TrendChartStory() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const build = (base: number, step: number) =>
    months.map((m, i) => ({ x: m, y: base + step * i + Math.round(Math.random() * 20) }));
  return (
    <StoryPanel
      title="TrendChart"
      description="Hand-rolled SVG line chart. Multiple series, annotations, forecastFrom (dashed tail), target line."
    >
      <Variant label="Single series + target">
        <TrendChart
          series={[{ id: "hc", label: "Headcount", points: build(400, 10), tone: "accent" }]}
          target={520}
          yFormat={(y) => y.toLocaleString()}
          width={720}
        />
      </Variant>
      <Variant label="Multiple series with annotations and forecast">
        <TrendChart
          series={[
            { id: "hires", label: "Hires", points: build(20, 2), tone: "success" },
            { id: "exits", label: "Exits", points: build(10, 1), tone: "danger" },
          ]}
          annotations={[{ x: "Jul", label: "Hiring freeze lifted" }]}
          forecastFrom="Oct"
          width={720}
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Heatmap -----------------------------

export function HeatmapStory() {
  const rows = ["Engineering", "Sales", "Marketing", "G&A", "Ops"];
  const cols = ["Q1", "Q2", "Q3", "Q4"];
  const values = rows.map((_, r) =>
    cols.map((_, c) => Math.round((Math.sin(r * 0.5 + c) + 1) * 25 + 10)),
  );
  return (
    <StoryPanel
      title="Heatmap"
      description="Grid of values with a palette-driven color scale. Cells can be click targets."
    >
      <Variant label="Attrition by dept × quarter">
        <Heatmap
          rows={rows}
          cols={cols}
          values={values}
          format={(v) => `${v}%`}
          onCellClick={(r, c, v) => alert(`${r} / ${c}: ${v}%`)}
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DistributionBar ---------------------

export function DistributionBarStory() {
  return (
    <StoryPanel
      title="DistributionBar"
      description="Stacked horizontal bar of segments with proportional widths and a legend."
    >
      <Variant label="Compensation decisions">
        <Box sx={{ width: 520 }}>
          <DistributionBar
            segments={[
              { id: "approved", label: "Approved", value: 182, tone: "success" },
              { id: "pending", label: "Pending", value: 48, tone: "warning" },
              { id: "sent-back", label: "Sent back", value: 14, tone: "danger" },
            ]}
          />
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- CohortCurve -------------------------

export function CohortCurveStory() {
  const curve = (base: number) =>
    Array.from({ length: 12 }, (_, i) => Math.max(0, Math.min(1, base - i * 0.07 - Math.random() * 0.03)));
  return (
    <StoryPanel
      title="CohortCurve"
      description="Retention curves per cohort over N periods. 0..1 values, period label format pluggable."
    >
      <Variant label="Hire cohorts, 12-month retention">
        <CohortCurve
          periods={12}
          periodLabel={(i) => `M${i}`}
          cohorts={[
            { id: "q1-25", label: "2025 Q1 hires", retention: curve(1), tone: "accent" },
            { id: "q2-25", label: "2025 Q2 hires", retention: curve(1), tone: "success" },
            { id: "q3-25", label: "2025 Q3 hires", retention: curve(1), tone: "warning" },
          ]}
          width={720}
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- MeterBar / ProgressBar --------------

export function MeterBarStory() {
  return (
    <StoryPanel
      title="MeterBar / ProgressBar"
      description="MeterBar is the general meter (compa-ratio, budget) with target line + tone thresholds. ProgressBar wraps it for 0..100."
    >
      <Variant label="MeterBar — compa-ratio with thresholds">
        <Stack spacing={2} sx={{ width: 420 }}>
          <MeterBar
            value={1.08}
            min={0.8}
            max={1.3}
            target={1.0}
            label="Compa-ratio"
            valueFormat={(v) => v.toFixed(2)}
            thresholds={[
              { at: 0.8, tone: "danger" },
              { at: 0.95, tone: "warning" },
              { at: 1.0, tone: "success" },
              { at: 1.2, tone: "warning" },
            ]}
            showScale
          />
          <MeterBar
            value={0.82}
            min={0.8}
            max={1.3}
            target={1.0}
            label="Below band"
            valueFormat={(v) => v.toFixed(2)}
            thresholds={[
              { at: 0.8, tone: "danger" },
              { at: 0.95, tone: "warning" },
              { at: 1.0, tone: "success" },
            ]}
          />
        </Stack>
      </Variant>
      <Variant label="ProgressBar">
        <Stack spacing={1.5} sx={{ width: 420 }}>
          <ProgressBar value={32} label="Onboarding tasks" />
          <ProgressBar value={78} label="PIP milestones" tone="success" />
          <ProgressBar value={95} label="Nearly done" tone="warning" />
        </Stack>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DataTable ---------------------------

type Row = { id: string; name: string; dept: string; comp: number; status: "Approved" | "Pending" | "Sent back" };

const SEED_ROWS: Row[] = [
  { id: "r1", name: "Ada Lovelace", dept: "Engineering", comp: 182_000, status: "Approved" },
  { id: "r2", name: "Grace Hopper", dept: "Engineering", comp: 195_000, status: "Pending" },
  { id: "r3", name: "Katherine Johnson", dept: "Research", comp: 168_000, status: "Approved" },
  { id: "r4", name: "Linus T", dept: "Infra", comp: 210_000, status: "Sent back" },
  { id: "r5", name: "Priya Rao", dept: "Design", comp: 142_000, status: "Approved" },
  { id: "r6", name: "Omar Khan", dept: "Sales", comp: 156_000, status: "Pending" },
  { id: "r7", name: "Mika Tanaka", dept: "Engineering", comp: 174_000, status: "Approved" },
  { id: "r8", name: "Elena Petrova", dept: "Marketing", comp: 128_000, status: "Pending" },
];

const STATUS_TONE: Record<Row["status"], "success" | "warning" | "danger"> = {
  Approved: "success",
  Pending: "warning",
  "Sent back": "danger",
};

export function DataTableStory() {
  const [sort, setSort] = useState<SortState | null>({ id: "comp", direction: "desc" });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [rows, setRows] = useState<Row[]>(SEED_ROWS);

  const sortedRows = (() => {
    if (!sort) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sort.id];
      const bv = (b as Record<string, unknown>)[sort.id];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  })();
  const paged = sortedRows.slice(page * pageSize, (page + 1) * pageSize);

  const columns: DataTableColumn<Row>[] = [
    { id: "name", header: "Name", render: (r) => r.name, sortable: true },
    { id: "dept", header: "Department", render: (r) => r.dept, sortable: true },
    {
      id: "comp",
      header: "Compensation",
      align: "right",
      sortable: true,
      editable: true,
      render: (r) => `$${r.comp.toLocaleString()}`,
      renderEditor: (r, commit, cancel) => (
        <NumberInput
          autoFocus
          value={r.comp}
          onChange={(next) => {
            if (next === "") return;
            setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, comp: next } : x)));
            commit();
          }}
          onBlur={cancel}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      render: (r) => <Chip tone={STATUS_TONE[r.status]}>{r.status}</Chip>,
    },
  ];

  return (
    <StoryPanel
      title="DataTable<T>"
      description="Sortable, selectable, paginated, inline-editable. Click the Compensation cell to edit. All state is controlled by the host."
    >
      <Variant label="Full-featured">
        <Box sx={{ width: "100%" }}>
          <DataTable<Row>
            data={paged}
            columns={columns}
            rowKey={(r) => r.id}
            sort={sort}
            onSortChange={setSort}
            selection="multi"
            selectedIds={selected}
            onSelectionChange={setSelected}
            onRowClick={(r) => alert(`Row click: ${r.name}`)}
            pagination={{
              page,
              pageSize,
              total: rows.length,
              onPageChange: setPage,
              onPageSizeChange: (s) => {
                setPageSize(s);
                setPage(0);
              },
              pageSizeOptions: [5, 10, 25],
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
            Selected: {selected.join(", ") || "none"}
          </Typography>
        </Box>
      </Variant>
      <Variant label="Loading state (skeleton rows)">
        <DataTable<Row>
          data={[]}
          columns={columns}
          rowKey={(r) => r.id}
          loading
          skeletonRows={4}
        />
      </Variant>
      <Variant label="Empty state">
        <DataTable<Row>
          data={[]}
          columns={columns}
          rowKey={(r) => r.id}
          emptyState={
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>No rows match these filters</Typography>
              <Typography variant="caption" color="text.secondary">Clear the filter chips to see all rows.</Typography>
            </Box>
          }
        />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DateRangePicker ---------------------

export function DateRangePickerStory() {
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  return (
    <StoryPanel
      title="DateRangePicker"
      description="Preset list + two native date inputs. Returns { from, to } as Date | null."
    >
      <Variant label="Default (with preset list)">
        <DateRangePicker value={range} onChange={setRange} label="Period" />
      </Variant>
      <Variant label="Selected value">
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {range.from ? range.from.toDateString() : "—"} → {range.to ? range.to.toDateString() : "—"}
        </Typography>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- MonthYearPicker ---------------------

export function MonthYearPickerStory() {
  const [v, setV] = useState({ month: 11, year: 2026 });
  return (
    <StoryPanel
      title="MonthYearPicker"
      description="Month select + year number input, with min/max year bounds."
    >
      <Variant label="Default">
        <Box sx={{ width: 320 }}>
          <MonthYearPicker value={v} onChange={setV} label="Cycle" minYear={2000} maxYear={2050} />
        </Box>
      </Variant>
      <Variant label="Selected">
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {new Date(v.year, v.month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" })}
        </Typography>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- PeoplePicker ------------------------

const DIRECTORY: UserRef[] = [
  { id: "u-ada", name: "Ada Lovelace", email: "ada@orca.dev" },
  { id: "u-grace", name: "Grace Hopper", email: "grace@orca.dev" },
  { id: "u-kj", name: "Katherine Johnson", email: "kj@orca.dev" },
  { id: "u-linus", name: "Linus T", email: "linus@orca.dev" },
  { id: "u-priya", name: "Priya Rao", email: "priya@orca.dev" },
  { id: "u-omar", name: "Omar Khan", email: "omar@orca.dev" },
  { id: "u-mika", name: "Mika Tanaka", email: "mika@orca.dev" },
  { id: "u-elena", name: "Elena Petrova", email: "elena@orca.dev" },
];

const DEMO_SOURCE: PeopleSource = {
  search: (q) =>
    new Promise((resolve) => {
      // Simulate network latency.
      window.setTimeout(() => {
        const lq = q.toLowerCase();
        resolve(DIRECTORY.filter((u) => u.name.toLowerCase().includes(lq) || (u.email ?? "").toLowerCase().includes(lq)));
      }, 180);
    }),
};

export function PeoplePickerStory() {
  const [one, setOne] = useState<UserRef | null>(null);
  const [many, setMany] = useState<UserRef[]>([DIRECTORY[0]]);
  return (
    <StoryPanel
      title="PeoplePicker / PeoplePickerMulti"
      description="Async people search. Apps inject a PeopleSource adapter; results debounced and deduped against selection."
    >
      <Variant label="Single select">
        <Box sx={{ width: 360 }}>
          <PeoplePicker value={one} onChange={setOne} source={DEMO_SOURCE} label="Approver" placeholder="Search people…" />
        </Box>
      </Variant>
      <Variant label="Multi-select (max 4)">
        <Box sx={{ width: 480 }}>
          <PeoplePickerMulti value={many} onChange={setMany} source={DEMO_SOURCE} label="Reviewers" placeholder="Add reviewers…" max={4} />
        </Box>
      </Variant>
      <Variant label="Selection">
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Single: {one ? one.name : "—"} · Multi: {many.map((u) => u.name).join(", ") || "—"}
        </Typography>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- AuditLog ----------------------------

export function AuditLogStory() {
  const now = new Date();
  const t = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);
  const entries = [
    { id: "a1", at: t(5), actor: DIRECTORY[0], action: "approved", target: "Comp cycle Q4" },
    { id: "a2", at: t(42), actor: DIRECTORY[2], action: "sent back", target: "Opening #248", detail: "Needs rationale for the salary band override." },
    { id: "a3", at: t(130), actor: DIRECTORY[1], action: "commented on", target: "Hiring plan v3" },
    { id: "a4", at: t(60 * 26), actor: DIRECTORY[3], action: "created", target: "Request R-914" },
    { id: "a5", at: t(60 * 50), actor: DIRECTORY[4], action: "exported", target: "Pay-equity report" },
  ];
  return (
    <StoryPanel
      title="AuditLog"
      description="Chronological activity entries. Groups by day with sticky headers (groupBy='none' to flatten)."
    >
      <Variant label="Grouped by day">
        <Box sx={{ width: 560, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          <AuditLog entries={entries} maxHeight={320} />
        </Box>
      </Variant>
      <Variant label="Ungrouped">
        <Box sx={{ width: 560, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
          <AuditLog entries={entries.slice(0, 3)} groupBy="none" />
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- FilterBar ---------------------------

const FILTER_SPECS: FilterSpec[] = [
  { kind: "search", id: "q", label: "Search", placeholder: "Search people, roles, requests…" },
  {
    kind: "multiselect",
    id: "dept",
    label: "Department",
    options: [
      { value: "eng", label: "Engineering", count: 128 },
      { value: "sales", label: "Sales", count: 42 },
      { value: "mkt", label: "Marketing", count: 18 },
      { value: "ga", label: "G&A", count: 14 },
    ],
  },
  {
    kind: "select",
    id: "region",
    label: "Region",
    options: [
      { value: "us", label: "US" },
      { value: "eu", label: "EU" },
      { value: "apac", label: "APAC" },
    ],
  },
  { kind: "daterange", id: "period", label: "Period" },
  { kind: "toggle", id: "openOnly", label: "Open only" },
];

const INITIAL_FILTER_STATE: FilterState = {
  q: "",
  dept: [],
  region: "",
  period: { from: null, to: null },
  openOnly: false,
};

export function FilterBarStory() {
  const [state, setState] = useState<FilterState>(INITIAL_FILTER_STATE);
  return (
    <StoryPanel
      title="FilterBar"
      description="Composite row of search, select, multiselect, daterange, toggle filters. Active values appear as chips."
    >
      <Variant label="Full feature set">
        <Box sx={{ width: "100%" }}>
          <FilterBar
            filters={FILTER_SPECS}
            value={state}
            onChange={setState}
            onReset={() => setState(INITIAL_FILTER_STATE)}
          />
        </Box>
      </Variant>
      <Variant label="State snapshot">
        <Box
          component="pre"
          sx={{
            fontFamily: '"JetBrains Mono", Consolas, monospace',
            fontSize: "0.75rem",
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 1,
            p: 1.5,
            overflow: "auto",
            maxWidth: 640,
          }}
        >
          {JSON.stringify(state, null, 2)}
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Wizard ------------------------------

type WizardId = "role" | "candidate" | "comp" | "review";
const WIZARD_STEPS: WizardStep<WizardId>[] = [
  { id: "role", label: "Role", description: "Pick an opening to fill" },
  { id: "candidate", label: "Candidate", description: "Finalist details" },
  { id: "comp", label: "Compensation", description: "Base + equity + bonus", optional: true },
  { id: "review", label: "Review", description: "Confirm & submit" },
];

export function WizardStory() {
  const [stepId, setStepId] = useState<WizardId>("role");
  const [role, setRole] = useState("");
  const [candidate, setCandidate] = useState("");
  const [comp, setComp] = useState<number | "">("");
  const [done, setDone] = useState(false);

  const validation: Partial<Record<WizardId, WizardValidationState>> = {
    role: role ? { valid: true } : { valid: false, message: "Pick a role to continue" },
    candidate: candidate ? { valid: true } : { valid: false, message: "Candidate name is required" },
    comp: { valid: true }, // optional
    review: { valid: true },
  };

  return (
    <StoryPanel
      title="Wizard"
      description="Multi-step shell with validation gates. The shell owns navigation + progress; the host renders each step body."
    >
      <Variant label="4-step example">
        <Box sx={{ width: "100%", maxWidth: 820, border: 1, borderColor: "divider", borderRadius: 1.5, p: 3 }}>
          {done ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 650 }}>Submitted!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Role: {role} · Candidate: {candidate} · Comp: {comp || "—"}
              </Typography>
              <Button
                variant="secondary"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setDone(false);
                  setStepId("role");
                  setRole("");
                  setCandidate("");
                  setComp("");
                }}
              >
                Reset
              </Button>
            </Box>
          ) : (
            <Wizard<WizardId>
              steps={WIZARD_STEPS}
              activeStepId={stepId}
              onNavigate={setStepId}
              validation={validation}
              onFinish={() => setDone(true)}
              renderStep={(step) => {
                switch (step.id) {
                  case "role":
                    return (
                      <Stack spacing={2}>
                        <Typography variant="h6">Pick the role</Typography>
                        <Select<string>
                          label="Opening"
                          value={role}
                          onChange={setRole}
                          placeholder="Select…"
                          options={[
                            { value: "swe-sr", label: "Senior Software Engineer" },
                            { value: "pm", label: "Product Manager" },
                            { value: "ds", label: "Data Scientist" },
                          ]}
                        />
                      </Stack>
                    );
                  case "candidate":
                    return (
                      <Stack spacing={2}>
                        <Typography variant="h6">Candidate</Typography>
                        <TextInput
                          label="Full name"
                          value={candidate}
                          onChange={(e) => setCandidate(e.target.value)}
                        />
                      </Stack>
                    );
                  case "comp":
                    return (
                      <Stack spacing={2}>
                        <Typography variant="h6">Compensation</Typography>
                        <NumberInput label="Base salary" value={comp} onChange={setComp} min={0} />
                        <Typography variant="caption" color="text.secondary">
                          Optional — skip to finalize without a comp recommendation.
                        </Typography>
                      </Stack>
                    );
                  case "review":
                    return (
                      <Stack spacing={1.5}>
                        <Typography variant="h6">Review</Typography>
                        <Box>Role: <strong>{role || "—"}</strong></Box>
                        <Box>Candidate: <strong>{candidate || "—"}</strong></Box>
                        <Box>Comp: <strong>{comp || "— (skipped)"}</strong></Box>
                      </Stack>
                    );
                }
              }}
            />
          )}
        </Box>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- Timeline ----------------------------

export function TimelineStory() {
  const base = new Date("2026-10-15").getTime();
  const DAY = 86_400_000;
  const items: TimelineItem[] = [
    { id: "t1", date: new Date(base), title: "Offer accepted", detail: "Signed via DocuSign", tone: "success" },
    { id: "t2", date: new Date(base + 7 * DAY), title: "Background check cleared", tone: "success" },
    { id: "t3", date: new Date(base + 14 * DAY), title: "Day 1 — Orientation", detail: "Office tour + IT setup" },
    { id: "t4", date: new Date(base + 30 * DAY), title: "First 1:1 with manager", tone: "accent" },
    { id: "t5", date: new Date(base + 60 * DAY), title: "30-day check-in", tone: "accent" },
    { id: "t6", date: new Date(base + 90 * DAY), title: "Probation review", detail: "Formal sign-off", tone: "warning" },
  ];
  return (
    <StoryPanel
      title="Timeline"
      description="Chronological milestones with tonal dots. Pre-existing orca-ui need: onboarding, offboarding, PIP milestones. Vertical only; horizontal reserved for future."
    >
      <Variant label="Default (ascending)">
        <div style={{ width: 560 }}>
          <Timeline items={items} />
        </div>
      </Variant>
      <Variant label="Grouped by month, reversed">
        <div style={{ width: 560 }}>
          <Timeline items={items} groupBy="month" reverse />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- ExpandableTaskCard ------------------

export function ExpandableTaskCardStory() {
  const [expanded, setExpanded] = useState(false);
  return (
    <StoryPanel
      title="ExpandableTaskCard"
      description="Task row that collapses to a one-liner. Replaces onboarding Workspace task cards and offboarding TaskBoard items."
    >
      <Variant label="Collapsed by default">
        <div style={{ width: 760, display: "flex", flexDirection: "column", gap: 8 }}>
          <ExpandableTaskCard
            title="Create IT accounts"
            status="success"
            owner={{ id: "u1", name: "Ada Lovelace", email: "ada@orca.dev" }}
            due="2026-11-15"
            summary="Provisioned Okta, Slack, GitHub."
          >
            <p style={{ margin: 0 }}>
              Full task details go here — checklists, attachments, related records, comments.
            </p>
          </ExpandableTaskCard>
          <ExpandableTaskCard
            title="Order laptop + peripherals"
            status="warning"
            statusLabel="IN PROGRESS"
            owner={{ id: "u2", name: "Grace Hopper", email: "grace@orca.dev" }}
            due="2026-11-18"
            summary="MacBook Pro 14 — tracking # pending"
          >
            <p style={{ margin: 0 }}>Shipment arrives Nov 17. Vendor: Apple Business.</p>
          </ExpandableTaskCard>
          <ExpandableTaskCard
            title="Compliance training"
            status="error"
            statusLabel="OVERDUE"
            due="2026-11-01"
            summary="Required: security + harassment"
          >
            <p style={{ margin: 0 }}>Modules outstanding: Security 101, Anti-harassment, Code of conduct.</p>
          </ExpandableTaskCard>
        </div>
      </Variant>
      <Variant label="Controlled expanded">
        <div style={{ width: 760 }}>
          <ExpandableTaskCard
            title="Review controlled card"
            status="info"
            summary="This card's expand state is controlled by the host."
            expanded={expanded}
            onToggle={setExpanded}
          >
            Expanded via <code>expanded</code> prop. Toggle: <Button size="sm" onClick={() => setExpanded((v) => !v)}>{expanded ? "Collapse" : "Expand"}</Button>
          </ExpandableTaskCard>
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- EvidencePanel -----------------------

export function EvidencePanelStory() {
  const citations: Citation[] = [
    {
      id: "c1",
      label: "Shipped the pricing redesign ahead of schedule",
      source: "Launch retro · Q3 2026",
      snippet: "Delivered 2 weeks early with zero rollback. Conversion rate +4.2% in first month.",
    },
    {
      id: "c2",
      label: "Mentored two new engineers",
      source: "Peer feedback · 2026-10-04",
      snippet: "Ada took time out of every week for 1:1s and set up a mentoring curriculum.",
    },
    {
      id: "c3",
      label: "Championed the migration RFC",
      source: "Architecture doc",
      href: "https://example.com/rfc-42",
    },
  ];
  return (
    <StoryPanel
      title="EvidencePanel"
      description="Citation list used in performance reviews — each entry links back to its source, with optional pull-quote."
    >
      <Variant label="Three citations">
        <div style={{ width: 560 }}>
          <EvidencePanel
            title="Supporting evidence"
            citations={citations}
            onOpen={(c) => alert(`Open: ${c.label}`)}
          />
        </div>
      </Variant>
      <Variant label="Empty">
        <div style={{ width: 560 }}>
          <EvidencePanel citations={[]} />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- NotificationsTray -------------------

export function NotificationsTrayStory() {
  const [items, setItems] = useState<NotificationItem[]>([
    {
      id: "n1",
      title: "Approval requested",
      detail: "Compensation Q4 cycle — 3 proposals waiting",
      at: new Date(Date.now() - 5 * 60_000),
      read: false,
      tone: "warning",
      action: { label: "Review now", onClick: () => alert("review") },
    },
    {
      id: "n2",
      title: "Hiring plan v3 was approved",
      detail: "By Grace Hopper",
      at: new Date(Date.now() - 42 * 60_000),
      read: false,
      tone: "success",
    },
    {
      id: "n3",
      title: "A pay-equity flag was dismissed",
      at: new Date(Date.now() - 3 * 3_600_000),
      read: true,
      tone: "info",
    },
  ]);
  return (
    <StoryPanel
      title="NotificationsTray"
      description="Persistent inbox tray with unread count, mark-read, dismiss, and per-item quick action."
    >
      <Variant label="With unread">
        <NotificationsTray
          items={items}
          onDismiss={(id) => setItems((xs) => xs.filter((x) => x.id !== id))}
          onMarkRead={(id) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x)))}
          onMarkAllRead={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))}
        />
      </Variant>
      <Variant label="Empty">
        <NotificationsTray items={[]} onDismiss={() => undefined} onMarkRead={() => undefined} />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- EmployeeDrawer ----------------------

export function EmployeeDrawerStory() {
  const [open, setOpen] = useState(false);
  const user: UserRef = {
    id: "u-ada",
    name: "Ada Lovelace",
    email: "ada@orca.dev",
  };
  const sections: EmployeeDrawerSection[] = [
    {
      id: "overview",
      title: "Overview",
      defaultOpen: true,
      render: () => (
        <div>
          <DetailRow label="Role">Senior Software Engineer</DetailRow>
          <DetailRow label="Department">Platform</DetailRow>
          <DetailRow label="Location">London, UK</DetailRow>
          <DetailRow label="Manager">Grace Hopper</DetailRow>
        </div>
      ),
    },
    {
      id: "comp",
      title: "Compensation",
      render: () => (
        <div>
          <DetailRow label="Base salary">$182,000</DetailRow>
          <DetailRow label="Compa-ratio">1.08</DetailRow>
          <DetailRow label="Last review">+6% · 2026-04-01</DetailRow>
        </div>
      ),
    },
    {
      id: "pto",
      title: "Time off",
      render: () => (
        <div>
          <DetailRow label="Days used">12 / 25</DetailRow>
          <DetailRow label="Next planned">Dec 22 – Jan 2</DetailRow>
        </div>
      ),
    },
  ];
  return (
    <StoryPanel
      title="EmployeeDrawer"
      description="Drawer specialization with user header + collapsible sections. Host provides the sections; drawer owns the chrome."
    >
      <Variant label="Open">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Open employee drawer
        </Button>
      </Variant>
      <EmployeeDrawer
        open={open}
        onClose={() => setOpen(false)}
        user={user}
        subtitle="Senior Software Engineer · Platform"
        sections={sections}
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button variant="primary">Edit profile</Button>
          </>
        }
      />
    </StoryPanel>
  );
}

// ----------------------------- StatusPill --------------------------

export function StatusPillStory() {
  const tones: StatusPillTone[] = ["success", "warning", "error", "info", "neutral"];
  return (
    <StoryPanel
      title="StatusPill"
      description="Pre-existing orca-ui pill. Thin wrapper on antd Tag with pill-rounded radius. 5 tones."
    >
      <Variant label="All tones">
        <Space wrap size={8}>
          {tones.map((t) => (
            <StatusPill key={t} tone={t} label={t.toUpperCase()} />
          ))}
        </Space>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- UserChip ----------------------------

export function UserChipStory() {
  return (
    <StoryPanel
      title="UserChip"
      description="Avatar + name + optional title. Pre-existing orca-ui component, now on antd Avatar."
    >
      <Variant label="Sizes">
        <Space direction="vertical" size={12}>
          <UserChip size="sm" name="Ada Lovelace" title="Computing pioneer" />
          <UserChip size="md" name="Grace Hopper" title="Rear Admiral, USN" />
          <UserChip size="lg" name="Katherine Johnson" title="NASA mathematician" />
        </Space>
      </Variant>
      <Variant label="No title">
        <UserChip name="Linus Torvalds" />
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- EmptyState --------------------------

export function EmptyStateStory() {
  return (
    <StoryPanel
      title="EmptyState"
      description="Icon + title + description + optional action. Pre-existing orca-ui component, now on antd Empty."
    >
      <Variant label="With action">
        <div style={{ width: 480, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 16 }}>
          <EmptyState
            icon={<InboxOutlined />}
            title="No requests yet"
            description="Open requests you submit or receive will appear here. Create one to get started."
            action={<Button variant="primary">New request</Button>}
          />
        </div>
      </Variant>
      <Variant label="Minimal">
        <div style={{ width: 320, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 16 }}>
          <EmptyState icon={<InboxOutlined />} title="Nothing here" />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- FormSection -------------------------

export function FormSectionStory() {
  return (
    <StoryPanel
      title="FormSection"
      description="Named section wrapper for form groups. Pre-existing orca-ui component, now on antd Typography + Divider."
    >
      <Variant label="Section with 3 fields">
        <div style={{ width: 480 }}>
          <FormSection title="Profile" description="These details appear on your public card.">
            <TextInput label="Full name" placeholder="Ada Lovelace" />
            <TextInput label="Title" placeholder="Computing pioneer" />
            <TextArea label="Bio" placeholder="A few sentences…" minRows={3} />
          </FormSection>
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- PageHeader --------------------------

export function PageHeaderStory() {
  return (
    <StoryPanel
      title="PageHeader"
      description="Title row with optional back link, subtitle, and action buttons. Pre-existing orca-ui component."
    >
      <Variant label="Full header">
        <div style={{ width: 720, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 20 }}>
          <MemoryRouter>
            <PageHeader
              title="Compensation cycle Q4 2026"
              subtitle="Review and release merit decisions."
              backHref="/cycles"
              actions={
                <>
                  <Button variant="secondary">Export</Button>
                  <Button variant="primary">Release</Button>
                </>
              }
            />
          </MemoryRouter>
        </div>
      </Variant>
      <Variant label="No subtitle, no back">
        <div style={{ width: 720, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 20 }}>
          <PageHeader title="Overview" actions={<Button variant="primary">Create</Button>} />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DetailLayout + DetailRow ------------

export function DetailLayoutStory() {
  return (
    <StoryPanel
      title="DetailLayout / DetailRow"
      description="Detail page shell with title row + content area. DetailRow is the label/value pair used inside."
    >
      <Variant label="Full detail page">
        <div style={{ width: 760, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 20 }}>
          <MemoryRouter>
            <DetailLayout
              title="Ada Lovelace"
              subtitle="Senior Software Engineer · Platform"
              backHref="/people"
              status={<StatusPill tone="success" label="ACTIVE" />}
              avatar={<Avatar user={{ name: "Ada Lovelace", email: "ada@orca.dev" }} size="lg" />}
              actions={<Button variant="primary">Edit profile</Button>}
            >
              <div>
                <DetailRow label="Email">ada@orca.dev</DetailRow>
                <DetailRow label="Department">Engineering</DetailRow>
                <DetailRow label="Manager">Grace Hopper</DetailRow>
                <DetailRow label="Start date">2021-04-15</DetailRow>
                <DetailRow label="Location">London, UK</DetailRow>
              </div>
            </DetailLayout>
          </MemoryRouter>
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- DetailSkeleton ----------------------

export function DetailSkeletonStory() {
  return (
    <StoryPanel
      title="DetailSkeleton"
      description="Loading placeholder for a detail page. Mirrors the DetailLayout shape with skeleton bars."
    >
      <Variant label="Default (no tabs)">
        <div style={{ width: 560, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 20 }}>
          <DetailSkeleton />
        </div>
      </Variant>
      <Variant label="With tabs, more lines">
        <div style={{ width: 560, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, padding: 20 }}>
          <DetailSkeleton tabs lines={8} />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- TableSkeleton -----------------------

export function TableSkeletonStory() {
  return (
    <StoryPanel
      title="TableSkeleton"
      description="Standalone table loading placeholder. For data tables prefer AdminTable's `loading` prop which keeps the real headers visible."
    >
      <Variant label="4-column skeleton">
        <div style={{ width: 760 }}>
          <TableSkeleton columns={4} rows={5} />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- AdminTable --------------------------

interface AdminRow {
  id: string;
  name: string;
  role: string;
  status: StatusPillTone;
  joined: string;
}

const ADMIN_ROWS: AdminRow[] = [
  { id: "u1", name: "Ada Lovelace", role: "Admin", status: "success", joined: "2021-04-15" },
  { id: "u2", name: "Grace Hopper", role: "Admin", status: "success", joined: "2019-01-11" },
  { id: "u3", name: "Linus Torvalds", role: "Viewer", status: "warning", joined: "2024-03-22" },
  { id: "u4", name: "Katherine Johnson", role: "Editor", status: "neutral", joined: "2022-09-01" },
];

const ADMIN_COLUMNS: AdminTableColumn<AdminRow>[] = [
  { key: "name", label: "Name", render: (r) => r.name },
  { key: "role", label: "Role", render: (r) => r.role },
  {
    key: "status",
    label: "Status",
    render: (r) => <StatusPill tone={r.status} label={r.status.toUpperCase()} />,
  },
  { key: "joined", label: "Joined", render: (r) => r.joined },
];

export function AdminTableStory() {
  return (
    <StoryPanel
      title="AdminTable"
      description="Opinionated settings/admin table — pre-existing orca-ui component. For general sortable/selectable grids, use DataTable instead."
    >
      <Variant label="Populated">
        <div style={{ width: "100%" }}>
          <AdminTable<AdminRow>
            columns={ADMIN_COLUMNS}
            rows={ADMIN_ROWS}
            rowKey="id"
            empty={<EmptyState icon={<InboxOutlined />} title="No users" />}
          />
        </div>
      </Variant>
      <Variant label="Loading">
        <div style={{ width: "100%" }}>
          <AdminTable<AdminRow>
            columns={ADMIN_COLUMNS}
            rows={[]}
            rowKey="id"
            loading
            empty={<EmptyState icon={<InboxOutlined />} title="No users" />}
          />
        </div>
      </Variant>
      <Variant label="Empty">
        <div style={{ width: "100%" }}>
          <AdminTable<AdminRow>
            columns={ADMIN_COLUMNS}
            rows={[]}
            rowKey="id"
            empty={<EmptyState icon={<InboxOutlined />} title="No users" description="Invite someone to get started." />}
          />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- SubAppHeader ------------------------

export function SubAppHeaderStory() {
  const [tab, setTab] = useState<string>("overview");
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <StoryPanel
      title="SubAppHeader"
      description="The sticky application header with title row, right-side identity + dev settings, and bottom tab strip. Used at the top of every orca sub-app."
    >
      <Variant label="Minimal (title + tabs)">
        <div style={{ width: "100%", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <SubAppHeader
            title="Compensation planning"
            subtitle="Q4 2026"
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "worksheet", label: "Worksheet", badge: 12 },
              { key: "approvals", label: "Approvals", badge: 3 },
            ]}
            activeTab={tab}
            onTabChange={setTab}
          />
        </div>
      </Variant>
      <Variant label="With identity + preview-as">
        <div style={{ width: "100%", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <SubAppHeader
            title="People analytics"
            subtitle="Fleet health across all departments"
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "attrition", label: "Attrition" },
              { key: "forecast", label: "Forecast" },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            userEmail="kuatbek.mukabak@doublefin.com"
            devSettingsAppId="people-analytics"
            isAdmin
            previewLabel="My view (Admin)"
            previewOptions={[
              { value: "hr-lead", label: "HR Lead" },
              { value: "manager", label: "Manager" },
              { value: "employee", label: "Employee" },
            ]}
            previewValue={preview}
            onPreviewChange={setPreview}
          />
        </div>
      </Variant>
      <Variant label="Loading right slot">
        <div style={{ width: "100%", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <SubAppHeader
            title="Loading…"
            tabs={[
              { key: "overview", label: "Overview" },
              { key: "settings", label: "Settings" },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            rightSlotLoading
          />
        </div>
      </Variant>
    </StoryPanel>
  );
}

// ----------------------------- GlassCard + GradientText + Ambient --

export function GlassCardStory() {
  return (
    <StoryPanel
      title="GlassCard / GradientText / AmbientBackground"
      description="Decorative primitives from the Liquid Metal design system. Full effect needs the host app's liquid.css (lm-ambient, lm-glass-* vars); these show the component structure."
    >
      <Variant label="GlassCard">
        <GlassCard>
          <GradientText>
            <span style={{ fontSize: 24, fontWeight: 700 }}>Liquid metal headline</span>
          </GradientText>
          <div style={{ marginTop: 8, color: "rgba(0,0,0,0.65)" }}>
            Glassmorphism surface. Needs lm-glass-* CSS vars for full specular effect.
          </div>
        </GlassCard>
      </Variant>
      <Variant label="GradientText (default chrome gradient)">
        <GradientText>
          <span style={{ fontSize: 32, fontWeight: 700 }}>Specular Chrome Headline</span>
        </GradientText>
      </Variant>
      <Variant label="AmbientBackground (renders behind content; needs host CSS)">
        <div style={{ position: "relative", width: 420, height: 160, overflow: "hidden", border: "1px dashed rgba(0,0,0,0.2)", borderRadius: 8 }}>
          <AmbientBackground />
          <div style={{ position: "relative", padding: 16 }}>
            <HomeOutlined style={{ fontSize: 20, marginRight: 8 }} />
            Content on top of the ambient layer.
          </div>
        </div>
      </Variant>
    </StoryPanel>
  );
}

// -------------------------- Story registry --------------------------

export interface StoryEntry {
  id: string;
  label: string;
  group:
    | "Primitives"
    | "Forms"
    | "Overlays"
    | "Layouts"
    | "Data display"
    | "Workflow"
    | "Content"
    | "Legacy";
  render: () => ReactElement;
}

export const STORIES: StoryEntry[] = [
  { id: "chip", label: "Chip", group: "Primitives", render: () => <ChipStory /> },
  { id: "button", label: "Button", group: "Primitives", render: () => <ButtonStory /> },
  { id: "card", label: "Card", group: "Primitives", render: () => <CardStory /> },
  { id: "banner", label: "Banner", group: "Primitives", render: () => <BannerStory /> },
  { id: "avatar", label: "Avatar", group: "Primitives", render: () => <AvatarStory /> },
  { id: "toggle", label: "Toggle", group: "Primitives", render: () => <ToggleStory /> },
  { id: "segmented", label: "SegmentedControl", group: "Primitives", render: () => <SegmentedControlStory /> },
  { id: "skeleton", label: "Skeleton", group: "Primitives", render: () => <SkeletonStory /> },
  { id: "tabs", label: "Tabs", group: "Primitives", render: () => <TabsStory /> },
  { id: "tooltip", label: "Tooltip", group: "Primitives", render: () => <TooltipStory /> },
  { id: "menu", label: "Menu / MeatballMenu", group: "Primitives", render: () => <MenuStory /> },
  { id: "inputs", label: "Form inputs", group: "Forms", render: () => <InputsStory /> },
  { id: "modal", label: "Modal", group: "Overlays", render: () => <ModalStory /> },
  { id: "drawer", label: "Drawer", group: "Overlays", render: () => <DrawerStory /> },
  // Bucket 2
  { id: "twopane", label: "TwoPane", group: "Layouts", render: () => <TwoPaneStory /> },
  { id: "leftrail", label: "LeftRailWorkspace", group: "Layouts", render: () => <LeftRailWorkspaceStory /> },
  { id: "dashboard", label: "DashboardShell", group: "Layouts", render: () => <DashboardShellStory /> },
  // Bucket 3
  { id: "kpi", label: "KpiTile / KpiRow", group: "Data display", render: () => <KpiTileStory /> },
  { id: "sparkline", label: "Sparkline", group: "Data display", render: () => <SparklineStory /> },
  { id: "trend", label: "TrendChart", group: "Data display", render: () => <TrendChartStory /> },
  { id: "heatmap", label: "Heatmap", group: "Data display", render: () => <HeatmapStory /> },
  { id: "distribution", label: "DistributionBar", group: "Data display", render: () => <DistributionBarStory /> },
  { id: "cohort", label: "CohortCurve", group: "Data display", render: () => <CohortCurveStory /> },
  { id: "meter", label: "MeterBar / ProgressBar", group: "Data display", render: () => <MeterBarStory /> },
  { id: "datatable", label: "DataTable", group: "Data display", render: () => <DataTableStory /> },
  // Bucket 4
  { id: "daterange", label: "DateRangePicker", group: "Forms", render: () => <DateRangePickerStory /> },
  { id: "monthyear", label: "MonthYearPicker", group: "Forms", render: () => <MonthYearPickerStory /> },
  { id: "people", label: "PeoplePicker", group: "Forms", render: () => <PeoplePickerStory /> },
  { id: "filterbar", label: "FilterBar", group: "Workflow", render: () => <FilterBarStory /> },
  { id: "audit", label: "AuditLog", group: "Workflow", render: () => <AuditLogStory /> },
  { id: "wizard", label: "Wizard", group: "Workflow", render: () => <WizardStory /> },
  // Bucket 5 — Content patterns
  { id: "timeline", label: "Timeline", group: "Content", render: () => <TimelineStory /> },
  { id: "taskcard", label: "ExpandableTaskCard", group: "Content", render: () => <ExpandableTaskCardStory /> },
  { id: "evidence", label: "EvidencePanel", group: "Content", render: () => <EvidencePanelStory /> },
  { id: "notifs", label: "NotificationsTray", group: "Content", render: () => <NotificationsTrayStory /> },
  { id: "employee-drawer", label: "EmployeeDrawer", group: "Content", render: () => <EmployeeDrawerStory /> },
  // Legacy — pre-existing orca-ui components
  { id: "statuspill", label: "StatusPill", group: "Legacy", render: () => <StatusPillStory /> },
  { id: "userchip", label: "UserChip", group: "Legacy", render: () => <UserChipStory /> },
  { id: "emptystate", label: "EmptyState", group: "Legacy", render: () => <EmptyStateStory /> },
  { id: "formsection", label: "FormSection", group: "Legacy", render: () => <FormSectionStory /> },
  { id: "pageheader", label: "PageHeader", group: "Legacy", render: () => <PageHeaderStory /> },
  { id: "detaillayout", label: "DetailLayout / DetailRow", group: "Legacy", render: () => <DetailLayoutStory /> },
  { id: "detailskeleton", label: "DetailSkeleton", group: "Legacy", render: () => <DetailSkeletonStory /> },
  { id: "tableskeleton", label: "TableSkeleton", group: "Legacy", render: () => <TableSkeletonStory /> },
  { id: "admintable", label: "AdminTable", group: "Legacy", render: () => <AdminTableStory /> },
  { id: "subappheader", label: "SubAppHeader", group: "Legacy", render: () => <SubAppHeaderStory /> },
  { id: "glasscard", label: "GlassCard & co.", group: "Legacy", render: () => <GlassCardStory /> },
];
