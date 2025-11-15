type KpiUnit = "percent" | "count" | "currency" | "raw";

export default function KpiValue({
  value,
  unit = "raw",
  decimals,
  currency = "AUD",
}: {
  value?: number | null;         // strictly numeric or null/undefined for empty
  unit?: KpiUnit;                // how to format
  decimals?: number;             // optional override
  currency?: string;             // for unit="currency"
}) {
  // empty/invalid → em dash
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span>—</span>;
  }

  const n = Number(value);

  switch (unit) {
    case "percent": {
      const d = decimals ?? 1;
      return <span>{n.toFixed(d)}%</span>;
    }
    case "count": {
      // no decimals for counts
      return <span>{Math.round(n).toLocaleString()}</span>;
    }
    case "currency": {
      return (
        <span>
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: decimals ?? 2,
            minimumFractionDigits: decimals ?? 2,
          }).format(n)}
        </span>
      );
    }
    default: {
      const d = decimals ?? 0;
      return <span>{n.toFixed(d)}</span>;
    }
  }
}


