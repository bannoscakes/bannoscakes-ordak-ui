import React from "react";
type Props = { hasData: boolean; height?: number; children: React.ReactNode };

export default function ChartContainer({ hasData, height = 300, children }: Props) {
  if (!hasData) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No data to display</div>;
  }
  // Usage requires passing a Recharts chart tree as children
  return <div style={{ width: "100%", height }}>{children}</div>;
}


