import { useEffect } from "react";
import { authService } from "@/lib/auth";
import { safePushState } from "@/lib/safeNavigate";

export default function Logout() {
  useEffect(() => {
    (async () => {
      try { 
        // Use authService instead of direct supabase calls
        await authService.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      } finally {
        // Always redirect to root page after sign out (single URL architecture)
        safePushState("/");
      }
    })();
  }, []);
  return <div className="p-6 text-sm text-muted-foreground">Signing out…</div>;
}
