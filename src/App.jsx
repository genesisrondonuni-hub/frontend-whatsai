import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Activity, Zap, Info, RefreshCcw
} from 'lucide-react';

// Clave de sistema por defecto (suministrada por el entorno)
const systemApiKey = ""; 

export default function App() {
  // --- Estados de Navegación y Configuración ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // --- Estados de Conexión (buscando, conectado, desconectado, error) ---
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

  // --- Carga Inicial de Datos ---
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

  // Guardar listas automáticamente al modificarlas
  useEffect(() => {
    localStorage.setItem('whatsAiLists', JSON.stringify(lists));
  }, [lists]);

  // Polling automático cada 5 segundos para revisar el estado del QR/Conexión
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Función Maestra de Verificación de Estado (Anticaché + Clean URL) ---
  const checkApiStatus = async (url) => {
    if (!url) {
      setApiStatus('error');
      return;
    }

    try {
      // Normalización de la URL de Render
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      // Petición al endpoint /status con parámetro de tiempo para evitar caché
      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      // Manejo de error 502 (Servidor reiniciando)
      if (res.status === 502) {
        setApiStatus('error');
        setErrorMessage('El servidor de Render está despertando. Espere un momento...');
        return;
      }

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      
      const data = await res.json();
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
        setErrorMessage('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Escaneo de QR pendiente' : 'Iniciando servicio de WhatsApp...');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fallo de enlace:", e.message);
      setApiStatus('error');
      setErrorMessage('Enlace interrumpido. Verifique su instancia en Render.');
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
    alert("Directorio restaurado con datos de respaldo.");
  };

  // --- Procesamiento de Inteligencia Artificial con Gemini ---
  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    if (!targetList) return;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
      if (!activeApiKey) throw new Error("API Key de Gemini no encontrada.");

      const prompt = `Actúa como experto en marketing y copywriter. Reescribe este mensaje para cada contacto de forma única y natural.
      Usa el campo de género (M/F) para la concordancia gramatical (ej: Bienvenido/Bienvenida).
      IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE un array JSON válido con el formato: [{"telefono": "...", "mensaje": "..."}].
      BASE: "${currentCampaign.baseMessage}" 
      DATOS: ${JSON.stringify(targetList.contacts)}`;

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
      alert("Fallo al procesar con IA: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={24} className="text-white fill-current" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter leading-none italic">WhatsAI</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Enterprise PRO</span>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'listas', label: 'Directorios', icon: Database },
            { id: 'campana', label: 'Campaña IA', icon: MessageSquare },
            { id: 'envios', label: 'Cola de Envío', icon: Play },
            { id: 'config', label: 'Ajustes & QR', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id 
                ? 'bg-blue-600 shadow-xl shadow-blue-900/40 translate-x-2' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'} />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Widget de Monitoreo de Estado */}
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Activity size={12} className="text-blue-400" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Estado Motor</p>
            </div>
            <button onClick={() => checkApiStatus(settings.waApiUrl)}>
              <RefreshCw size={14} className={apiStatus === 'buscando' ? 'animate-spin' : 'text-blue-400'} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full shadow-[0_0_12px] ${
                 apiStatus === 'conectado' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 
                 apiStatus === 'error' ? 'bg-red-500 shadow-red-500/50' : 
                 apiStatus === 'desconectado' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-slate-500'
             }`} />
             <span className="text-xs font-black uppercase tracking-tighter">
               {apiStatus === 'conectado' ? 'Sincronizado' : 
                apiStatus === 'error' ? 'Enlace Roto' : 
                apiStatus === 'desconectado' ? 'Pendiente QR' : 'Sincronizando...'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 italic">Rev: {lastCheck}</p>}
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2 text-center md:text-left">
              <h2 className="text-5xl font-black tracking-tight text-slate-900 italic">Configuración</h2>
              <p className="text-slate-500 text-lg">Vincule su infraestructura de Render y Gemini.</p>
            </header>
            
            <div className="grid gap-8">
                {/* Panel Servidor */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden">
                   <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800 mb-10"><Smartphone className="text-blue-600" size={28}/> Servidor Render</h3>
                   
                   <div className="space-y-4 mb-10">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de la Instancia</label>
                     <input 
                        type="url" 
                        value={settings.waApiUrl}
                        onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                        placeholder="Ej: https://backend-whatsai.onrender.com"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 focus:border-blue-600 outline-none transition-all font-semibold"
                     />
                   </div>

                   {/* Pantalla Dinámica: QR o Conectado */}
                   <div className="border-t border-slate-100 pt-10">
                       {apiStatus === 'desconectado' && qrCode ? (
                         <div className="flex flex-col md:flex-row items-center gap-10 bg-blue-50/50 p-12 rounded-[2.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                           <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-blue-100">
                             <img src={qrCode} alt="WhatsApp QR" className="w-56 h-56" />
                           </div>
                           <div className="text-center md:text-left space-y-4 flex-1">
                                <h4 className="font-black text-blue-900 text-2xl tracking-tighter italic">Vincule su Dispositivo</h4>
                                <p className="text-sm text-blue-800/70 leading-relaxed">
                                  Escanee el código con su teléfono (WhatsApp {' > '} Dispositivos Vinculados). La app se sincronizará automáticamente.
                                </p>
                           </div>
                         </div>
                       ) : apiStatus === 'conectado' ? (
                         <div className="text-center py-12 bg-green-50/50 rounded-[2.5rem] border-2 border-dashed border-green-200 animate-in fade-in">
                            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6 shadow-green-200 shadow-xl rounded-full" />
                            <h4 className="text-3xl font-black text-slate-900 uppercase italic">Motor Operativo</h4>
                            <p className="text-slate-500 mt-2">Sesión de WhatsApp activa en el servidor.</p>
                         </div>
                       ) : apiStatus === 'error' ? (
                        <div className="bg-red-50 p-12 rounded-[2.5rem] border-2 border-dashed border-red-200 text-center animate-in shake-in">
                          <AlertCircle size={48} className="text-red-500 mx-auto mb-6" />
                          <h4 className="text-red-800 font-black text-2xl uppercase tracking-tighter italic">Fallo de Comunicación</h4>
                          <p className="text-sm text-red-600 mt-2 max-w-sm mx-auto">{errorMessage}</p>
                          <button onClick={() => checkApiStatus(settings.waApiUrl)} className="mt-8 px-8 py-3 bg-white text-red-600 rounded-2xl font-black uppercase text-xs shadow-sm hover:bg-red-50 transition-all">Reintentar Ahora</button>
                        </div>
                       ) : (
                        <div className="text-center py-16 text-slate-300 italic flex flex-col items-center gap-4">
                          <Loader2 className="animate-spin" size={32} />
                          <p className="text-sm font-bold uppercase tracking-[0.2em]">Contactando con Render...</p>
                        </div>
                       )}
                   </div>
                </div>

                {/* Card Gemini */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
                   <h3 className="text-xl font-bold mb-8 flex items-center gap-4 text-slate-800"><BrainCircuit className="text-purple-600" size={28}/> Cerebro Gemini IA</h3>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API KEY DE GOOGLE AI</label>
                      <input 
                        type="password" 
                        value={settings.geminiKey}
                        onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                        placeholder="Introduce tu API Key de Gemini..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 pl-10 focus:border-purple-600 outline-none transition-all font-mono"
                      />
                   </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={handleSaveSettings} 
                        className="flex-1 bg-slate-900 text-white rounded-[2rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-tighter"
                    >
                      {isSaved ? 'DATOS GUARDADOS' : 'GUARDAR Y SINCRONIZAR'}
                    </button>
                    <button 
                        onClick={resetDirectorio}
                        className="bg-white border-2 border-slate-200 text-slate-300 hover:text-red-500 hover:bg-red-50 p-8 rounded-[3rem] transition-all"
                        title="Reiniciar Datos de Prueba"
                    >
                        <RefreshCcw size={28} />
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Pestaña Listas */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900">Directorios</h2>
               <button className="bg-slate-900 text-white px-8 py-5 rounded-3xl font-black text-sm flex items-center gap-3 hover:shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                 <Plus size={20} /> Nueva Lista
               </button>
             </div>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
                    <h3 className="text-2xl font-bold mb-8 uppercase italic text-slate-800 flex justify-between items-center">
                        {list.name}
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-3 py-1 rounded-lg">{list.contacts.length} Contactos</span>
                    </h3>
                    <div className="space-y-4">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all">
                           <div className="space-y-1">
                             <p className="text-lg font-black text-slate-800">{c.nombre} {c.apellido}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-widest">{c.telefono}</p>
                           </div>
                           <div className={`w-12 h-12 rounded-3xl flex items-center justify-center text-[10px] font-black shadow-inner border border-white/50 ${c.genero === 'F' ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
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

        {/* Pestaña Campaña IA */}
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
                    {isGenerating ? <RefreshCw className="animate-spin" size={32} /> : <Wand2 size={32} className="fill-current" />}
                    TRANSFORMAR CON IA (GEMINI)
                </button>
            </div>
          </div>
        )}

        {/* Pestaña Cola de Envío */}
        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10 border-b border-slate-100 pb-8 text-slate-900">Cola de Ejecución</h2>
            <div className="grid gap-6">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 text-slate-300 italic text-2xl font-black">
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
                    <button className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-600 active:scale-90 transition-all shrink-0">
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
