import { useState } from "react";
import { handleScanCommand } from "./scan-handler";
import { toast } from "sonner";

export default function Scanner() {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim();
    if (!input) return;

    setBusy(true);
    const res = await handleScanCommand(input);
    setBusy(false);

    if (res.ok) toast.success(res.message);
    else toast.error(res.message);

    setValue("");
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Scanner</h1>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          autoFocus
          disabled={busy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Scan or type: "bannos-12345" or "print bannos-12345"'
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Working…" : "Go"}
        </button>
      </form>

      <p className="text-sm text-muted-foreground mt-3">
        Use <code>print [id]</code> to set Filling start. Otherwise the scan advances one stage.
      </p>
    </div>
  );
}