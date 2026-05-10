import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Smartphone as PhoneIcon, 
  Activity, Zap, Info, RefreshCcw
} from 'lucide-react';

// Clave de sistema por defecto para el entorno de ejecución
const systemApiKey = ""; 

export default function App() {
  // --- Estados de Navegación y Configuración ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // --- Estados de Conexión ---
  // Estados: 'conectado' (Verde), 'desconectado' (Amarillo/QR), 'error' (Rojo), 'buscando' (Gris)
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Estados de Campaña e IA ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  // --- Datos de Directorio de Respaldo ---
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

  // Guardar listas automáticamente al cambiar
  useEffect(() => {
    localStorage.setItem('whatsAiLists', JSON.stringify(lists));
  }, [lists]);

  // Polling automático (revisión cada 6 segundos para dar respiro a Render)
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 6000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Función Maestra de Verificación de Estado ---
  const checkApiStatus = async (url) => {
    if (!url) {
        setApiStatus('error');
        return;
    }

    try {
      // 1. Limpieza Inteligente de la URL
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      
      if (!baseUrl.startsWith('http')) {
          baseUrl = `https://${baseUrl}`;
      }

      // 2. Consulta al Servidor (Añadimos t= para evitar caché del navegador)
      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 
          'Accept': 'application/json'
        }
      });

      // Manejo específico del error 502 (Bad Gateway / Reinicio de Render)
      if (res.status === 502) {
        setApiStatus('buscando');
        setErrorMessage('Sincronizando sesión de WhatsApp... Espere 30 segundos.');
        return;
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const data = await res.json();
      
      // 3. Procesamiento de la respuesta del Backend
      if (data.whatsappReady === true) {
        setApiStatus('conectado');
        setQrCode('');
        setErrorMessage('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Escaneo de QR requerido' : 'El motor se está iniciando...');
      }
      
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fallo de conexión:", e.message);
      setApiStatus('error');
      setErrorMessage('No se pudo contactar con el servidor. Verifique si Render está activo.');
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
    alert("Datos de prueba restaurados.");
  };

  // --- Lógica de IA con Gemini ---
  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    if (!targetList) return;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      if (!activeApiKey) throw new Error("Falta la API Key de Gemini");

      const prompt = `Actúa como experto en marketing. Reescribe este mensaje para cada contacto de forma única. 
      Usa el género (M/F) para concordancia (Estimado/Estimada).
      IMPORTANTE: Devuelve solo un array JSON válido [{"telefono": "...", "mensaje": "..."}]. 
      BASE: "${currentCampaign.baseMessage}" 
      CONTACTOS: ${JSON.stringify(targetList.contacts)}`;

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
      console.error("Error IA:", e);
      alert("Error al procesar con IA: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={24} className="text-white fill-current" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter leading-none italic">WhatsAI</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">PRO Enterprise</span>
          </div>
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
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id ? 'bg-blue-600 shadow-xl translate-x-2' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Widget de Monitorización */}
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center mb-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">
            <span>Estado Motor</span>
            <button onClick={() => checkApiStatus(settings.waApiUrl)}>
                <RefreshCw size={12} className={apiStatus === 'buscando' ? 'animate-spin text-blue-400' : 'text-slate-600'} />
            </button>
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full shadow-[0_0_12px] ${
                 apiStatus === 'conectado' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 
                 apiStatus === 'error' ? 'bg-red-500 shadow-red-500/50' : 
                 apiStatus === 'desconectado' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-slate-500'
             }`} />
             <span className="text-[11px] font-black uppercase tracking-tight">
               {apiStatus === 'conectado' ? 'Sincronizado' : 
                apiStatus === 'error' ? 'Fallo Enlace' : 
                apiStatus === 'desconectado' ? 'Pendiente QR' : 'Iniciando...'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 italic">Sincronizado: {lastCheck}</p>}
        </div>
      </aside>

      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-5xl font-black text-slate-900 italic tracking-tighter">Configuración</h2>
            
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800 mb-8"><Smartphone className="text-blue-600" size={28}/> Servidor Render</h3>
               
               <input 
                  type="url" 
                  value={settings.waApiUrl}
                  onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                  placeholder="https://tu-backend.onrender.com"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-10 focus:border-blue-600 outline-none font-semibold text-slate-700"
               />

               <div className="border-t border-slate-100 pt-10">
                   {apiStatus === 'desconectado' && qrCode ? (
                     <div className="flex flex-col items-center gap-12 bg-blue-50/30 p-12 rounded-[3.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                       <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-8 border-white flex items-center justify-center">
                         <img 
                            src={qrCode} 
                            alt="QR de WhatsApp" 
                            className="w-64 h-64 md:w-80 md:h-80 object-contain" 
                            style={{ imageRendering: 'pixelated' }}
                         />
                       </div>
                       <div className="text-center space-y-4 max-w-md">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-2 shadow-lg shadow-blue-500/30">
                                <Zap size={12} fill="currentColor" /> Acción Requerida
                            </div>
                            <h4 className="font-black text-slate-900 text-3xl tracking-tighter italic uppercase">Vincule su Cuenta</h4>
                            <p className="text-slate-600 leading-relaxed font-medium">
                              Escanee el código con su teléfono (WhatsApp {' > '} Dispositivos Vinculados). La aplicación se activará automáticamente.
                            </p>
                       </div>
                     </div>
                   ) : apiStatus === 'conectado' ? (
                     <div className="text-center py-16 bg-green-50/50 rounded-[3.5rem] border-2 border-dashed border-green-200 animate-in fade-in">
                        <CheckCircle2 size={80} className="text-green-500 mx-auto mb-6 shadow-xl rounded-full bg-white p-2" />
                        <h4 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Motor Sincronizado</h4>
                        <p className="text-slate-500 text-lg font-medium text-center">La sesión está activa. WhatsApp Web está listo para recibir órdenes de envío.</p>
                     </div>
                   ) : (
                    <div className="text-center py-20 text-slate-300 italic flex flex-col items-center gap-6">
                      <Loader2 className="animate-spin text-blue-400" size={48} />
                      <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
                          {errorMessage || "Estableciendo conexión con el servidor..."}
                      </p>
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
                  placeholder="Pegue su API Key de Google aquí..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-purple-600 font-mono"
               />
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={handleSaveSettings} 
                    className="flex-1 bg-[#0f172a] text-white rounded-[2.5rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-tighter"
                >
                  {isSaved ? 'Configuración Guardada' : 'Guardar y Sincronizar Todo'}
                </button>
                <button onClick={resetDirectorio} className="bg-white border-2 border-slate-200 text-slate-400 p-8 rounded-[3rem] hover:text-blue-600 transition-all shadow-sm"><RefreshCcw size={28} /></button>
            </div>
          </div>
        )}

        {/* Las demás pestañas se mantienen operativas para su uso inmediato */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-10">Directorios</h2>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500">
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
               <div className="border-4 border-dashed border-slate-200 rounded-[3.5rem] flex flex-col items-center justify-center p-20 text-slate-300 hover:text-blue-500 hover:border-blue-100 transition-all cursor-pointer">
                    <Plus size={64} className="mb-4" />
                    <span className="font-black uppercase tracking-widest">Cargar Nueva Base</span>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-12">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Mensaje Maestro</h2>
            <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-slate-200 space-y-12">
                <textarea 
                    value={currentCampaign.baseMessage}
                    onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                    className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-12 outline-none focus:border-blue-600 text-2xl font-medium shadow-inner leading-relaxed"
                    placeholder="Escriba el mensaje base para la IA..."
                />
                <button 
                    disabled={isGenerating || apiStatus !== 'conectado'}
                    onClick={handleProcessIA}
                    className="w-full bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-[2.5rem] py-10 font-black text-2xl shadow-2xl flex items-center justify-center gap-6 disabled:grayscale disabled:opacity-50 hover:scale-[1.02] transition-all"
                >
                    {isGenerating ? <RefreshCw className="animate-spin" size={32} /> : <Wand2 size={32} />}
                    TRANSFORMAR CON IA (GEMINI)
                </button>
            </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10 border-b border-slate-100 pb-8 text-slate-900">Cola de Ejecución</h2>
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
                       <p className="text-slate-800 text-xl font-bold leading-relaxed">{msg.mensaje}</p>
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
