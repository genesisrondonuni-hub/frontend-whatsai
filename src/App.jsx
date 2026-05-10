import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Activity, Zap, Info, RefreshCcw, 
  CheckCircle, XCircle, Clock
} from 'lucide-react';

// Clave de sistema por defecto para el entorno
const systemApiKey = ""; 

export default function App() {
  // --- Estados de Navegación y Configuración ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // --- Estados de Conexión ---
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Estados de Campaña e IA ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // --- Datos de Directorio de Respaldo ---
  const initialLists = [
    {
      id: 'list-1',
      name: 'Clientes VIP - Base Local',
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

  // --- Carga Inicial de Datos Locales ---
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

  // Guardar listas automáticamente
  useEffect(() => {
    localStorage.setItem('whatsAiLists', JSON.stringify(lists));
  }, [lists]);

  // Radar de conexión (cada 5 segundos consulta a tu PC)
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Función de Verificación de Estado (Túnel Ngrok) ---
  const checkApiStatus = async (url) => {
    if (!url) return;

    try {
      // Limpiamos la URL (por si el usuario pegó el link con /send)
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      
      const data = await res.json();
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
        setErrorMessage('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Escaneo de QR pendiente' : 'Iniciando motor local...');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      setApiStatus('error');
      setErrorMessage('Túnel de Ngrok inactivo o link incorrecto.');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Lógica de Envío Masivo a través de tu PC ---
  const handleSendMassive = async () => {
    if (!settings.waApiUrl || isSending) return;
    setIsSending(true);
    
    let baseUrl = settings.waApiUrl.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    
    const messages = [...generatedMessages];
    
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].status === 'sent') continue;
        
        // Marcamos como "enviando" en la UI
        messages[i].status = 'sending';
        setGeneratedMessages([...messages]);

        try {
            const response = await fetch(`${baseUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: messages[i].telefono,
                    text: messages[i].mensaje
                })
            });

            if (response.ok) {
                messages[i].status = 'sent';
            } else {
                messages[i].status = 'error';
            }
        } catch (error) {
            messages[i].status = 'error';
        }
        
        setGeneratedMessages([...messages]);
        // Espera de 2 segundos entre mensajes para seguridad
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    setIsSending(false);
  };

  // --- Procesamiento con Gemini IA ---
  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    const targetList = lists.find(l => l.id === currentCampaign.listId);

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      const prompt = `Reescribe este mensaje de marketing para cada contacto de forma única y natural. 
      Devuelve solo un array JSON: [{"telefono": "...", "mensaje": "..."}].
      BASE: "${currentCampaign.baseMessage}" DATA: ${JSON.stringify(targetList.contacts)}`;

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
          <h1 className="font-black text-2xl tracking-tighter italic leading-none uppercase">WhatsAI Local</h1>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'listas', label: 'Directorios', icon: Database },
            { id: 'campana', label: 'Campaña IA', icon: MessageSquare },
            { id: 'envios', label: 'Cola de Envío', icon: Play },
            { id: 'config', label: 'Conexión PC', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id ? 'bg-blue-600 shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Monitor de Estado en la barra lateral */}
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-slate-500 font-black uppercase">Servidor PC</p>
            <RefreshCw size={12} className={apiStatus === 'buscando' ? 'animate-spin text-blue-400' : 'text-slate-600'} />
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse shadow-green-500/50' : apiStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
             <span className="text-[10px] font-black uppercase">
               {apiStatus === 'conectado' ? 'Local OK' : apiStatus === 'error' ? 'Túnel Caído' : 'Sincronizando'}
             </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black text-slate-900 italic tracking-tighter">Ajustes del Túnel</h2>
            
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800 mb-8"><Activity className="text-blue-600" /> Enlace Ngrok</h3>
               
               <input 
                  type="url" 
                  value={settings.waApiUrl}
                  onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                  placeholder="Pega aquí el link de Ngrok: https://xxxx.ngrok-free.app"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-10 focus:border-blue-600 outline-none font-semibold text-slate-700"
               />

               <div className="border-t border-slate-100 pt-10">
                   {apiStatus === 'desconectado' && qrCode ? (
                     <div className="flex flex-col items-center gap-10 bg-blue-50/30 p-12 rounded-[3.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                       <img src={qrCode} alt="QR" className="w-72 h-72 bg-white p-6 rounded-3xl shadow-2xl" style={{ imageRendering: 'pixelated' }} />
                       <div className="text-center max-w-sm">
                            <h4 className="font-black text-blue-900 text-2xl italic uppercase mb-2">Vincule su Dispositivo</h4>
                            <p className="text-sm text-blue-800/70 font-medium">Escanee el código. Al usar su propia PC, la conexión será instantánea y no se caerá.</p>
                       </div>
                     </div>
                   ) : apiStatus === 'conectado' ? (
                     <div className="text-center py-16 bg-green-50/50 rounded-[3.5rem] border-2 border-dashed border-green-200">
                        <CheckCircle2 size={80} className="text-green-500 mx-auto mb-4" />
                        <h4 className="text-4xl font-black text-slate-900 uppercase italic">PC Conectada</h4>
                        <p className="text-slate-500 text-lg font-medium">Todo listo para los envíos masivos desde su computadora.</p>
                     </div>
                   ) : (
                    <div className="text-center py-20 text-slate-300 italic flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-blue-400" size={48} />
                      <p className="text-sm font-bold uppercase tracking-[0.3em]">{errorMessage || "Buscando servidor local..."}</p>
                    </div>
                   )}
               </div>
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-4 text-slate-800"><BrainCircuit className="text-purple-600" size={28}/> Cerebro Gemini IA</h3>
               <input 
                  type="password" 
                  value={settings.geminiKey}
                  onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                  placeholder="Introduce tu API Key de Google Gemini..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-purple-600 font-mono"
               />
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-[#0f172a] text-white rounded-[2.5rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-tighter">
              {isSaved ? 'DATOS GUARDADOS' : 'GUARDAR Y VINCULAR PC'}
            </button>
          </div>
        )}

        {/* Pestaña de Cola de Envío con Botón Masivo */}
        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <div className="flex justify-between items-end mb-10 border-b pb-8">
               <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Cola de Ejecución</h2>
               {generatedMessages.length > 0 && (
                 <button 
                    disabled={isSending || apiStatus !== 'conectado'}
                    onClick={handleSendMassive}
                    className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black flex items-center gap-4 hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                 >
                    {isSending ? <Loader2 className="animate-spin" /> : <Play fill="white" />}
                    {isSending ? 'ENVIANDO...' : 'INICIAR ENVÍO MASIVO'}
                 </button>
               )}
            </div>

            <div className="grid gap-6">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-slate-300 italic text-2xl font-black uppercase">
                   Bandeja vacía. Genera mensajes en Campaña IA.
                </div>
              ) : (
                generatedMessages.map((msg, idx) => (
                  <div key={idx} className={`bg-white p-10 rounded-[3rem] border-2 shadow-sm flex items-center justify-between transition-all ${msg.status === 'sent' ? 'border-green-200 bg-green-50/20' : 'border-slate-100'}`}>
                    <div className="flex-1 pr-12">
                       <div className="flex items-center gap-3 mb-4">
                         <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">{msg.telefono}</span>
                         {msg.status === 'sent' && <span className="text-[10px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={10}/> Completado</span>}
                         {msg.status === 'sending' && <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-lg animate-pulse">Enviando a PC...</span>}
                         {msg.status === 'error' && <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-lg flex items-center gap-1"><XCircle size={10}/> Error</span>}
                       </div>
                       <p className="text-slate-800 text-xl font-bold leading-relaxed">{msg.mensaje}</p>
                    </div>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-50 text-slate-300">
                        {msg.status === 'sent' ? <CheckCircle size={32} className="text-green-500" /> : <Clock size={32} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pestañas de listas y campaña permanecen activas */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-10 text-slate-900">Directorios</h2>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
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
                    placeholder="Escriba aquí el mensaje guía..."
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
      </main>
    </div>
  );
}
