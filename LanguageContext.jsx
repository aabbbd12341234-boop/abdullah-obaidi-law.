import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations } from "@/lib/i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ar");

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title =
      lang === "ar"
        ? "المحامي عبدالله أحمد العبيدي | مكتب محاماة"
        : "Attorney Abdullah Ahmed Al-Obaidi | Law Office";
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = useCallback((key) => translations[lang]?.[key] ?? key, [lang]);
  const toggle = () => setLang((p) => (p === "ar" ? "en" : "ar"));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const v = useContext(LanguageContext);
  if (!v) throw new Error("useLang must be inside LanguageProvider");
  return v;
}
