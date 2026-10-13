import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Scale, Menu, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function PublicNav() {
  const { t, toggle, lang } = useLang();
  const nav = useNavigate();
  const links = [
    { key: "nav_home", href: "/#home" },
    { key: "nav_about", href: "/#about" },
    { key: "team_title", href: "/#team" },
    { key: "nav_properties", href: "/properties" },
    { key: "nav_articles", href: "/articles" },
    { key: "nav_services", href: "/#services" },
    { key: "nav_contact", href: "/#contact" },
  ];
  return (
    <header
      data-testid="public-nav"
      className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16">
        <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
          <div className="w-9 h-9 rounded bg-slate-900 flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#B4975A]" />
          </div>
          <div className="font-heading font-bold text-slate-900 leading-none">
            <div className="text-xs text-slate-500 font-medium">{t("hero_kicker")}</div>
            <div className="text-base">{t("hero_title")}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.key}
              href={l.href}
              data-testid={`nav-${l.key}`}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            data-testid="lang-toggle"
            className="gap-2"
          >
            <Globe className="w-4 h-4" />
            <span>{t("switch_to")}</span>
          </Button>
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/lawyer/login")}
              data-testid="nav-lawyer-login"
            >
              {t("nav_lawyer_login")}
            </Button>
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white"
              onClick={() => nav("/client/login")}
              data-testid="nav-client-login"
            >
              {t("nav_client_login")}
            </Button>
          </div>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {links.map((l) => (
                  <DropdownMenuItem key={l.key} onClick={() => (window.location.href = l.href)}>
                    {t(l.key)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => nav("/lawyer/login")}>
                  {t("nav_lawyer_login")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/client/login")}>
                  {t("nav_client_login")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
