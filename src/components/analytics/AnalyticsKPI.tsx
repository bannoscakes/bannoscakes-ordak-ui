import React from "react";
import KpiValue from "./KpiValue";
import { toNumberOrNull } from "@/lib/metrics";
import { useAnalyticsEnabled } from "@/hooks/useAnalyticsEnabled";

export default function AnalyticsKPI({
  title,
  rawValue,
  unit = "raw",
  captionWhenEmpty = "No data yet",
}: {
  title: string;
  rawValue: unknown;
  unit?: "percent" | "count" | "currency" | "raw";
  captionWhenEmpty?: string;
}) {
  const isEnabled = useAnalyticsEnabled();
  const num = isEnabled ? toNumberOrNull(rawValue) : null;
  const isEmpty = num === null || num === undefined;

  return (
    <div className="space-y-1">
      <p className="text-3xl font-semibold text-foreground">
        <KpiValue value={num} unit={unit as any} />
      </p>
      {isEmpty && !isEnabled && (
        <p className="text-xs text-muted-foreground">{captionWhenEmpty}</p>
      )}
    </div>
  );
}


