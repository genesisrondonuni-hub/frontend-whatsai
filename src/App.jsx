import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Smartphone as PhoneIcon, 
  Activity, Zap, Info, RefreshCcw
} from 'lucide-react';

const systemApiKey = ""; 

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // Estados de conexión: 'conectado', 'desconectado', 'error', 'buscando', 'sincronizando'
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  const initialLists = [
    {
      id: 'list-1',
      name: 'Clientes VIP - Base de Datos',
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
      if (parsedLists && parsedLists.length > 0) setLists(parsedLists);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsAiLists', JSON.stringify(lists));
  }, [lists]);

  // Polling dinámico: más lento si hay errores para no saturar a Render
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      const delay = (apiStatus === 'sincronizando' || apiStatus === 'error') ? 12000 : 6000;
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), delay);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl, apiStatus]);

  const checkApiStatus = async (url) => {
    if (!url) {
      setApiStatus('error');
      return;
    }

    try {
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Si el servidor da 502 o 503, significa que está reiniciando por falta de RAM
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        setApiStatus('sincronizando');
        setErrorMessage('WhatsApp está cargando tus chats. El servidor se está estabilizando...');
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
        setErrorMessage('');
        setRetryCount(0);
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Escaneo de QR pendiente' : 'Iniciando servicios...');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error de red:", e.message);
      // En lugar de ir a error inmediato, intentamos una fase de "reconexión silenciosa"
      if (apiStatus === 'desconectado' || apiStatus === 'sincronizando') {
        setApiStatus('sincronizando');
        setErrorMessage('Sincronización pesada detectada. Esperando respuesta de Render...');
      } else {
        setApiStatus('error');
        setErrorMessage('No se pudo contactar con el servidor. Verifique su enlace.');
      }
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const resetDirectorio = () => {
    setLists(initialLists);
  };

  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    if (!targetList) return;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      const prompt = `Reescribe este mensaje de marketing para cada contacto de forma única. Género: ${JSON.stringify(targetList.contacts)}. Devuelve solo JSON: [{"telefono": "...", "mensaje": "..."}]. BASE: "${currentCampaign.baseMessage}"`;
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
      alert("Error con Gemini: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0 z-50">
        <div className="flex items-center gap-4 mb-12">
          <Zap size={24} className="text-blue-500 fill-current" />
          <h1 className="font-black text-2xl tracking-tighter italic">WhatsAI</h1>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'listas', label: 'Directorios', icon: Database },
            { id: 'campana', label: 'Campaña IA', icon: MessageSquare },
            { id: 'envios', label: 'Cola de Envío', icon: Play },
            { id: 'config', label: 'Conexión & QR', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id ? 'bg-blue-600 shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Motor de Envío</p>
            <button onClick={() => checkApiStatus(settings.waApiUrl)}><RefreshCw size={12} className={apiStatus === 'buscando' || apiStatus === 'sincronizando' ? 'animate-spin text-blue-400' : 'text-slate-600'} /></button>
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${
                 apiStatus === 'conectado' ? 'bg-green-500 animate-pulse shadow-green-500/50 shadow-md' : 
                 apiStatus === 'error' ? 'bg-red-500' : 
                 apiStatus === 'sincronizando' ? 'bg-blue-500 animate-bounce' : 'bg-amber-500'
             }`} />
             <span className="text-[11px] font-black uppercase tracking-tight">
               {apiStatus === 'conectado' ? 'Sincronizado' : 
                apiStatus === 'sincronizando' ? 'Recuperando...' :
                apiStatus === 'error' ? 'Enlace Roto' : 'Pendiente QR'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 italic mt-2">Última revisión: {lastCheck}</p>}
        </div>
      </aside>

      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black text-slate-900 italic tracking-tighter">Configuración</h2>
            
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800 mb-8"><Smartphone className="text-blue-600" size={28}/> Servidor Render</h3>
               
               <input 
                  type="url" 
                  value={settings.waApiUrl}
                  onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                  placeholder="https://mi-backend.onrender.com"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-10 focus:border-blue-600 outline-none font-semibold"
               />

               <div className="border-t border-slate-100 pt-10">
                   {apiStatus === 'desconectado' && qrCode ? (
                     <div className="flex flex-col items-center gap-10 bg-blue-50/30 p-12 rounded-[3.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                       <img src={qrCode} alt="QR" className="w-64 h-64 md:w-80 md:h-80 bg-white p-6 rounded-3xl shadow-2xl" style={{ imageRendering: 'pixelated' }} />
                       <div className="text-center max-w-sm">
                            <h4 className="font-black text-blue-900 text-2xl italic uppercase mb-2">Vincule su Dispositivo</h4>
                            <p className="text-sm text-blue-800/70 font-medium">Escanee el código. Si al escanear el servidor se cae, no se preocupe, la app esperará a que se recupere solo.</p>
                       </div>
                     </div>
                   ) : apiStatus === 'conectado' ? (
                     <div className="text-center py-16 bg-green-50/50 rounded-[3.5rem] border-2 border-dashed border-green-200">
                        <CheckCircle2 size={80} className="text-green-500 mx-auto mb-4" />
                        <h4 className="text-4xl font-black text-slate-900 uppercase italic">Motor Operativo</h4>
                        <p className="text-slate-500 text-lg font-medium">WhatsApp Web está listo para recibir órdenes de envío.</p>
                     </div>
                   ) : apiStatus === 'sincronizando' ? (
                    <div className="text-center py-20 bg-blue-50/50 rounded-[3.5rem] border-2 border-dashed border-blue-200">
                      <Loader2 className="animate-spin text-blue-500 mx-auto mb-6" size={64} />
                      <h4 className="text-2xl font-black text-blue-900 uppercase italic">Sincronización Pesada</h4>
                      <p className="text-blue-700 mt-2 px-10">{errorMessage}</p>
                      <p className="text-blue-400 text-xs mt-4 italic">Render gratuito suele reiniciarse al procesar muchos chats. Espere 45 segundos.</p>
                    </div>
                   ) : (
                    <div className="text-center py-20 text-slate-300 italic flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-blue-400" size={48} />
                      <p className="text-sm font-bold uppercase tracking-[0.3em]">{errorMessage || "Buscando servidor..."}</p>
                    </div>
                   )}
               </div>
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800 mb-8"><BrainCircuit className="text-purple-600" size={28}/> Cerebro Gemini IA</h3>
               <input 
                  type="password" 
                  value={settings.geminiKey}
                  onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                  placeholder="Pegue su API Key aquí..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-purple-600"
               />
            </div>

            <div className="flex gap-4">
                <button onClick={handleSaveSettings} className="flex-1 bg-[#0f172a] text-white rounded-[2.5rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-tighter">
                  {isSaved ? 'Configuración Aplicada' : 'Guardar y Sincronizar'}
                </button>
            </div>
          </div>
        )}

        {/* Las demás pestañas permanecen operativas para la gestión de listas y envíos */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-10 text-slate-900">Directorios</h2>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500">
                    <h3 className="text-2xl font-bold mb-8 uppercase italic text-slate-800 flex justify-between items-center">
                        {list.name}
                        <span className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black tracking-widest">{list.contacts.length} Contactos</span>
                    </h3>
                    <div className="space-y-4">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                           <div className="space-y-1">
                             <p className="text-lg font-black text-slate-800">{c.nombre} {c.apellido}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-widest">{c.telefono}</p>
                           </div>
                           <div className={`w-12 h-12 rounded-3xl flex items-center justify-center text-[10px] font-black shadow-inner border border-white/50 ${c.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                             {c.genero}
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-12">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Mensaje Maestro</h2>
            <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-slate-200 space-y-12">
                <textarea 
                    value={currentCampaign.baseMessage}
                    onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                    className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-12 outline-none focus:border-blue-600 text-2xl font-medium shadow-inner leading-relaxed"
                    placeholder="Escriba aquí el mensaje base para la IA..."
                />
                <button 
                    disabled={isGenerating || apiStatus !== 'conectado'}
                    onClick={handleProcessIA}
                    className="w-full bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-[2.5rem] py-10 font-black text-2xl shadow-2xl flex items-center justify-center gap-6 disabled:grayscale disabled:opacity-50"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={32} /> : <Wand2 size={32} />}
                    TRANSFORMAR CON IA (GEMINI)
                </button>
            </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10 border-b border-slate-100 pb-8">Cola de Ejecución</h2>
            <div className="grid gap-6">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-slate-300 italic text-2xl font-black uppercase tracking-tighter">
                   Bandeja de salida vacía
                </div>
              ) : (
                generatedMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-400 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 group-hover:w-4 transition-all" />
                    <div className="flex-1 pr-12 pl-4">
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">{msg.telefono}</p>
                       <p className="text-slate-800 text-xl font-bold leading-relaxed tracking-tight">{msg.mensaje}</p>
                    </div>
                    <button className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:bg-blue-600 group-hover:scale-110 active:scale-90 transition-all shrink-0">
                      <Send size={28} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
