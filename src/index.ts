import "./_compiled.css";
export { SubAppHeader, getDevApiKey, setDevApiKey, getUseApi, setUseApi } from "./SubAppHeader";
export type { SubAppHeaderProps, SubAppHeaderTab, SubAppHeaderPreviewOption } from "./SubAppHeader";
export { AdminTable } from "./AdminTable";
export type { AdminTableColumn, AdminTableProps } from "./AdminTable";
export { AmbientBackground } from "./AmbientBackground";
export type { AmbientBackgroundProps } from "./AmbientBackground";
export { DetailLayout } from "./DetailLayout";
export type { DetailLayoutProps } from "./DetailLayout";
export { DetailRow } from "./DetailRow";
export type { DetailRowProps } from "./DetailRow";
export { DetailSkeleton } from "./DetailSkeleton";
export type { DetailSkeletonProps } from "./DetailSkeleton";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { FormSection } from "./FormSection";
export type { FormSectionProps } from "./FormSection";
export { GlassCard } from "./GlassCard";
export type { GlassCardProps } from "./GlassCard";
export { GradientText } from "./GradientText";
export type { GradientTextProps } from "./GradientText";
export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";
export { StatusPill } from "./StatusPill";
export type { StatusPillProps, StatusPillTone } from "./StatusPill";
export { TableSkeleton } from "./TableSkeleton";
export type { TableSkeletonProps } from "./TableSkeleton";
export { UserChip } from "./UserChip";
export type { UserChipProps } from "./UserChip";
export { UsersAccess } from "./UsersAccess";
export type { UsersAccessProps, HttpClient } from "./UsersAccess";

// Palette — canonical Orca Chip Palette tokens shared by every component.
export {
  LIGHT_TONES,
  DARK_TONES,
  LIGHT_SURFACE,
  DARK_SURFACE,
  FONT_STACK,
  MONO_FONT_STACK,
} from "./palette";
export type { Tone, TonePalette } from "./palette";
export { orcaAntdLightTheme } from "./antdTheme";

// Bucket 1 — Core primitives
export { Chip, CHIP_PALETTE } from "./Chip";
export type { ChipProps, ChipTone, ChipSize, ChipVariant } from "./Chip";
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";
export { Card } from "./Card";
export type { CardProps, CardPadding, CardSectionProps } from "./Card";
export { Banner, CollapsibleBanner } from "./Banner";
export type { BannerProps, BannerTone, CollapsibleBannerProps } from "./Banner";
export { Field } from "./Field";
export type { FieldProps } from "./Field";
export { TextInput } from "./TextInput";
export type { TextInputProps } from "./TextInput";
export { TextArea } from "./TextArea";
export type { TextAreaProps } from "./TextArea";
export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";
export { NumberInput } from "./NumberInput";
export type { NumberInputProps } from "./NumberInput";
export { Avatar } from "./Avatar";
export type { AvatarProps, AvatarSize, AvatarShape, AvatarUser } from "./Avatar";
export { Toggle } from "./Toggle";
export type { ToggleProps, ToggleSize } from "./Toggle";
export { SegmentedControl } from "./SegmentedControl";
export type {
  SegmentedControlProps,
  SegmentedControlOption,
  SegmentedControlSize,
} from "./SegmentedControl";
export { Modal } from "./Modal";
export type { ModalProps, ModalSize } from "./Modal";
export { Drawer } from "./Drawer";
export type { DrawerProps, DrawerSide } from "./Drawer";
export { Skeleton, SkeletonText, SkeletonBlock } from "./Skeleton";
export type { SkeletonProps, SkeletonTextProps, SkeletonBlockProps } from "./Skeleton";
export { Tabs } from "./Tabs";
export type { TabsProps, TabSpec } from "./Tabs";
export { Tooltip } from "./Tooltip";
export type { TooltipProps, TooltipPlacement } from "./Tooltip";
export { Menu, MeatballMenu } from "./Menu";
export type { MenuProps, MeatballMenuProps, MenuItem, MenuAction, MenuAlign } from "./Menu";

