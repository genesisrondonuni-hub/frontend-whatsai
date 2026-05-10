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
  // --- Estados de Navegación ---
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  
  // --- Estados de Conexión ---
  // Estados: 'conectado' (Verde), 'desconectado' (Amarillo/QR), 'error' (Rojo), 'buscando' (Gris)
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [lastCheck, setLastCheck] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // --- Estados de Campaña ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);

  // --- Directorio de Contactos (Datos de Respaldo) ---
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

  // Polling automático (revisión cada 5 segundos)
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(settings.waApiUrl), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  // --- Función Maestra de Verificación de Estado ---
  const checkApiStatus = async (url) => {
    if (!url) {
        setApiStatus('error');
        setErrorMessage('URL del servidor no configurada');
        return;
    }

    try {
      // 1. Limpieza Inteligente de la URL
      let baseUrl = url.trim().replace(/\/send\/?$/, "").replace(/\/$/, "");
      
      if (!baseUrl.startsWith('http')) {
          baseUrl = `https://${baseUrl}`;
      }

      // 2. Consulta al Servidor
      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors'
      });

      if (!res.ok) throw new Error(`El servidor respondió con código: ${res.status}`);
      
      const data = await res.json();
      
      // 3. Procesamiento de la respuesta del Backend
      if (data.whatsappReady === true) {
        setApiStatus('conectado');
        setQrCode('');
        setErrorMessage('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
        setErrorMessage(data.qr ? 'Escaneo de QR requerido' : 'Iniciando motor de WhatsApp...');
      }
      
      setLastCheck(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fallo de conexión:", e.message);
      setApiStatus('error');
      setErrorMessage(e.message.includes('Failed to fetch') ? 'No se puede contactar con el servidor. ¿Está activo Render?' : e.message);
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
    alert("Directorio reiniciado con datos de ejemplo.");
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
    <div className="flex h-screen bg-[#f1f5f9] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Lateral */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0 z-50">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={24} className="text-white fill-current" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter leading-none italic">WhatsAI</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Enterprise</span>
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
        
        {/* Widget de Monitorización en Vivo */}
        <div className="mt-auto p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Activity size={12} className="text-blue-400" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Motor de Envío</p>
            </div>
            <button 
                onClick={() => checkApiStatus(settings.waApiUrl)} 
                className="text-blue-400 hover:text-white transition-all active:rotate-180 duration-500"
            >
              <RefreshCw size={14} className={apiStatus === 'buscando' ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full shadow-[0_0_12px] ${
                 apiStatus === 'conectado' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : 
                 apiStatus === 'error' ? 'bg-red-500 shadow-red-500/50' : 
                 apiStatus === 'desconectado' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-slate-500'
             }`} />
             <span className="text-xs font-black uppercase tracking-tighter">
               {apiStatus === 'conectado' ? 'Conectado' : 
                apiStatus === 'error' ? 'Enlace Roto' : 
                apiStatus === 'desconectado' ? 'Pendiente QR' : 'Sincronizando...'}
             </span>
          </div>
          
          {lastCheck && (
              <div className="flex items-center justify-between">
                  <p className="text-[9px] text-slate-500 italic">Refresco: {lastCheck}</p>
                  {apiStatus === 'conectado' && <CheckCircle2 size={12} className="text-green-500" />}
              </div>
          )}
        </div>
      </aside>

      {/* Área de Visualización Principal */}
      <main className="flex-1 p-12 lg:p-20 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
              <h2 className="text-5xl font-black tracking-tight text-slate-900 italic">Configuración</h2>
              <p className="text-slate-500 text-lg">Administre el corazón de su sistema de mensajería.</p>
            </header>
            
            <div className="grid gap-8">
                {/* Card Servidor Render */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200 relative overflow-hidden">
                   <div className="flex justify-between items-center mb-10">
                     <h3 className="text-2xl font-bold flex items-center gap-4 text-slate-800"><PhoneIcon className="text-blue-600" size={28}/> Servidor Render</h3>
                     <div className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest ${apiStatus === 'conectado' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                       {apiStatus === 'conectado' ? '● ONLINE' : '● OFFLINE'}
                     </div>
                   </div>

                   <div className="space-y-4 mb-10">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de la Instancia</label>
                     <div className="relative">
                        <input 
                            type="url" 
                            value={settings.waApiUrl}
                            onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                            placeholder="Ej: https://backend-whatsai.onrender.com"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 pr-14 focus:border-blue-600 outline-none transition-all font-semibold text-slate-700"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2">
                            {apiStatus === 'conectado' ? <CheckCircle2 className="text-green-500" /> : <Loader2 className={`text-slate-200 ${apiStatus === 'buscando' ? 'animate-spin' : ''}`} />}
                        </div>
                     </div>
                     <p className="text-[10px] text-slate-400 italic px-2">Copia el enlace que aparece en el dashboard de Render. No es necesario añadir "/send".</p>
                   </div>

                   {/* Sección Dinámica QR / Éxito */}
                   <div className="border-t border-slate-100 pt-10">
                       {apiStatus === 'desconectado' && qrCode ? (
                         <div className="flex flex-col md:flex-row items-center gap-10 bg-blue-50/50 p-12 rounded-[2.5rem] border-2 border-dashed border-blue-200 animate-in zoom-in-95">
                           <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-blue-100">
                             <img src={qrCode} alt="WhatsApp QR" className="w-56 h-56" />
                           </div>
                           <div className="text-center md:text-left space-y-4 flex-1">
                                <div className="inline-block px-4 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">Paso Crítico</div>
                                <h4 className="font-black text-blue-900 text-2xl tracking-tighter italic">Vincule su Dispositivo</h4>
                                <p className="text-sm text-blue-800/70 leading-relaxed">
                                  Escanee el código con su teléfono (WhatsApp {' > '} Dispositivos Vinculados). La conexión se establecerá automáticamente en segundos.
                                </p>
                                <div className="flex items-center gap-2 text-blue-500 text-[10px] font-bold italic">
                                    <Info size={14} /> El QR se actualiza cada pocos minutos por seguridad.
                                </div>
                           </div>
                         </div>
                       ) : apiStatus === 'conectado' ? (
                         <div className="text-center py-16 bg-green-50/50 rounded-[2.5rem] border-2 border-dashed border-green-200 animate-in fade-in duration-1000">
                            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-200">
                              <CheckCircle2 size={56} />
                            </div>
                            <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Motor Sincronizado</h4>
                            <p className="text-slate-500 max-w-md mx-auto mt-2">Su cuenta de WhatsApp está vinculada y lista para gestionar envíos masivos inteligentes.</p>
                         </div>
                       ) : apiStatus === 'error' ? (
                        <div className="bg-red-50 p-12 rounded-[2.5rem] border-2 border-dashed border-red-200 text-center animate-in shake-in duration-300">
                          <AlertCircle size={48} className="text-red-500 mx-auto mb-6" />
                          <h4 className="text-red-800 font-black text-2xl uppercase tracking-tighter italic">Fallo de Comunicación</h4>
                          <p className="text-sm text-red-600 mt-2 max-w-sm mx-auto">{errorMessage}</p>
                          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-black hover:bg-red-200 transition-all uppercase tracking-widest">Reiniciar App</button>
                        </div>
                       ) : (
                        <div className="text-center py-16 text-slate-300 italic flex flex-col items-center gap-4">
                          <Loader2 className="animate-spin" size={32} />
                          <p className="text-sm font-bold uppercase tracking-[0.2em]">Contactando con Render...</p>
                        </div>
                       )}
                   </div>
                </div>

                {/* Card Gemini IA */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-200">
                   <h3 className="text-xl font-bold mb-8 flex items-center gap-4 text-slate-800"><BrainCircuit className="text-purple-600" size={28}/> Cerebro IA (Gemini)</h3>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">API KEY DE GOOGLE AI</label>
                      <div className="relative">
                        <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input 
                          type="password" 
                          value={settings.geminiKey}
                          onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                          placeholder="Introduce tu API Key secreta..."
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 pl-16 focus:border-purple-600 outline-none transition-all font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic px-2">Esta llave permite a la IA reescribir tus mensajes para evitar detecciones de spam.</p>
                   </div>
                </div>

                {/* Botón de Guardado Maestro */}
                <div className="flex gap-4">
                    <button 
                        onClick={handleSaveSettings} 
                        className="flex-1 bg-slate-900 text-white rounded-[2rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all transform active:scale-[0.98] uppercase tracking-tighter"
                    >
                      {isSaved ? 'Configuración Aplicada' : 'Guardar y Vincular Motor'}
                    </button>
                    <button 
                        onClick={resetDirectorio}
                        className="bg-white border-2 border-slate-200 text-slate-300 hover:text-red-500 hover:bg-red-50 p-8 rounded-[2rem] transition-all"
                        title="Reiniciar Datos de Prueba"
                    >
                        <RefreshCcw size={28} />
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Pestaña de Directorios */}
        {activeTab === 'listas' && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="flex justify-between items-center mb-10">
               <div className="space-y-1">
                   <h2 className="text-5xl font-black italic tracking-tighter uppercase">Directorios</h2>
                   <p className="text-slate-500 font-bold">Gestione sus 50 bases de datos inteligentes.</p>
               </div>
               <button className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-sm flex items-center gap-3 hover:shadow-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
                 <Plus size={20} /> Nueva Lista
               </button>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
               {lists.length > 0 ? lists.map(list => (
                 <div key={list.id} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex justify-between items-center mb-10">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black tracking-tighter text-slate-800 italic uppercase">{list.name}</h3>
                            <div className="flex gap-2">
                                <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{list.contacts.length} Contactos</span>
                                <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1 rounded-full uppercase tracking-widest italic">Google Sheets</span>
                            </div>
                        </div>
                        <button className="p-4 bg-slate-50 text-slate-300 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                       {list.contacts.map((c, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-blue-200 transition-all group/contact">
                           <div className="space-y-1">
                             <p className="text-lg font-black text-slate-800 leading-none">{c.nombre} {c.apellido}</p>
                             <p className="text-xs text-slate-400 font-bold tracking-[0.2em]">{c.telefono}</p>
                           </div>
                           <div className={`w-12 h-12 rounded-3xl flex items-center justify-center text-[10px] font-black shadow-inner border border-white/50 ${c.genero === 'F' ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                             {c.genero}
                           </div>
                         </div>
                       ))}
                       <button className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem] hover:bg-slate-50 hover:text-slate-600 transition-all mt-4">
                           + Añadir Contacto Manual
                       </button>
                    </div>
                 </div>
               )) : (
                   <div className="col-span-2 py-40 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                       <Database size={64} className="mx-auto text-slate-100 mb-6" />
                       <p className="text-2xl font-black text-slate-200 uppercase italic tracking-tighter">No hay directorios configurados</p>
                       <button onClick={resetDirectorio} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Cargar Datos de Respaldo</button>
                   </div>
               )}
             </div>
          </div>
        )}

        {/* Campaña y Ejecución (Resumen) */}
        {activeTab === 'campana' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-12 duration-700">
                <header className="space-y-2 mb-12">
                    <h2 className="text-5xl font-black italic uppercase tracking-tighter">Campaña Inteligente</h2>
                    <p className="text-slate-500 text-lg">Defina su mensaje y deje que la IA haga la personalización.</p>
                </header>

                <div className="bg-white rounded-[4rem] p-16 shadow-sm border border-slate-200 space-y-12">
                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] ml-4 italic">Mensaje Maestro (Estructura Base)</label>
                        <textarea 
                            value={currentCampaign.baseMessage}
                            onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                            className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-[3.5rem] p-12 outline-none focus:border-blue-600 text-2xl leading-relaxed shadow-inner placeholder:italic font-medium"
                            placeholder="Escriba aquí el mensaje que servirá de guía para la IA..."
                        />
                        <div className="flex gap-3 px-6">
                            <span className="bg-blue-50 text-blue-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{"{{Nombre}}"}</span>
                            <span className="bg-purple-50 text-purple-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{"{{Género}}"}</span>
                            <p className="text-[10px] text-slate-400 font-bold ml-auto italic">Use estas etiquetas para mayor precisión.</p>
                        </div>
                    </div>

                    <div className="space-y-6 pt-6">
                        <button 
                            disabled={isGenerating || apiStatus !== 'conectado'}
                            onClick={handleProcessIA}
                            className="w-full bg-gradient-to-br from-blue-600 to-indigo-800 text-white rounded-[2.5rem] py-10 font-black text-2xl shadow-2xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-6 active:scale-[0.98] disabled:grayscale disabled:opacity-50"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" size={32} /> : <Wand2 size={32} className="fill-current" />}
                            TRANSFORMAR CON INTELIGENCIA ARTIFICIAL
                        </button>
                        
                        {apiStatus !== 'conectado' && (
                            <div className="bg-red-50 p-6 rounded-3xl border-2 border-dashed border-red-100 flex items-center justify-center gap-4 text-red-500 animate-pulse">
                                <AlertCircle size={20} />
                                <p className="text-xs font-black uppercase tracking-widest italic leading-none">Vincule su WhatsApp en la pestaña de Ajustes para habilitar el motor IA</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-1000">
            <div className="flex justify-between items-end mb-12 border-b border-slate-200 pb-10">
               <div className="space-y-2">
                   <h2 className="text-5xl font-black italic uppercase tracking-tighter">Cola de Ejecución</h2>
                   <p className="text-slate-500 font-bold">Mensajes únicos procesados por Gemini listos para el envío.</p>
               </div>
               <div className="bg-slate-900 text-white p-6 rounded-3xl text-center min-w-[120px] shadow-xl">
                    <p className="text-[10px] font-black opacity-50 uppercase mb-1">Carga</p>
                    <p className="text-3xl font-black tracking-tighter leading-none italic">{generatedMessages.length}</p>
               </div>
            </div>

            <div className="grid gap-6">
              {generatedMessages.length === 0 ? (
                <div className="text-center py-40 bg-white rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-6">
                  <Play size={64} className="text-slate-100" />
                  <p className="text-slate-300 font-black text-2xl uppercase tracking-tighter italic">Bandeja de salida vacía</p>
                  <button onClick={() => setActiveTab('campana')} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">Ir a Campaña</button>
                </div>
              ) : (
                generatedMessages.map((msg, idx) => (
                  <div key={idx} className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 group-hover:w-4 transition-all" />
                    <div className="flex-1 pr-12 pl-4">
                       <div className="flex items-center gap-4 mb-4">
                         <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase tracking-widest">{msg.telefono}</span>
                         <span className="text-[10px] font-bold text-slate-400 italic">Variación IA #{idx + 1}</span>
                       </div>
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
