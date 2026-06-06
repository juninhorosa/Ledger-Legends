import React, { createContext, useContext, useState, useCallback } from "react";
import { translations } from "./translations";

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  const setLanguage = useCallback((l) => {
    setLang(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const dict = translations[lang] || translations.en;
      let s = dict[key] ?? key;
      Object.entries(vars).forEach(([k, v]) => {
        s = s.replace(`{${k}}`, v);
      });
      return s;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
