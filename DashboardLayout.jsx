import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Scale, LogOut, Globe, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  title,
  subtitle,
  nav,
  activeKey,
  onNav,
  onLogout,
  userLabel,
  children,
  testIdPrefix = "dash",
}) {
  const { t, toggle, lang } = useLang();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  // Close mobile drawer when route/section changes
  useEffect(() => {
    if (!isDesktop) setMobileOpen(false);
  }, [activeKey, isDesktop]);

  const isRTL = lang === "ar";
  const hiddenTransform = isRTL ? "translateX(100%)" : "translateX(-100%)";
  const sidebarTransform = isDesktop || mobileOpen ? "translateX(0)" : hiddenTransform;

  return (
    <div className="min-h-screen flex bg-[#FDFDFC] text-slate-900" data-testid={`${testIdPrefix}-shell`}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 start-0 z-40 w-72 lg:w-64 bg-slate-900 text-slate-200 flex flex-col",
          "transition-transform duration-300 ease-out shadow-2xl lg:shadow-none",
        )}
        style={{ transform: sidebarTransform }}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3" data-testid={`${testIdPrefix}-brand`}>
            <div className="w-8 h-8 rounded bg-[#B4975A] flex items-center justify-center">
              <Scale className="w-4 h-4 text-slate-900" />
            </div>
            <div className="leading-none">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{title}</div>
              <div className="text-sm font-heading font-bold text-white">{subtitle}</div>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-300 p-2 -me-2 rounded hover:bg-slate-800"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            data-testid={`${testIdPrefix}-mobile-close`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = activeKey === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      onNav(item.key);
                      setMobileOpen(false);
                    }}
                    data-testid={`${testIdPrefix}-nav-${item.key}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors text-start",
                      active
                        ? "bg-[#B4975A] text-slate-900 font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(item.label)}</span>
                    {item.badge ? (
                      <span className="ms-auto text-xs rounded-full bg-slate-800 text-slate-200 px-2 py-0.5">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-300 hover:bg-slate-800"
            data-testid={`${testIdPrefix}-lang`}
          >
            <Globe className="w-4 h-4" />
            {t("switch_to")}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-red-300 hover:bg-red-500/10"
            data-testid={`${testIdPrefix}-logout`}
          >
            <LogOut className="w-4 h-4" />
            {t("signout")}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6">
          <button
            className="lg:hidden p-2 -ms-2 rounded hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-testid={`${testIdPrefix}-mobile-open`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 truncate">{title}</div>
            <div className="font-heading font-semibold text-slate-900 truncate text-sm lg:text-base">{subtitle}</div>
          </div>
          {userLabel ? (
            <div className="hidden md:block text-sm text-slate-600 truncate max-w-[220px]" data-testid={`${testIdPrefix}-user`}>
              {userLabel}
            </div>
          ) : null}
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
