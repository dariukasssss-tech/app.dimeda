import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "@/App";

const LANGUAGE_KEY = "dimeda_language";

const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const [translations, setTranslations] = useState({});
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(LANGUAGE_KEY) || "en";
  });
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await axios.get(`${API}/translations/languages`);
        setAvailableLanguages(response.data);
      } catch (error) {
        console.error("Failed to fetch languages:", error);
        setAvailableLanguages([{ code: "en", name: "English" }]);
      }
    };
    fetchLanguages();
  }, []);

  // Fetch translations when language changes
  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/translations/${language}`);
        setTranslations(response.data);
      } catch (error) {
        console.error("Failed to fetch translations:", error);
        // Fallback to empty translations
        setTranslations({});
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, [language]);

  // Change language
  const changeLanguage = useCallback((newLang) => {
    setLanguage(newLang);
    localStorage.setItem(LANGUAGE_KEY, newLang);
  }, []);

  // Get translation by key path (e.g., "common.save" or "dashboard.stats.totalProducts")
  const t = useCallback((keyPath, replacements = {}) => {
    const keys = keyPath.split(".");
    let value = translations;
    
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        // Return the key path if translation not found
        return keyPath;
      }
    }
    
    // Handle string replacements like {hours}, {minutes}
    if (typeof value === "string" && Object.keys(replacements).length > 0) {
      return Object.entries(replacements).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }, value);
    }
    
    return value || keyPath;
  }, [translations]);

  return (
    <TranslationContext.Provider
      value={{
        t,
        language,
        changeLanguage,
        availableLanguages,
        loading,
        translations,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use translations
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};

export default TranslationContext;
