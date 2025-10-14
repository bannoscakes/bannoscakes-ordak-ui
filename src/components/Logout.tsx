import { useEffect } from "react";
import { authService } from "@/lib/auth";

export default function Logout() {
  useEffect(() => {
    (async () => {
      try { 
        // Use authService instead of direct supabase calls
        await authService.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      } finally {
        // Always redirect to sign-in page after sign out
        window.location.replace("/sign-in");
      }
    })();
  }, []);
  return <div className="p-6 text-sm text-muted-foreground">Signing out…</div>;
}
