import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import { useLang } from "@/context/LanguageContext";
import { publicApi, API_BASE } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Home, Trees, Store, Briefcase, MapPin, Ruler, BedDouble, Bath, Layers,
  Phone, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Scale, Mail,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const typeIcon = {
  apartment: Building2,
  house: Home,
  villa: Home,
  land: Trees,
  commercial: Store,
  office: Briefcase,
};

export default function Properties() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listingFilter, setListingFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    publicApi
      .get("/public/properties")
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (listingFilter !== "all" && p.listing_type !== listingFilter) return false;
      if (typeFilter !== "all" && p.property_type !== typeFilter) return false;
      return true;
    });
  }, [items, listingFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-[#FDFDFC]" data-testid="properties-page">
      <PublicNav />

      {/* HERO */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/70 to-slate-900" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <Link
            to="/"
            data-testid="back-to-home"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6"
          >
            <Arrow className="w-4 h-4" /> {t("nav_home")}
          </Link>
          <div className="text-[#B4975A] text-xs uppercase tracking-[0.3em] font-semibold mb-3">
            {t("properties_title")}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
            {t("properties_title")}
          </h1>
          <p className="mt-5 text-slate-300 max-w-2xl text-lg">{t("properties_subtitle")}</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400">
            <Scale className="w-4 h-4 text-[#B4975A]" />
            <span>
              {t("managed_by")}:{" "}
              <span className="text-white font-semibold">
                {lang === "ar" ? "يونس محمود سلمان" : "Younes Mahmoud Salman"}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="border-b border-slate-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-3">
          <Select value={listingFilter} onValueChange={setListingFilter}>
            <SelectTrigger className="w-44" data-testid="filter-listing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("prop_filter_all")}</SelectItem>
              <SelectItem value="for_sale">{t("listing_for_sale")}</SelectItem>
              <SelectItem value="for_rent">{t("listing_for_rent")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44" data-testid="filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("prop_filter_all")}</SelectItem>
              {["apartment", "house", "villa", "land", "commercial", "office"].map((x) => (
                <SelectItem key={x} value={x}>{t(`type_${x}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ms-auto text-sm text-slate-500" data-testid="result-count">
            {filtered.length} {lang === "ar" ? "عقار" : "properties"}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {loading ? (
            <div className="text-center text-slate-400 py-20">{t("loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-400 py-20" data-testid="empty-properties">
              {t("prop_no_data")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => (
                <PropertyCard key={p.property_id} p={p} onOpen={() => setSelected(p)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <PropertyDetail
        property={selected}
        onClose={() => setSelected(null)}
      />

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} · {t("hero_title")} · {t("footer_rights")}
        </div>
      </footer>
    </div>
  );
}

function PropertyCard({ p, onOpen }) {
  const { t, lang } = useLang();
  const Icon = typeIcon[p.property_type] || Building2;
  const img = p.image_urls?.[0] ? `${BACKEND_URL}${p.image_urls[0]}` : null;
  const listingBadge = p.listing_type === "for_sale"
    ? "bg-[#B4975A] text-slate-900"
    : p.listing_type === "for_rent"
    ? "bg-emerald-600 text-white"
    : "bg-slate-500 text-white";

  return (
    <div
      data-testid={`property-card-${p.property_id}`}
      className="group bg-white border border-slate-200 rounded-md overflow-hidden card-lift cursor-pointer"
      onClick={onOpen}
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={p.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Icon className="w-16 h-16" />
          </div>
        )}
        <div className="absolute top-3 start-3 flex gap-2">
          <Badge className={`${listingBadge} border-0 font-semibold`}>
            {t(`listing_${p.listing_type}`)}
          </Badge>
          <Badge className="bg-slate-900/80 text-white border-0 backdrop-blur">
            {t(`type_${p.property_type}`)}
          </Badge>
        </div>
      </div>
      <div className="p-5">
        <div className="font-heading text-lg font-bold text-slate-900 leading-tight line-clamp-1">
          {p.title}
        </div>
        {p.address && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{p.address}</span>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          {p.area_m2 > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-[#B4975A]" />
              <span dir="ltr">{p.area_m2} {t("prop_sq_meter")}</span>
            </span>
          )}
          {p.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="w-4 h-4 text-[#B4975A]" />
              {p.bedrooms}
            </span>
          )}
          {p.bathrooms > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="w-4 h-4 text-[#B4975A]" />
              {p.bathrooms}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            {p.price > 0 ? (
              <>
                <div className="font-heading text-xl font-bold text-slate-900" dir="ltr">
                  {Number(p.price).toLocaleString()}{" "}
                  <span className="text-xs text-slate-500 font-medium">{p.currency || "IQD"}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">—</div>
            )}
          </div>
          <Button size="sm" variant="outline" className="shrink-0" data-testid={`prop-view-${p.property_id}`}>
            {t("prop_view_details")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PropertyDetail({ property, onClose }) {
  const { t, lang } = useLang();
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    setImgIdx(0);
  }, [property?.property_id]);
  if (!property) return null;
  const images = property.image_urls || [];
  const currentImg = images[imgIdx] ? `${BACKEND_URL}${images[imgIdx]}` : null;
  const Icon = typeIcon[property.property_type] || Building2;

  const next = (e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % Math.max(1, images.length)); };
  const prev = (e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + Math.max(1, images.length)) % Math.max(1, images.length)); };

  return (
    <Dialog open={!!property} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" data-testid="property-detail-dialog">
        <div className="relative aspect-[16/9] bg-slate-100">
          {currentImg ? (
            <img src={currentImg} alt={property.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Icon className="w-24 h-24" />
            </div>
          )}
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute start-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                aria-label="prev"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button
                onClick={next}
                className="absolute end-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                aria-label="next"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-180" />
              </button>
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute top-3 start-3 flex gap-2">
            <Badge className="bg-[#B4975A] text-slate-900 border-0 font-semibold">
              {t(`listing_${property.listing_type}`)}
            </Badge>
            <Badge className="bg-slate-900/80 text-white border-0 backdrop-blur">
              {t(`type_${property.property_type}`)}
            </Badge>
          </div>
        </div>
        <div className="p-6 max-h-[55vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-start">{property.title}</DialogTitle>
          </DialogHeader>
          {property.address && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="w-4 h-4 text-[#B4975A]" />
              <span>{property.address}</span>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SpecBox icon={Ruler} label={t("prop_area")} value={property.area_m2 ? `${property.area_m2} ${t("prop_sq_meter")}` : "-"} />
            <SpecBox icon={BedDouble} label={t("prop_bedrooms")} value={property.bedrooms || "-"} />
            <SpecBox icon={Bath} label={t("prop_bathrooms")} value={property.bathrooms || "-"} />
            <SpecBox icon={Layers} label={t("prop_floor")} value={property.floor || "-"} />
          </div>
          {property.price > 0 && (
            <div className="mt-5 p-4 bg-slate-900 text-white rounded-md">
              <div className="text-xs uppercase tracking-widest text-[#B4975A] font-semibold">
                {t("prop_price")}
              </div>
              <div className="font-heading text-2xl font-bold mt-1" dir="ltr">
                {Number(property.price).toLocaleString()}{" "}
                <span className="text-sm text-slate-300">{property.currency || "IQD"}</span>
              </div>
            </div>
          )}
          {property.description && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
                {t("prop_description")}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {property.description}
              </p>
            </div>
          )}
          {Array.isArray(property.features) && property.features.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
                {t("prop_features")}
              </div>
              <div className="flex flex-wrap gap-2">
                {property.features.map((f, i) => (
                  <Badge key={i} className="bg-slate-100 text-slate-700 border border-slate-200">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-3">
            <a
              href={`tel:${property.contact_phone || "07726317519"}`}
              data-testid="prop-call-btn"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[#B4975A] hover:bg-[#C5A96D] text-slate-900 font-semibold"
            >
              <Phone className="w-4 h-4" />
              <span dir="ltr">{property.contact_phone || "07726317519"}</span>
            </a>
            <a
              href="mailto:aabbbd12341234@gmail.com"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
            >
              <Mail className="w-4 h-4" />
              {t("contact_email")}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpecBox({ icon: Icon, label, value }) {
  return (
    <div className="border border-slate-200 rounded-md p-3">
      <Icon className="w-4 h-4 text-[#B4975A]" />
      <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 text-slate-900 font-semibold">{value}</div>
    </div>
  );
}
