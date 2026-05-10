import React, { useState, useEffect } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Activity, Zap, Info, RefreshCcw
} from 'lucide-react';

// Clave de sistema por defecto (entorno)
const systemApiKey = ""; 

export default function App() {
  // --- Estados Principales ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // --- Estados de Conexión ---
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Estados de Envío e IA ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  // --- Datos de Directorio (Respaldo) ---
  const initialLists = [
    {
      id: 'list-1',
      name: 'Clientes VIP - Demo',
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

  // --- Lógica de Persistencia ---
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

  // Polling automático cada 5 segundos
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Función de Verificación (Clean URL + Cache Buster) ---
  const checkApiStatus = async (url) => {
    if (!url) return;

    try {
      // Limpiamos la URL para apuntar solo al dominio base
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      // Petición al endpoint /status del servidor Render
      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`Servidor responde con error ${res.status}`);
      
      const data = await res.json();
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Vincular dispositivo' : 'Servidor despertando...');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      setApiStatus('error');
      setErrorMessage('No se pudo conectar con el servidor.');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Lógica de IA con Gemini ---
  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    if (!targetList) return;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      const prompt = `Actúa como experto en marketing. Reescribe este mensaje para cada contacto respetando género (M/F). 
      Respuesta: Array JSON [{"telefono": "...", "mensaje": "..."}] sin texto adicional.
      BASE: "${currentCampaign.baseMessage}" 
      DATA: ${JSON.stringify(targetList.contacts)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${activeApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
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
          <Zap size={24} className="text-blue-400 fill-current" />
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
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Monitor de Estado */}
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-4 text-[10px] text-slate-500 font-black uppercase">
            <span>Motor de Envío</span>
            <button onClick={() => checkApiStatus(settings.waApiUrl)}><RefreshCw size={12} className={apiStatus === 'buscando' ? 'animate-spin' : ''} /></button>
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${
               apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : 
               apiStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
             }`} />
             <span className="text-xs font-black uppercase tracking-widest">
               {apiStatus === 'conectado' ? 'Conectado' : 
                apiStatus === 'error' ? 'Error Enlace' : 'Esperando'}
             </span>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-5xl font-black text-slate-900 italic tracking-tighter">Configuración</h2>
            
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold mb-8 flex items-center gap-4 text-slate-800"><Smartphone className="text-blue-600" /> Servidor Render</h3>
               <input 
                 type="url" 
                 value={settings.waApiUrl}
                 onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                 placeholder="Ej: https://mi-backend.onrender.com"
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8 focus:border-blue-600 outline-none font-semibold"
               />

               {apiStatus === 'desconectado' && qrCode ? (
                 <div className="flex flex-col items-center gap-8 bg-blue-50/50 p-12 rounded-[2.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                   <img src={qrCode} alt="QR" className="w-64 h-64 bg-white p-4 rounded-3xl shadow-xl border-4 border-blue-100" />
                   <p className="text-sm text-blue-900 font-black italic">Escanea con tu WhatsApp {' > '} Dispositivos Vinculados</p>
                 </div>
               ) : apiStatus === 'conectado' ? (
                 <div className="text-center py-16 bg-green-50/50 rounded-[2.5rem] border-2 border-dashed border-green-200 animate-in fade-in">
                    <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
                    <h4 className="text-3xl font-black text-slate-900 uppercase">Sistema Online</h4>
                 </div>
               ) : apiStatus === 'error' ? (
                 <div className="text-center py-10 bg-red-50 rounded-3xl border-2 border-dashed border-red-100">
                   <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                   <p className="font-bold text-red-800 uppercase tracking-widest">Enlace Roto</p>
                   <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
                 </div>
               ) : (
                <div className="text-center py-16 text-slate-300 italic flex items-center justify-center gap-4">
                  <Loader2 className="animate-spin" /> <span>Consultando servidor...</span>
                </div>
               )}
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold mb-8 flex items-center gap-4 text-slate-800"><BrainCircuit className="text-purple-600" /> Cerebro IA (Gemini)</h3>
               <input 
                 type="password" 
                 value={settings.geminiKey}
                 onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                 placeholder="Introduce tu API Key de Google..."
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-purple-600 font-mono"
               />
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-slate-900 text-white rounded-[2.5rem] py-8 font-black text-xl hover:bg-black transition-all active:scale-95 shadow-2xl">
              {isSaved ? 'CONFIGURACIÓN GUARDADA' : 'GUARDAR Y SINCRONIZAR'}
            </button>
          </div>
        )}

        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-5xl font-black italic tracking-tighter uppercase">Directorios</h2>
               <button onClick={() => setLists(initialLists)} className="p-4 bg-white border-2 border-slate-200 text-slate-400 rounded-2xl hover:text-blue-600 hover:border-blue-200 transition-all"><RefreshCcw /></button>
             </div>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-2xl font-bold mb-8 uppercase italic text-slate-800">{list.name}</h3>
                    <div className="space-y-4">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                           <div className="space-y-1">
                             <p className="text-lg font-black text-slate-800">{c.nombre} {c.apellido}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-widest">{c.telefono}</p>
                           </div>
                           <div className={`w-12 h-12 rounded-3xl flex items-center justify-center text-xs font-black ${c.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
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
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">Mensaje Base</h2>
            <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-slate-200 space-y-12">
                <textarea 
                    value={currentCampaign.baseMessage}
                    onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                    className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-12 outline-none focus:border-blue-600 text-2xl font-medium shadow-inner"
                    placeholder="Escriba el mensaje base..."
                />
                <button 
                    disabled={isGenerating || apiStatus !== 'conectado'}
                    onClick={handleProcessIA}
                    className="w-full bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-[2.5rem] py-10 font-black text-2xl shadow-2xl flex items-center justify-center gap-6 disabled:grayscale disabled:opacity-50 hover:scale-[1.02] transition-all"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={32} /> : <Wand2 size={32} />}
                    TRANSFORMAR CON INTELIGENCIA ARTIFICIAL
                </button>
            </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10">Cola de Ejecución</h2>
            <div className="grid gap-6">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-slate-300 italic text-2xl font-black">
                   Bandeja de salida vacía
                </div>
              ) : (
                generatedMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 flex items-center justify-between group hover:border-blue-400 transition-all">
                    <div className="flex-1 pr-12">
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4">{msg.telefono}</p>
                       <p className="text-slate-800 text-xl font-bold leading-relaxed">{msg.mensaje}</p>
                    </div>
                    <button className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-600 active:scale-90 transition-all">
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
