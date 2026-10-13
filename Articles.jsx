import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicNav from "@/components/PublicNav";
import { useLang } from "@/context/LanguageContext";
import { publicApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, Image as ImageIcon, Video, FileArchive, Eye, Download,
  ArrowLeft, ArrowRight, Calendar, User,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const TYPE_META = {
  article: { icon: FileText, labelKey: "art_articles", color: "bg-slate-900 text-white" },
  image: { icon: ImageIcon, labelKey: "art_images", color: "bg-[#B4975A] text-slate-900" },
  video: { icon: Video, labelKey: "art_videos", color: "bg-red-600 text-white" },
  document: { icon: FileArchive, labelKey: "art_documents", color: "bg-emerald-600 text-white" },
};

const TYPE_FILTERS = ["all", "article", "image", "video", "document"];

function youtubeEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function Articles() {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    publicApi
      .get("/public/articles")
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((x) => x.article_type === filter)),
    [items, filter]
  );

  const openArticle = async (a) => {
    // Fetch full detail (increments views)
    try {
      const { data } = await publicApi.get(`/public/articles/${a.article_id}`);
      setSelected(data);
    } catch {
      setSelected(a);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC]" data-testid="articles-page">
      <PublicNav />

      {/* HERO */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=1600&q=80)",
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
            {t("articles_title")}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
            {t("articles_title")}
          </h1>
          <p className="mt-5 text-slate-300 max-w-2xl text-lg">{t("articles_subtitle")}</p>
        </div>
      </section>

      {/* FILTERS */}
      <section className="border-b border-slate-200 bg-white sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-2 overflow-x-auto">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`art-filter-${f}`}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                filter === f
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {t(f === "all" ? "art_all" : `art_${f}s`)}
            </button>
          ))}
          <div className="ms-auto text-sm text-slate-500" data-testid="art-count">
            {filtered.length}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {loading ? (
            <div className="text-center text-slate-400 py-20">{t("loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-slate-400 py-20" data-testid="art-empty">
              {t("art_no_data")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((a) => (
                <ArticleCard key={a.article_id} a={a} onOpen={() => openArticle(a)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <ArticleDetail article={selected} onClose={() => setSelected(null)} />

      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} · {t("hero_title")} · {t("footer_rights")}
        </div>
      </footer>
    </div>
  );
}

function ArticleCard({ a, onOpen }) {
  const { t } = useLang();
  const meta = TYPE_META[a.article_type] || TYPE_META.article;
  const Icon = meta.icon;
  const mediaUrl = a.media_url ? `${BACKEND_URL}${a.media_url}` : null;
  const embed = youtubeEmbed(a.external_url);

  return (
    <div
      data-testid={`article-card-${a.article_id}`}
      onClick={onOpen}
      className="group bg-white border border-slate-200 rounded-md overflow-hidden card-lift cursor-pointer flex flex-col"
    >
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {a.article_type === "image" && mediaUrl ? (
          <img src={mediaUrl} alt={a.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : a.article_type === "video" && embed ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
            <Video className="w-16 h-16 text-red-500" />
          </div>
        ) : a.article_type === "video" && mediaUrl ? (
          <video src={mediaUrl} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Icon className="w-16 h-16" />
          </div>
        )}
        <div className="absolute top-3 start-3">
          <Badge className={`${meta.color} border-0 font-semibold inline-flex items-center gap-1`}>
            <Icon className="w-3 h-3" />
            {t(meta.labelKey)}
          </Badge>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="font-heading text-lg font-bold text-slate-900 leading-tight line-clamp-2">
          {a.title}
        </div>
        {a.content && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-3 flex-1">{a.content}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> {a.author_name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {a.views_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

function ArticleDetail({ article, onClose }) {
  const { t, lang } = useLang();
  if (!article) return null;
  const meta = TYPE_META[article.article_type] || TYPE_META.article;
  const Icon = meta.icon;
  const mediaUrl = article.media_url ? `${BACKEND_URL}${article.media_url}` : null;
  const embed = youtubeEmbed(article.external_url);
  const date = new Date(article.created_at).toLocaleDateString(lang === "ar" ? "ar-IQ" : undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <Dialog open={!!article} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden" data-testid="article-detail-dialog">
        {article.article_type === "image" && mediaUrl && (
          <div className="aspect-[16/9] bg-slate-100">
            <img src={mediaUrl} alt={article.title} className="w-full h-full object-contain bg-slate-50" />
          </div>
        )}
        {article.article_type === "video" && embed && (
          <div className="aspect-video bg-black">
            <iframe
              src={embed}
              title={article.title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {article.article_type === "video" && !embed && mediaUrl && (
          <div className="aspect-video bg-black">
            <video src={mediaUrl} controls className="w-full h-full" />
          </div>
        )}

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="mb-3">
            <Badge className={`${meta.color} border-0 font-semibold inline-flex items-center gap-1`}>
              <Icon className="w-3 h-3" />
              {t(meta.labelKey)}
            </Badge>
          </div>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-start">{article.title}</DialogTitle>
          </DialogHeader>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> {article.author_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> {article.views_count || 0} {t("art_views")}
            </span>
          </div>

          {Array.isArray(article.tags) && article.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.tags.map((tag, i) => (
                <Badge key={i} className="bg-slate-100 text-slate-700 border border-slate-200">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {article.content && (
            <div className="mt-6 text-slate-700 leading-relaxed whitespace-pre-wrap">
              {article.content}
            </div>
          )}

          {article.article_type === "document" && mediaUrl && (
            <a
              href={mediaUrl}
              download={article.media_filename || article.title}
              data-testid="art-download-link"
              className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              <Download className="w-4 h-4" />
              {t("art_download")}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
