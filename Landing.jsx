import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicApi } from "@/lib/api";
import { Phone, Mail, MapPin, Scale, Gavel, Building2, Users, Briefcase, HomeIcon, ArrowLeft, ArrowRight } from "lucide-react";

const HERO_IMG =
  "https://images.pexels.com/photos/6077091/pexels-photo-6077091.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=1400";
const ABOUT_IMG =
  "https://images.pexels.com/photos/8112154/pexels-photo-8112154.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const PORTRAIT =
  "https://customer-assets.emergentagent.com/job_law-office-manager-2/artifacts/8az5ohdd_%D8%B5%D9%88%D8%B1%D8%AA%D9%8A.jpg";
const PARTNER_PORTRAIT =
  "https://customer-assets-0z36b82j.emergentagent.net/job_law-office-manager-2/artifacts/f0a30a317eae2a17_%D9%8A%D9%88%D9%86%D8%B3.jpg";

export default function Landing() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [info, setInfo] = useState(null);
  const isRTL = lang === "ar";
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    publicApi.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  const services = [
    { icon: Gavel, key: "service_civil" },
    { icon: Scale, key: "service_criminal" },
    { icon: Briefcase, key: "service_commercial" },
    { icon: Users, key: "service_family" },
    { icon: Building2, key: "service_labor" },
    { icon: HomeIcon, key: "service_realestate" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFC]" data-testid="landing-page">
      <PublicNav />

      {/* HERO */}
      <section id="home" className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="reveal-up">
              <div className="text-[#B4975A] text-sm tracking-[0.3em] uppercase font-semibold mb-4">
                {t("hero_kicker")}
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight">
                {t("hero_title")}
              </h1>
            </div>
            <p className="reveal-up delay-1 mt-6 text-lg lg:text-xl text-slate-200 max-w-2xl">
              {t("hero_subtitle")}
            </p>
            <p className="reveal-up delay-2 mt-2 text-sm text-[#B4975A]">{t("hero_tag")}</p>
            <div className="reveal-up delay-3 mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                data-testid="hero-cta-book"
                onClick={() => nav("/client/login")}
                className="bg-[#B4975A] hover:bg-[#C5A96D] text-slate-900 font-semibold h-12 px-8 rounded-md gap-2"
              >
                {t("cta_book")}
                <Arrow className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                data-testid="hero-cta-portal"
                onClick={() => nav("/client/login")}
                className="h-12 px-8 rounded-md border-white/40 text-white hover:bg-white/10 hover:text-white bg-transparent"
              >
                {t("cta_client_portal")}
              </Button>
            </div>
          </div>
        </div>
        {/* Bottom trust bar */}
        <div className="relative bg-slate-900/95 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-4 text-slate-300 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#B4975A]" />
              <span dir="ltr" data-testid="hero-phone">{info?.phone || "07726317519"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#B4975A]" />
              <span dir="ltr" data-testid="hero-email">{info?.email || "aabbbd12341234@gmail.com"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#B4975A]" />
              <span data-testid="hero-address">{isRTL ? (info?.address || t("address_value")) : (info?.address_en || t("address_value"))}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-md overflow-hidden">
              <img src={PORTRAIT} alt="Lawyer portrait" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 start-6 text-white">
                <div className="font-heading text-xl font-bold">{t("hero_title")}</div>
                <div className="text-sm text-slate-200">{t("hero_kicker")}</div>
              </div>
            </div>
            <div className="hidden lg:block absolute -z-10 -bottom-6 -end-6 w-full h-full border-2 border-[#B4975A]/60 rounded-md" />
          </div>
          <div className="lg:col-span-7">
            <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-4">
              {t("about_title")}
            </div>
            <h2 className="font-heading text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
              {t("about_title")}
            </h2>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">{t("about_body")}</p>
            <div className="grid grid-cols-3 gap-6 mt-10">
              {[
                { n: "20+", l: lang === "ar" ? "سنة خبرة" : "Years experience" },
                { n: "500+", l: lang === "ar" ? "قضية ناجحة" : "Cases won" },
                { n: "100%", l: lang === "ar" ? "التزام" : "Commitment" },
              ].map((s, i) => (
                <div key={i} className="border-t-2 border-[#B4975A] pt-3">
                  <div className="font-heading text-3xl font-bold text-slate-900">{s.n}</div>
                  <div className="text-sm text-slate-500 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-14">
            <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-4">
              {t("team_title")}
            </div>
            <h2 className="font-heading text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              {t("team_title")}
            </h2>
            <p className="mt-5 text-slate-600 max-w-lg">{t("team_desc")}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
            <TeamCard
              img={PORTRAIT}
              name={t("hero_title")}
              role={t("role_owner")}
              testid="team-abdullah"
            />
            <TeamCard
              img={PARTNER_PORTRAIT}
              name={lang === "ar" ? "يونس محمود سلمان" : "Younes Mahmoud Salman"}
              role={t("role_partner")}
              testid="team-younes"
            />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-4">
              {t("services_title")}
            </div>
            <h2 className="font-heading text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              {t("services_title")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {services.map((s) => {
              const Ico = s.icon;
              return (
                <Card
                  key={s.key}
                  data-testid={`service-${s.key}`}
                  className="card-lift bg-white border border-slate-200 rounded-md p-2"
                >
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-md bg-slate-900 flex items-center justify-center mb-5">
                      <Ico className="w-5 h-5 text-[#B4975A]" />
                    </div>
                    <div className="font-heading text-xl font-bold text-slate-900 mb-2">{t(s.key)}</div>
                    <div className="text-sm text-slate-600">{t(s.key + "_desc")}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="text-[#B4975A] uppercase text-xs tracking-[0.3em] font-semibold mb-4">
              {t("contact_title")}
            </div>
            <h2 className="font-heading text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              {t("contact_title")}
            </h2>
            <p className="mt-6 text-slate-600 max-w-md">
              {lang === "ar"
                ? "نرحّب بكم للاستفسار عن قضيتكم أو حجز استشارة قانونية."
                : "We welcome inquiries regarding your matter or booking a legal consultation."}
            </p>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            <ContactItem icon={Phone} label={t("contact_phone")} value={info?.phone || "07726317519"} dir="ltr" testid="contact-phone" />
            <ContactItem icon={Mail} label={t("contact_email")} value={info?.email || "aabbbd12341234@gmail.com"} dir="ltr" testid="contact-email" />
            <ContactItem
              icon={MapPin}
              label={t("contact_address")}
              value={isRTL ? (info?.address || t("address_value")) : (info?.address_en || t("address_value"))}
              testid="contact-address"
              full
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
              <Scale className="w-4 h-4 text-[#B4975A]" />
            </div>
            <div className="text-sm">
              <div className="font-semibold">{t("hero_title")}</div>
              <div className="text-slate-400 text-xs">{t("hero_kicker")}</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} · {t("footer_rights")}
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value, dir, testid, full }) {
  return (
    <Card className={`bg-white border border-slate-200 rounded-md card-lift ${full ? "sm:col-span-2" : ""}`}>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#B4975A]" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
          <div dir={dir} data-testid={testid} className="mt-1 text-slate-900 font-medium break-all">
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamCard({ img, name, role, testid }) {
  return (
    <div data-testid={testid} className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50 card-lift">
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/95 via-slate-900/75 to-transparent p-6 text-white">
        <div className="text-[#B4975A] text-xs uppercase tracking-[0.3em] font-semibold mb-1">{role}</div>
        <div className="font-heading text-xl lg:text-2xl font-bold leading-tight">{name}</div>
      </div>
    </div>
  );
}
