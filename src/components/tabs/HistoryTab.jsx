import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Search } from 'lucide-react';

export function HistoryTab() {
  const { settings } = useSettings();
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms de debounce

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (!settings.waApiUrl) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        // Construir la URL con el término de búsqueda si existe
        const url = debouncedSearchTerm
          ? `${settings.waApiUrl}/history?q=${encodeURIComponent(debouncedSearchTerm)}`
          : `${settings.waApiUrl}/history`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar el historial');
        const data = await response.json();
        setChatHistory(data);
      } catch (error) {
        console.error(error);
        setChatHistory([]); // Limpiar en caso de error
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchHistory();
  }, [settings.waApiUrl, debouncedSearchTerm]);

  if (loading) {
     return <div className="text-center p-12 text-slate-400 font-bold">Cargando historial...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 font-sans">Historial de Chats</h2>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o mensaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-full w-96 h-16 pl-14 pr-6 font-bold text-lg outline-none focus:ring-2 ring-blue-500 transition-all"
          />
        </div>
      </div>
      <div className="space-y-8">
        {chatHistory.length > 0 ? chatHistory.map((chat) => (
          <div key={chat.telefono} className="bg-white p-10 rounded-[3rem] border-2 border-slate-100">
            <div className="flex items-center mb-6">
              <span className="text-xs font-black uppercase bg-slate-900 text-white px-4 py-2 rounded-full font-sans">
                {chat.nombre} - {chat.telefono}
              </span>
            </div>
            <div className="space-y-4">
              {chat.mensajes.map((msg, j) => (
                <div key={j} className={`flex ${msg.de === 'bot' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-xl p-5 rounded-3xl ${msg.de === 'bot' ? 'bg-slate-100 text-slate-800' : 'bg-blue-600 text-white'}`}>
                    <p className="font-medium text-lg leading-tight">{msg.texto}</p>
                    <p className="text-xs mt-2 opacity-70 font-bold">{msg.ts}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )) : <p className="text-center text-slate-400 font-bold">No hay historial de conversaciones para mostrar.</p>}
      </div>
    </div>
  );
}
