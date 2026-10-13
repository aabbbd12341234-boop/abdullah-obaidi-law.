import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { lawyerApi } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Scale, ArrowLeft, ArrowRight } from "lucide-react";

export default function LawyerLogin() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await lawyerApi.post("/lawyer/login", { email, password });
      localStorage.setItem("lawyer_token", data.token);
      localStorage.setItem("lawyer_name", data.lawyer.name);
      localStorage.setItem("lawyer_role", data.lawyer.role || "owner");
      toast.success(t("saved"));
      nav("/lawyer/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="lawyer-login-page">
      <div className="hidden lg:flex relative bg-slate-900 items-center justify-center p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/6077091/pexels-photo-6077091.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=900)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/85 to-transparent" />
        <div className="relative max-w-md">
          <div className="w-14 h-14 rounded bg-[#B4975A] flex items-center justify-center mb-8">
            <Scale className="w-7 h-7 text-slate-900" />
          </div>
          <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-3">
            {t("hero_kicker")}
          </div>
          <h1 className="font-heading text-4xl lg:text-5xl font-bold text-white leading-tight">
            {t("hero_title")}
          </h1>
          <p className="mt-6 text-slate-300 leading-relaxed">{t("hero_subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 lg:p-12 bg-[#FDFDFC]">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-2 mb-8" data-testid="back-home">
            <Arrow className="w-4 h-4" /> {t("nav_home")}
          </Link>
          <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-2">
            {t("lawyer_login_title")}
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-900">{t("lawyer_login_subtitle")}</h2>

          <Card className="mt-8 border border-slate-200 rounded-md shadow-none">
            <CardContent className="p-6">
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="lawyer-email">{t("email")}</Label>
                  <Input
                    id="lawyer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="lawyer-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lawyer-pw">{t("password")}</Label>
                  <Input
                    id="lawyer-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="lawyer-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="lawyer-signin-btn"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {loading ? t("loading") : t("signin")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
