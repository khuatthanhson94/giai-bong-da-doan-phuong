import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    api.get("/settings")
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings in SettingsProvider:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

