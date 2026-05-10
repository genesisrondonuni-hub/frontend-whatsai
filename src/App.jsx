import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Play, Settings, MessageSquare, Send, Sparkles, CheckCircle2, 
  Loader2, Smartphone, Save, BrainCircuit, Wand2, Key, RefreshCw, 
  AlertCircle, ChevronRight, LayoutDashboard, Database, Plus
} from 'lucide-react';

// El entorno proporciona la clave si no se ingresa una personalizada
const systemApiKey = ""; 

export default function App() {
  // --- Estados de Navegación y Configuración ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState('desconocido');
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  
  // --- Estados de Campaña ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, status: 'idle' });

  // --- Datos de Ejemplo (Simulando 1 de las 50 listas) ---
  const [lists, setLists] = useState([
    {
      id: 'list-1',
      name: 'Clientes Potenciales - Sector A',
      contacts: [
        { telefono: '584241234567', nombre: 'María', apellido: 'García', genero: 'F' },
        { telefono: '584129876543', nombre: 'Juan', apellido: 'Pérez', genero: 'M' },
        { telefono: '584140001122', nombre: 'Carlos', apellido: 'Rodríguez', genero: 'M' }
      ]
    }
  ]);

  const [currentCampaign, setCurrentCampaign] = useState({
    baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Tenemos una oferta especial para ti.',
    listId: 'list-1'
  });

  // --- Carga Inicial ---
  useEffect(() => {
    const saved = localStorage.getItem('whatsAiSettingsPro');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      if (parsed.waApiUrl) checkApiStatus(parsed.waApiUrl);
    }
  }, []);

  // --- Polling: Revisa el estado del Servidor y el QR cada 5 segundos ---
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
      // Limpiamos la URL para asegurar que apuntamos al endpoint de status
      const baseUrl = url.split('/send')[0].replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/status`);
      if (!res.ok) throw new Error('Error en servidor');
      
      const data = await res.json();
      setApiStatus(data.whatsappReady ? 'conectado' : 'desconectado');
      setQrCode(data.qr || '');
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Error de conexión:", e);
      setApiStatus('error');
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Lógica de Gemini con Exponential Backoff ---
  const generateWithGemini = async (prompt, retryCount = 0) => {
    const activeApiKey = settings.geminiKey || systemApiKey;
    if (!activeApiKey) throw new Error("API Key faltante");

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${activeApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok && retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateWithGemini(prompt, retryCount + 1);
      }

      const result = await response.json();
      const content = result.candidates[0].content.parts[0].text;
      return JSON.parse(content);
    } catch (error) {
      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateWithGemini(prompt, retryCount + 1);
      }
      throw error;
    }
  };

  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage) return;
    setIsGenerating(true);
    
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    
    const prompt = `
      Eres un experto en marketing por WhatsApp. Reescribe este mensaje para cada contacto.
      Ajusta el género (M/F) para que sea gramaticalmente correcto (ej: Estimado/Estimada).
      Devuelve un JSON con este formato: [{"telefono": "string", "mensaje": "string"}].
      MENSAJE BASE: "${currentCampaign.baseMessage}"
      CONTACTOS: ${JSON.stringify(targetList.contacts)}
    `;

    try {
      const variations = await generateWithGemini(prompt);
      setGeneratedMessages(variations.map(v => ({ ...v, status: 'pending' })));
      setActiveTab('envios');
    } catch (e) {
      console.error("Fallo en la IA:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Renderizado de Vistas ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col p-6 shadow-2xl shrink-0">
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
            <p className="text-[10px] text-slate-500 font-bold uppercase">Estado del Motor</p>
            <button onClick={() => checkApiStatus(settings.waApiUrl)} className="text-blue-400 hover:text-blue-300 transition-colors">
              <RefreshCw size={12} className={apiStatus === 'desconocido' ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : apiStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
             <span className="text-xs font-medium">
               {apiStatus === 'conectado' ? 'Conectado' : apiStatus === 'error' ? 'Sin conexión' : 'Pendiente QR'}
             </span>
          </div>
          {lastCheck && <p className="text-[9px] text-slate-500 mt-2 italic">Última rev: {lastCheck}</p>}
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 p-8 md:p-16 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-4xl font-black tracking-tight">Configuración</h2>
              <p className="text-slate-500 mt-2">Vincula tu cuenta de WhatsApp y activa Gemini.</p>
            </div>
            
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold flex items-center gap-3"><Smartphone className="text-blue-600"/> Servidor de Mensajería</h3>
                 {apiStatus === 'error' && <span className="text-red-500 text-xs font-bold flex items-center gap-1"><AlertCircle size={14}/> Error de enlace</span>}
               </div>

               <div className="space-y-2 mb-8">
                 <label className="text-xs font-black text-slate-400 uppercase ml-1">URL de Render</label>
                 <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={settings.waApiUrl}
                    onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                    placeholder="https://mi-app.onrender.com/send"
                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 focus:border-blue-600 outline-none transition-all font-medium"
                  />
                 </div>
               </div>

               {apiStatus === 'desconectado' && qrCode && (
                 <div className="flex flex-col items-center gap-6 bg-blue-50/50 p-10 rounded-[2rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                   <div className="bg-white p-4 rounded-3xl shadow-2xl">
                     <img src={qrCode} alt="QR" className="w-56 h-56" />
                   </div>
                   <div className="text-center">
                    <p className="font-black text-blue-900 text-lg">Escanea el Código QR</p>
                    <p className="text-sm text-blue-600/70">Abre WhatsApp en tu móvil para vincular el dispositivo.</p>
                   </div>
                 </div>
               )}

               {apiStatus === 'conectado' && (
                 <div className="text-center py-12 bg-green-50/50 rounded-[2rem] border-2 border-dashed border-green-200">
                    <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                      <CheckCircle2 size={40} />
                    </div>
                    <p className="text-2xl font-black text-slate-800">¡Conexión Activa!</p>
                    <p className="text-slate-500 mt-1">El sistema está listo para procesar tus campañas.</p>
                 </div>
               )}
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
               <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><BrainCircuit className="text-purple-600"/> Inteligencia Artificial</h3>
               <div className="space-y-2">
                 <label className="text-xs font-black text-slate-400 uppercase ml-1">Gemini API Key</label>
                 <div className="relative">
                   <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input 
                     type="password" 
                     value={settings.geminiKey}
                     onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                     placeholder="Tu clave secreta de Google AI..."
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 pl-14 focus:border-purple-600 outline-none transition-all"
                   />
                 </div>
               </div>
            </div>

            <button 
              onClick={handleSaveSettings} 
              className="w-full bg-slate-900 text-white rounded-2xl py-6 font-black shadow-2xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isSaved ? <><CheckCircle2 size={20}/> DATOS GUARDADOS</> : <><Save size={20}/> GUARDAR Y VINCULAR</>}
            </button>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-500">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black italic">Redactar Mensaje Maestro</h3>
                  <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                    <Database size={16} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-600">{lists[0]?.name || "Sin lista"}</span>
                  </div>
                </div>
                
                <textarea 
                  value={currentCampaign.baseMessage}
                  onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                  className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 outline-none focus:border-blue-600 text-lg leading-relaxed shadow-inner"
                  placeholder="Escribe el mensaje que servirá de base para la IA..."
                />
                
                <div className="mt-8">
                  <button 
                    disabled={isGenerating || apiStatus !== 'conectado'}
                    onClick={handleProcessIA}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl py-6 font-black flex items-center justify-center gap-4 shadow-xl hover:shadow-blue-200 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 size={22} />}
                    PERSONALIZAR CON INTELIGENCIA ARTIFICIAL
                  </button>
                  {apiStatus !== 'conectado' && <p className="text-center text-red-500 text-[10px] font-bold mt-3 uppercase tracking-wider">VINCULA WHATSAPP EN AJUSTES PARA CONTINUAR</p>}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-700">
            <div className="flex justify-between items-end mb-8">
               <h2 className="text-3xl font-black">Cola de Mensajes</h2>
               <p className="text-slate-400 font-bold text-sm italic">{generatedMessages.length} mensajes listos</p>
            </div>

            <div className="grid gap-4">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Loader2 className="mx-auto text-slate-200 mb-4 animate-spin" size={40} />
                  <p className="text-slate-400 font-medium italic">Esperando que la IA genere las variaciones...</p>
                </div>
              ) : (
                generatedMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 transition-all group">
                    <div className="flex-1 pr-8">
                       <div className="flex items-center gap-3 mb-2">
                         <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase tracking-tighter">Destino</span>
                         <span className="text-sm font-black text-slate-800">{msg.telefono}</span>
                       </div>
                       <p className="text-slate-600 text-sm leading-relaxed">{msg.mensaje}</p>
                    </div>
                    <div className="shrink-0">
                       <button className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                         <Send size={18} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'listas' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-3xl font-black">Directorios</h2>
               <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all">
                 <Plus size={18} /> Cargar Nueva Lista
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {lists.length > 0 ? (
                 lists.map(list => (
                   <div key={list.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                      <h3 className="text-xl font-bold mb-4">{list.name}</h3>
                      <div className="space-y-3">
                         {list.contacts.map((c, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <div>
                               <p className="text-sm font-bold text-slate-800">{c.nombre} {c.apellido}</p>
                               <p className="text-[10px] text-slate-400 font-bold">{c.telefono}</p>
                             </div>
                             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${c.genero === 'F' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                               {c.genero}
                             </span>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="col-span-2 text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                   <p className="text-slate-400 italic">No hay directorios cargados aún.</p>
                 </div>
               )}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
