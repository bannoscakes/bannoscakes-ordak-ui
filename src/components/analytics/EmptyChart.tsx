export default function EmptyChart({ children }: { children?: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground py-8 text-center">
      {children ?? "No data to display"}
    </div>
  );
}


