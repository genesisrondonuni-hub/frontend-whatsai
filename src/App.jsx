import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, Database, Plus, Trash2, Smartphone as PhoneIcon
} from 'lucide-react';

// Clave de sistema por defecto (entorno)
const systemApiKey = ""; 

export default function App() {
  // --- Estados de Navegación ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState('desconocido'); // 'conectado', 'desconectado', 'error'
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  
  // --- Estados de Campaña ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  // --- Datos de Directorio (Datos de respaldo para evitar pantallas vacías) ---
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

  // --- Carga de Configuración ---
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

  // Polling automático cada 6 segundos
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 6000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Verificación de Estado (Sincronizada con el Servidor Blindado) ---
  const checkApiStatus = async (url) => {
    if (!url) return;
    try {
      // Limpieza de URL para evitar errores de ruta
      const baseUrl = url.trim().split('/send')[0].replace(/\/$/, "");
      
      // Petición con parámetro único para saltar la caché del navegador
      const res = await fetch(`${baseUrl}/status?timestamp=${Date.now()}`, {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const data = await res.json();
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
      }
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fallo de enlace con Render:", e.message);
      setApiStatus('error');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    
    const prompt = `Reescribe este mensaje para cada contacto. JSON: [{"telefono": "string", "mensaje": "string"}]. BASE: "${currentCampaign.baseMessage}" DATA: ${JSON.stringify(targetList.contacts)}`;

    try {
      const activeApiKey = settings.geminiKey || systemApiKey;
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
      console.error("Error de Gemini:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="font-black text-2xl tracking-tighter italic">WhatsAI</h1>
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
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                ? 'bg-blue-600 shadow-xl shadow-blue-900/40 translate-x-2' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Widget de Estado del Motor */}
        <div className="mt-auto p-5 bg-white/5 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Motor de Envío</p>
            <button onClick={() => checkApiStatus(settings.waApiUrl)} className="text-blue-400 hover:rotate-180 transition-transform duration-500">
              <RefreshCw size={14} className={apiStatus === 'desconocido' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : apiStatus === 'error' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
             <span className="text-xs font-black uppercase tracking-tight">
               {apiStatus === 'conectado' ? 'Conectado' : apiStatus === 'error' ? 'Error Enlace' : 'Pendiente QR'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 mt-3 italic text-right">Sinc: {lastCheck}</p>}
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <header className="space-y-2">
              <h2 className="text-5xl font-black tracking-tight text-slate-900">Configuración</h2>
              <p className="text-slate-500 text-lg">Vincule su infraestructura para comenzar los envíos.</p>
            </header>
            
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><PhoneIcon className="text-blue-600"/> Servidor de Render</h3>
               <input 
                 type="url" 
                 value={settings.waApiUrl}
                 onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                 placeholder="https://backend-whatsai.onrender.com"
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 mb-8 focus:border-blue-600 outline-none transition-all font-medium"
               />

               {apiStatus === 'desconectado' && qrCode ? (
                 <div className="flex flex-col items-center gap-8 bg-blue-50/50 p-12 rounded-[2.5rem] border-2 border-dashed border-blue-200">
                   <div className="bg-white p-6 rounded-[2rem] shadow-2xl">
                     <img src={qrCode} alt="QR" className="w-64 h-64" />
                   </div>
                   <div className="text-center space-y-2">
                    <p className="font-black text-blue-900 text-xl italic">¡Vincule su WhatsApp!</p>
                    <p className="text-sm text-blue-600/70 max-w-xs mx-auto">Escanee el código. El sistema se conectará automáticamente al detectar la sesión.</p>
                   </div>
                 </div>
               ) : apiStatus === 'conectado' ? (
                 <div className="text-center py-16 bg-green-50/50 rounded-[2.5rem] border-2 border-dashed border-green-200">
                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                      <CheckCircle2 size={48} />
                    </div>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Sistema Operativo</p>
                    <p className="text-slate-500 mt-2">WhatsApp vinculado y listo para procesar campañas.</p>
                 </div>
               ) : apiStatus === 'error' ? (
                <div className="bg-red-50 p-10 rounded-[2.5rem] border-2 border-dashed border-red-200 text-center">
                  <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                  <p className="text-red-800 font-bold text-xl uppercase tracking-tighter">Fallo de Enlace</p>
                  <p className="text-sm text-red-600 mt-2">No se pudo contactar con el servidor. Verifique la URL de Render y asegúrese de que el servicio no esté suspendido.</p>
                </div>
               ) : (
                <div className="text-center py-12 text-slate-400 italic flex items-center justify-center gap-4">
                  <Loader2 className="animate-spin" /> Sincronizando con el servidor...
                </div>
               )}
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><BrainCircuit className="text-purple-600"/> Inteligencia Artificial (Gemini)</h3>
               <div className="relative">
                 <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                 <input 
                   type="password" 
                   value={settings.geminiKey}
                   onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                   placeholder="API Key de Google Gemini..."
                   className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 pl-16 focus:border-purple-600 outline-none transition-all"
                 />
               </div>
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-slate-900 text-white rounded-[2rem] py-8 font-black text-lg shadow-2xl hover:bg-black transition-all transform active:scale-95">
              {isSaved ? 'CONFIGURACIÓN GUARDADA' : 'ACTUALIZAR Y VINCULAR MOTOR'}
            </button>
          </div>
        )}

        {/* Pestaña Directorios */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-4xl font-black">Directorios</h2>
               <button onClick={() => setLists(initialLists)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-black transition-all">
                 <Plus size={20} /> Cargar Nueva Lista
               </button>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {lists.map(list => (
                 <div key={list.id} className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                    <h3 className="text-2xl font-bold mb-8 flex items-center justify-between">
                      {list.name}
                      <span className="text-xs bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black uppercase tracking-widest">{list.contacts.length} Contactos</span>
                    </h3>
                    <div className="space-y-4">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                           <div className="space-y-1">
                             <p className="text-base font-black text-slate-800">{c.nombre} {c.apellido}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-widest">{c.telefono}</p>
                           </div>
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm ${c.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
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

        {/* Cola de Envíos */}
        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            <h2 className="text-4xl font-black mb-10">Cola de Ejecución</h2>
            {generatedMessages.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 italic text-lg">
                No hay mensajes pendientes. Utilice la pestaña de campaña para generar envíos personalizados.
              </div>
            ) : (
              generatedMessages.map((msg, idx) => (
                <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex items-center justify-between shadow-sm hover:border-blue-500 transition-all group">
                   <div className="space-y-3 flex-1 pr-8">
                     <p className="text-xs font-black text-blue-500 tracking-[0.2em] uppercase">{msg.telefono}</p>
                     <p className="text-slate-700 leading-relaxed font-semibold text-lg">{msg.mensaje}</p>
                   </div>
                   <button className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl group-hover:bg-blue-600 group-hover:scale-110 transition-all">
                     <Send size={24} />
                   </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
                <h3 className="text-3xl font-black mb-10 italic tracking-tighter uppercase">Mensaje Maestro</h3>
                <textarea 
                  value={currentCampaign.baseMessage}
                  onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                  className="w-full h-56 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-10 outline-none focus:border-blue-600 text-xl leading-relaxed shadow-inner"
                  placeholder="Hola {{Nombre}}..."
                />
                <button 
                  disabled={isGenerating || apiStatus !== 'conectado'}
                  onClick={handleProcessIA}
                  className="w-full mt-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl py-8 font-black text-xl shadow-2xl disabled:opacity-50 flex items-center justify-center gap-5 transition-all active:scale-[0.98]"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 size={28} />}
                  PERSONALIZAR CON INTELIGENCIA ARTIFICIAL
                </button>
                {apiStatus !== 'conectado' && <p className="text-center text-red-500 text-xs font-black mt-6 uppercase italic tracking-widest">⚠ Debe conectar su WhatsApp para habilitar el motor IA</p>}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