// Bucket 2 — Layout shells
export { TwoPane } from "./TwoPane";
export type { TwoPaneProps, TwoPaneSplit } from "./TwoPane";
export { LeftRailWorkspace } from "./LeftRailWorkspace";
export type { LeftRailWorkspaceProps, LeftRailItem } from "./LeftRailWorkspace";
export { DashboardShell } from "./DashboardShell";
export type { DashboardShellProps } from "./DashboardShell";

// Bucket 3 — Data display
export type { ChartTone } from "./_chartTones";
export { KpiTile, KpiRow } from "./KpiTile";
export type { KpiTileProps, KpiRowProps, KpiDelta, KpiDeltaDirection, KpiDeltaTone } from "./KpiTile";
export { Sparkline } from "./Sparkline";
export type { SparklineProps } from "./Sparkline";
export { TrendChart } from "./TrendChart";
export type { TrendChartProps, TrendChartSeries, TrendChartAnnotation } from "./TrendChart";
export { Heatmap } from "./Heatmap";
export type { HeatmapProps, HeatmapScale } from "./Heatmap";
export { DistributionBar } from "./DistributionBar";
export type { DistributionBarProps, DistributionBarSegment } from "./DistributionBar";
export { CohortCurve } from "./CohortCurve";
export type { CohortCurveProps, CohortCurveCohort } from "./CohortCurve";
export { MeterBar } from "./MeterBar";
export type { MeterBarProps, MeterThreshold } from "./MeterBar";
export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps } from "./ProgressBar";
export { DataTable } from "./DataTable";
export type {
  DataTableProps,
  DataTableColumn,
  SortState,
  SortDirection,
  SelectionMode,
  PaginationState,
} from "./DataTable";

// Bucket 4 — Forms & workflow
export { DateRangePicker, DEFAULT_PRESETS } from "./DateRangePicker";
export type { DateRangePickerProps, DateRange, DateRangePreset } from "./DateRangePicker";
export { MonthYearPicker } from "./MonthYearPicker";
export type { MonthYearPickerProps, MonthYearValue } from "./MonthYearPicker";
export { PeoplePicker, PeoplePickerMulti } from "./PeoplePicker";
export type {
  PeoplePickerProps,
  PeoplePickerMultiProps,
  PeoplePickerCommonProps,
  PeopleSource,
  UserRef,
} from "./PeoplePicker";
export { AuditLog } from "./AuditLog";
export type { AuditLogProps, AuditEntry } from "./AuditLog";
export { FilterBar } from "./FilterBar";
export type { FilterBarProps, FilterSpec, FilterState, FilterValue } from "./FilterBar";
export { Wizard } from "./Wizard";
export type {
  WizardProps,
  WizardStep,
  WizardStepStatus,
  WizardValidationState,
  WizardRailContext,
} from "./Wizard";

// Bucket 5 — Content patterns
export { Timeline } from "./Timeline";
export type { TimelineProps, TimelineItem, TimelineTone } from "./Timeline";
export { ExpandableTaskCard } from "./ExpandableTaskCard";
export type { ExpandableTaskCardProps } from "./ExpandableTaskCard";
export { EvidencePanel } from "./EvidencePanel";
export type { EvidencePanelProps, Citation } from "./EvidencePanel";
export { NotificationsTray } from "./NotificationsTray";
export type { NotificationsTrayProps, NotificationItem, NotificationTone } from "./NotificationsTray";
export { EmployeeDrawer } from "./EmployeeDrawer";
export type { EmployeeDrawerProps, EmployeeDrawerSection } from "./EmployeeDrawer";
export type {
  AuditSubject,
  AuditCriteria,
  RoleAuditConcern,
  RoleAuditResult,
  RoleAuditFinding,
} from "./roleAuditPrompt";
export {
  buildRoleAuditPrompt,
  parseRoleAuditResult,
  DEFAULT_AUDIT_CRITERIA,
  CONCERN_VALUES,
} from "./roleAuditPrompt";
