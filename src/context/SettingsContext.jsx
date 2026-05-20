import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('whatsAiLocal_Final');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing settings from localStorage", e);
      }
    }
    return { geminiKey: '', waApiUrl: 'http://localhost:3000' };
  });
  const [isSaved, setIsSaved] = useState(false);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('whatsAiLocal_Final', JSON.stringify(newSettings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, isSaved }}>
      {children}
    </SettingsContext.Provider>
  );
};
