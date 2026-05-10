import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, ChevronRight, LayoutDashboard, Database, Plus, Trash2, LogOut
} from 'lucide-react';

const systemApiKey = ""; 

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState('desconocido'); // 'conectado', 'desconectado', 'error', 'desconocido'
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  // Datos de Directorio iniciales
  const initialLists = [
    {
      id: 'list-1',
      name: 'Clientes Potenciales - Sector A',
      contacts: [
        { telefono: '584241234567', nombre: 'María', apellido: 'García', genero: 'F' },
        { telefono: '584129876543', nombre: 'Juan', apellido: 'Pérez', genero: 'M' },
        { telefono: '584140001122', nombre: 'Carlos', apellido: 'Rodríguez', genero: 'M' }
      ]
    }
  ];

  const [lists, setLists] = useState(initialLists);
  const [currentCampaign, setCurrentCampaign] = useState({
    baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Tenemos una oferta especial para ti.',
    listId: 'list-1'
  });

  useEffect(() => {
    const saved = localStorage.getItem('whatsAiSettingsPro');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      if (parsed.waApiUrl) checkApiStatus(parsed.waApiUrl);
    }
    const savedLists = localStorage.getItem('whatsAiLists');
    if (savedLists) {
      const parsedLists = JSON.parse(savedLists);
      if (parsedLists.length > 0) setLists(parsedLists);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsAiLists', JSON.stringify(lists));
  }, [lists]);

  // Polling automático con "Cache Buster" para evitar datos viejos
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  const checkApiStatus = async (url) => {
    if (!url) return;
    try {
      const baseUrl = url.trim().split('/send')[0].replace(/\/$/, "");
      // Añadimos un parámetro aleatorio (?t=...) para que el navegador no use la caché
      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      // Actualizamos el estado basado en lo que dice el servidor REALMENTE
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      setApiStatus('error');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const resetLists = () => {
    setLists(initialLists);
  };

  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    if (!targetList) return;
    
    const prompt = `Reescribe este mensaje para cada contacto. JSON: [{"telefono": "string", "mensaje": "string"}]. BASE: "${currentCampaign.baseMessage}" DATA: ${JSON.stringify(targetList.contacts)}`;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${activeApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
      });
      const result = await response.json();
      const content = JSON.parse(result.candidates[0].content.parts[0].text);
      setGeneratedMessages(content.map(v => ({ ...v, status: 'pending' })));
      setActiveTab('envios');
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter italic">WhatsAI</h1>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { id: 'listas', label: 'Directorios', icon: Database },
            { id: 'campana', label: 'Campaña IA', icon: MessageSquare },
            { id: 'envios', label: 'Cola de Envío', icon: Play },
            { id: 'config', label: 'Ajustes & QR', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-blue-600 shadow-xl shadow-blue-900/40 translate-x-1' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Estado Motor</p>
            <button onClick={() => checkApiStatus(settings.waApiUrl)} className="text-blue-400 hover:text-blue-300">
              <RefreshCw size={12} className={apiStatus === 'desconocido' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : apiStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
             <span className="text-[11px] font-bold uppercase tracking-tight">
               {apiStatus === 'conectado' ? 'Conectado' : apiStatus === 'error' ? 'Error Enlace' : 'Pendiente QR'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 mt-2 italic">Sincronizado: {lastCheck}</p>}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 md:p-16 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h2 className="text-4xl font-black">Configuración</h2>
            
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><Smartphone className="text-blue-600"/> Enlace Render</h3>
               <input 
                 type="url" 
                 value={settings.waApiUrl}
                 onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                 placeholder="https://backend-whatsai.onrender.com"
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 mb-8 outline-none focus:border-blue-600"
               />

               {apiStatus === 'desconectado' && qrCode ? (
                 <div className="flex flex-col items-center gap-6 bg-blue-50/50 p-10 rounded-[2rem] border-2 border-dashed border-blue-200">
                   <div className="bg-white p-4 rounded-3xl shadow-2xl">
                     <img src={qrCode} alt="QR" className="w-56 h-56" />
                   </div>
                   <div className="text-center">
                    <p className="font-black text-blue-900 text-lg italic">¡Escanea Ahora!</p>
                    <p className="text-sm text-blue-600/70">Si el QR no cambia tras escanear, espera 30 segundos.</p>
                   </div>
                 </div>
               ) : apiStatus === 'conectado' ? (
                 <div className="text-center py-12 bg-green-50/50 rounded-[2rem] border-2 border-dashed border-green-200">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                    <p className="text-2xl font-black text-slate-800">WhatsApp Vinculado</p>
                    <p className="text-slate-500">Todo listo para enviar tus campañas.</p>
                 </div>
               ) : (
                 <div className="text-center py-10 text-slate-400 italic">Cargando estado del servidor...</div>
               )}
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><BrainCircuit className="text-purple-600"/> Inteligencia Artificial</h3>
               <input 
                 type="password" 
                 value={settings.geminiKey}
                 onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                 placeholder="API Key de Gemini..."
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 outline-none focus:border-purple-600"
               />
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-slate-900 text-white rounded-2xl py-6 font-black shadow-xl hover:bg-black transition-all">
              {isSaved ? 'CONFIGURACIÓN ACTUALIZADA' : 'GUARDAR Y VINCULAR'}
            </button>
          </div>
        )}

        {/* Pestaña Directorios */}
        {activeTab === 'listas' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-3xl font-black">Directorios</h2>
               <button onClick={resetLists} className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:text-red-500 transition-all">
                  <RefreshCw size={20} />
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                    <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                      {list.name}
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{list.contacts.length} Contactos</span>
                    </h3>
                    <div className="space-y-3">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div>
                             <p className="text-sm font-black text-slate-800">{c.nombre} {c.apellido}</p>
                             <p className="text-[10px] text-slate-400 font-bold tracking-widest">{c.telefono}</p>
                           </div>
                           <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${c.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                             {c.genero}
                           </span>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
               <button className="border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-slate-300 hover:text-blue-400 hover:border-blue-200 transition-all">
                 <Plus size={48} className="mb-2" />
                 <span className="font-bold uppercase tracking-tighter">Nueva Lista (Sheets)</span>
               </button>
             </div>
          </div>
        )}

        {/* Cola de Envíos */}
        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-3xl font-black mb-8">Cola de Ejecución</h2>
            {generatedMessages.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 italic">
                No hay mensajes pendientes. Ve a "Campaña IA" para generar envíos.
              </div>
            ) : (
              generatedMessages.map((msg, idx) => (
                <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm hover:border-blue-500 transition-all group">
                   <div className="space-y-2">
                     <p className="text-xs font-black text-blue-500 tracking-widest uppercase">{msg.telefono}</p>
                     <p className="text-slate-700 leading-relaxed font-medium">{msg.mensaje}</p>
                   </div>
                   <button className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                     <Send size={20} />
                   </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
                <h3 className="text-2xl font-black mb-8 italic">Mensaje Base</h3>
                <textarea 
                  value={currentCampaign.baseMessage}
                  onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                  className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 outline-none focus:border-blue-600 text-lg shadow-inner"
                  placeholder="Hola {{Nombre}}..."
                />
                <button 
                  disabled={isGenerating || apiStatus !== 'conectado'}
                  onClick={handleProcessIA}
                  className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl py-6 font-black shadow-xl disabled:opacity-50 flex items-center justify-center gap-4"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 size={24} />}
                  TRANSFORMAR CON INTELIGENCIA ARTIFICIAL
                </button>
                {apiStatus !== 'conectado' && <p className="text-center text-red-500 text-[10px] font-black mt-4 uppercase italic">⚠ Debes vincular WhatsApp en Ajustes primero</p>}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
