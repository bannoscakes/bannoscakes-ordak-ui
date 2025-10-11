import { useEffect } from "react";
import { authService } from "@/lib/auth";

export default function Logout() {
  useEffect(() => {
    (async () => {
      try { 
        // Use authService instead of direct supabase calls
        await authService.signOut();
      } catch {}
      location.replace("/"); // redirects to dashboard (your root)
    })();
  }, []);
  return <div className="p-6 text-sm text-muted-foreground">Signing out…</div>;
}
