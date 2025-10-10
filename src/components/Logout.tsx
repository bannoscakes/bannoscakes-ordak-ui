import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Logout() {
  useEffect(() => {
    (async () => {
      try { 
        await supabase.auth.signOut(); 
      } catch {}
      localStorage.clear();
      sessionStorage.clear();
      location.replace("/"); // redirects to dashboard (your root)
    })();
  }, []);
  return <div className="p-6 text-sm text-muted-foreground">Signing out…</div>;
}
