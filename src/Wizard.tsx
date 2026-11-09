import { Divider, Steps, theme } from "antd";
import type { ReactNode } from "react";

import { Button } from "./Button";

export type WizardStepStatus = "todo" | "current" | "done" | "error";

export interface WizardStep<Id extends string = string> {
  id: Id;
  label: ReactNode;
  description?: ReactNode;
  optional?: boolean;
  status?: WizardStepStatus;
}

export interface WizardValidationState {
  valid: boolean;
  message?: ReactNode;
}

export interface WizardRailContext<Id extends string = string> {
  steps: WizardStep<Id>[];
  activeStepId: Id;
  onNavigate: (id: Id) => void;
  statusFor: (step: WizardStep<Id>) => WizardStepStatus;
}

export interface WizardProps<Id extends string = string> {
  steps: WizardStep<Id>[];
  activeStepId: Id;
  onNavigate: (id: Id) => void;
  renderStep: (step: WizardStep<Id>) => ReactNode;
  validation?: Partial<Record<Id, WizardValidationState>>;
  onFinish?: () => void | Promise<void>;
  finishLabel?: ReactNode;
  nextLabel?: ReactNode;
  backLabel?: ReactNode;
  footer?: ReactNode;
  renderRail?: (ctx: WizardRailContext<Id>) => ReactNode;
  orientation?: "horizontal" | "vertical";
}

const STATUS_MAP: Record<WizardStepStatus, "wait" | "process" | "finish" | "error"> = {
  todo: "wait",
  current: "process",
  done: "finish",
  error: "error",
};

export function Wizard<Id extends string = string>({
  steps,
  activeStepId,
  onNavigate,
  renderStep,
  validation,
  onFinish,
  finishLabel = "Finish",
  nextLabel = "Next",
  backLabel = "Back",
  footer,
  renderRail,
  orientation = "vertical",
}: WizardProps<Id>) {
  const { token } = theme.useToken();
  const activeIndex = Math.max(0, steps.findIndex((s) => s.id === activeStepId));
  const active = steps[activeIndex];
  const isLast = activeIndex === steps.length - 1;
  const isFirst = activeIndex === 0;

  const statusFor = (step: WizardStep<Id>): WizardStepStatus => {
    if (step.status) return step.status;
    const idx = steps.findIndex((s) => s.id === step.id);
    const v = validation?.[step.id];
    if (v && !v.valid && idx < activeIndex) return "error";
    if (idx < activeIndex) return "done";
    if (idx === activeIndex) return "current";
    return "todo";
  };

  const activeValidation = validation?.[active.id];
  const canAdvance = !activeValidation || activeValidation.valid;

  const next = async () => {
    if (!canAdvance) return;
    if (isLast) {
      if (onFinish) await onFinish();
      return;
    }
    onNavigate(steps[activeIndex + 1].id);
  };

  const back = () => {
    if (!isFirst) onNavigate(steps[activeIndex - 1].id);
  };

  const railCtx: WizardRailContext<Id> = { steps, activeStepId, onNavigate, statusFor };

  const defaultRail = (
    <Steps
      direction={orientation === "vertical" ? "vertical" : "horizontal"}
      current={activeIndex}
      onChange={(idx) => onNavigate(steps[idx].id)}
      size="default"
      style={orientation === "vertical" ? { minWidth: 220, paddingRight: 16 } : { paddingBottom: 16 }}
      items={steps.map((s) => ({
        title: (
          <span>
            {s.label}
            {s.optional && (
              <span style={{ color: token.colorTextSecondary, marginLeft: 4, fontWeight: 400, fontSize: 12 }}>
                (optional)
              </span>
            )}
          </span>
        ),
        description: s.description,
        status: STATUS_MAP[statusFor(s)],
      }))}
    />
  );

  const rail = renderRail ? renderRail(railCtx) : defaultRail;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: orientation === "vertical" ? "row" : "column",
        gap: 16,
        width: "100%",
      }}
    >
      {rail}
      {orientation === "vertical" && <Divider type="vertical" style={{ height: "auto" }} />}
      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ flexGrow: 1 }}>{renderStep(active)}</div>
        <Divider style={{ margin: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
          <Button variant="ghost" onClick={back} disabled={isFirst}>
            {backLabel}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!canAdvance && activeValidation?.message && (
              <span style={{ fontSize: 12, color: token.colorError }}>{activeValidation.message}</span>
            )}
            {footer}
            <Button variant="primary" onClick={next} disabled={!canAdvance}>
              {isLast ? finishLabel : nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
