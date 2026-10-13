import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, ArrowLeft, ArrowRight } from "lucide-react";

export default function ClientLogin() {
  const { t, lang } = useLang();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/client/portal";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="client-login-page">
      <div className="flex items-center justify-center p-6 lg:p-12 bg-[#FDFDFC] order-2 lg:order-1">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-2 mb-8"
            data-testid="back-home"
          >
            <Arrow className="w-4 h-4" /> {t("nav_home")}
          </Link>
          <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-2">
            {t("client_login_title")}
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-900">{t("client_login_subtitle")}</h2>

          <Card className="mt-8 border border-slate-200 rounded-md shadow-none">
            <CardContent className="p-8">
              <Button
                onClick={handleGoogleLogin}
                data-testid="google-signin-btn"
                className="w-full h-12 bg-white hover:bg-slate-50 text-slate-900 font-semibold border border-slate-300"
              >
                <GoogleIcon className="w-5 h-5 me-2" />
                {t("signin_google")}
              </Button>
              <p className="mt-6 text-xs text-slate-500 leading-relaxed text-center">
                {lang === "ar"
                  ? "يجب أن يكون بريدك الإلكتروني مضافاً من قبل المكتب. للاستفسار: 07726317519"
                  : "Your email must be pre-registered by the firm. Inquiries: 07726317519"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden lg:flex relative bg-slate-900 items-center justify-center p-12 overflow-hidden order-1 lg:order-2">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "url(https://images.pexels.com/photos/8112154/pexels-photo-8112154.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=900)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-900 via-slate-900/85 to-transparent" />
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
          <p className="mt-6 text-slate-300 leading-relaxed">
            {lang === "ar"
              ? "بوابة الموكلين: تابع قضاياك، أتعابك، مستنداتك، ورسائلك مع المحامي بشكل آمن ولحظي."
              : "Client portal: securely track your cases, fees, documents and conversations in real time."}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.94 0 3.24.83 3.98 1.54l2.72-2.61C16.98 3.13 14.68 2 12 2 6.98 2 3 6 3 11s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.59-.06-1.04-.14-1.5H12z" />
    </svg>
  );
}
