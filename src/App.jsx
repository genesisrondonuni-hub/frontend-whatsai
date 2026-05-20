import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { SettingsTab } from './components/tabs/SettingsTab';
import { CampaignTab } from './components/tabs/CampaignTab';
import { EnviosTab } from './components/tabs/QueueTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { useWhatsApp } from './hooks/useWhatsApp';
import { useGemini } from './hooks/useGemini';
import { Toaster } from 'react-hot-toast';
import { useSettings } from './context/SettingsContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const { settings, saveSettings } = useSettings(); // Usar el contexto de configuración
  
  // Los hooks ahora usan la configuración del contexto
  const whatsapp = useWhatsApp();
  const gemini = useGemini();

  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    // No es necesario cargar la configuración aquí, el SettingsProvider ya lo hace.
    // Solo asegúrate de que el estado inicial de `contacts` sea el adecuado o se cargue desde otro lugar.
  }, []); // Este useEffect ahora está vacío o se puede eliminar si contacts se maneja en CampaignTab

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-12 overflow-y-auto">
        {activeTab === 'config' && <SettingsTab whatsapp={whatsapp} />}
        {activeTab === 'campana' && <CampaignTab setActiveTab={setActiveTab} contacts={contacts} setContacts={setContacts} gemini={gemini} />}
        {activeTab === 'envios' && <EnviosTab whatsapp={whatsapp} gemini={gemini} />}
        {activeTab === 'historial' && <HistoryTab />}
      </main>
    </div>
  );
}