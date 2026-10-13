import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clientApi } from "@/lib/api";
import { toast } from "sonner";

// Handles URL fragment session_id after Google OAuth callback
export default function AuthCallback() {
  const nav = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      nav("/client/login");
      return;
    }

    (async () => {
      try {
        const { data } = await clientApi.post(
          "/auth/session",
          {},
          { headers: { "X-Session-ID": sessionId } }
        );
        // Clear hash & go to portal
        window.history.replaceState(null, "", "/client/portal");
        if (!data.has_client_record) {
          toast.error("لا يوجد ملف موكل مرتبط ببريدك. يرجى مراجعة المكتب.");
        }
        nav("/client/portal", { state: { user: data.user, client: data.client } });
      } catch (err) {
        toast.error(err?.response?.data?.detail || "فشل تسجيل الدخول");
        nav("/client/login");
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-testid="auth-callback">
      <div className="text-slate-500">جارٍ التحقق...</div>
    </div>
  );
}
