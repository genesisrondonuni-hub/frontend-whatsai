import React, { useState, useEffect } from 'react';
import { 
  Users, Play, Settings, MessageSquare, CheckCircle2, 
  Loader2, Wand2, RefreshCw, Database, Zap, Clock, 
  AlertTriangle, CheckCircle, XCircle, Terminal, Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [corsIssue, setCorsIssue] = useState(false);

  // Datos de prueba: Directorio inicial
  const [contacts] = useState([
    { telefono: '584241234567', nombre: 'Eduardo', apellido: 'Avilán', genero: 'M' },
    { telefono: '584129876543', nombre: 'María', apellido: 'Pérez', genero: 'F' }
  ]);

  const [currentCampaign, setCurrentCampaign] = useState({
    baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Te escribo para comentarte que...',
  });

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('whatsAiConfigV2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
    }
  }, []);

  // Radar de conexión (Consulta cada 5 segundos)
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      interval = setInterval(() => checkApiStatus(), 5000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  const checkApiStatus = async () => {
    if (!settings.waApiUrl) return;
    try {
      // Limpieza de URL: Quita espacios y barras finales
      let baseUrl = settings.waApiUrl.trim().replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      const res = await fetch(`${baseUrl}/status?t=${Date.now()}`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error("Offline");
      
      const data = await res.json();
      setCorsIssue(false);
      
      if (data.whatsappReady) {
        setApiStatus('conectado');
        setQrCode('');
      } else {
        setApiStatus('desconectado');
        setQrCode(data.qr || '');
      }
    } catch (e) {
      // Si falla, verificamos si es un problema de CORS (bloqueo del navegador)
      setApiStatus('error');
      setCorsIssue(true);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiConfigV2', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus();
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Función para enviar mensajes uno a uno
  const handleSendMassive = async () => {
    if (!settings.waApiUrl || isSending) return;
    setIsSending(true);
    
    let baseUrl = settings.waApiUrl.trim().replace(/\/$/, "");
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    
    const messages = [...generatedMessages];
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].status === 'sent') continue;
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
            messages[i].status = response.ok ? 'sent' : 'error';
        } catch {
            messages[i].status = 'error';
        }
        setGeneratedMessages([...messages]);
        // Espera de 2 segundos entre mensajes para evitar bloqueos
        await new Promise(r => setTimeout(r, 2000));
    }
    setIsSending(false);
  };

  // Integración con Gemini para variar mensajes
  const handleProcessIA = async () => {
    if (!currentCampaign.baseMessage || isGenerating || !settings.geminiKey) {
      alert("Configura tu Gemini Key primero");
      return;
    }
    
    setIsGenerating(true);
    try {
      const prompt = `Actúa como un experto en marketing. Reescribe el siguiente mensaje de forma única y natural para cada contacto de la lista. 
      MENSAJE BASE: "${currentCampaign.baseMessage}"
      LISTA: ${JSON.stringify(contacts)}
      
      Responde EXCLUSIVAMENTE en formato JSON plano como una lista de objetos: 
      [{"telefono": "...", "nombre": "...", "mensaje": "..."}]`;

      const apiKey = settings.geminiKey;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedData = JSON.parse(text);
      
      setGeneratedMessages(parsedData.map(m => ({ ...m, status: 'pending' })));
      setActiveTab('envios');
    } catch (e) {
      alert("Error con Gemini. Revisa tu API Key y conexión.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden">
      {/* Sidebar de Navegación */}
      <aside className="w-80 bg-slate-900 text-white flex flex-col p-8 shadow-2xl shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-600/30">
            <Zap size={24} className="fill-white text-white" />
          </div>
          <h1 className="font-black text-2xl uppercase italic tracking-tighter">WhatsAI PRO</h1>
        </div>
        
        <nav className="space-y-3 flex-1">
          <NavItem id="campana" icon={MessageSquare} label="Campaña IA" active={activeTab} onClick={setActiveTab} />
          <NavItem id="envios" icon={Play} label="Cola de Envío" active={activeTab} onClick={setActiveTab} />
          <NavItem id="config" icon={Settings} label="Conexión PC" active={activeTab} onClick={setActiveTab} />
        </nav>

        {/* Indicador de Estado Global */}
        <div className="mt-auto p-5 bg-white/5 rounded-[2rem] border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Motor Local</span>
            <div className={`w-3 h-3 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : apiStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
          </div>
          <div className="flex items-center gap-3">
             <Terminal size={14} className="text-slate-500" />
             <span className="text-xs font-bold truncate">
               {apiStatus === 'conectado' ? 'Sistema Listo' : apiStatus === 'error' ? 'Bloqueo de Túnel' : 'Buscando PC...'}
             </span>
          </div>
        </div>
      </aside>

      {/* Área de Trabajo */}
      <main className="flex-1 p-12 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-5xl font-black italic tracking-tighter mb-10">Configuración</h2>
            
            <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest">URL del Túnel (Pinggy/Cloudflare)</label>
              <input 
                type="url" 
                value={settings.waApiUrl}
                onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                placeholder="https://tu-link.pinggy-free.link"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8 focus:border-blue-600 outline-none font-bold text-lg"
              />
              
              {corsIssue && (
                <div className="bg-red-50 rounded-3xl p-8 border border-red-100 mb-8 animate-in slide-in-from-top">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="text-red-500 shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-red-900 uppercase text-sm mb-2">Túnel Bloqueado por el Navegador</h4>
                      <p className="text-xs text-red-800 leading-relaxed font-medium">
                        Tu PC está encendida, pero el navegador bloqueó la conexión. Para arreglarlo:
                        <br /><br />
                        1. Haz clic aquí para abrir tu túnel: <a href={settings.waApiUrl} target="_blank" rel="noreferrer" className="underline font-black">Abrir Enlace Maestro</a>
                        <br />
                        2. Verás una página azul. Haz clic en el botón azul grande que dice <b>"Click to Continue"</b>.
                        <br />
                        3. Una vez que veas el mensaje "WhatsAI Local está ACTIVO", regresa a esta pestaña.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-10 min-h-[300px] flex items-center justify-center">
                {apiStatus === 'desconectado' && qrCode ? (
                  <div className="text-center space-y-6">
                    <div className="bg-white p-6 rounded-[3rem] shadow-2xl border-4 border-blue-600 inline-block">
                      <img src={qrCode} alt="WhatsApp QR" className="w-56 h-56" />
                    </div>
                    <p className="font-black text-blue-600 uppercase text-xs tracking-widest animate-pulse">Escanear con WhatsApp</p>
                  </div>
                ) : apiStatus === 'conectado' ? (
                  <div className="text-center py-10">
                    <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={48} className="text-green-600" />
                    </div>
                    <h3 className="text-3xl font-black italic uppercase">PC Sincronizada</h3>
                    <p className="text-slate-400 font-medium mt-2">Ya puedes empezar tus campañas masivas.</p>
                  </div>
                ) : (
                  <div className="text-center py-10 flex flex-col items-center">
                    <Loader2 className="animate-spin text-slate-200 mb-4" size={48} />
                    <p className="opacity-30 italic font-bold text-slate-400 tracking-tight text-center">
                      Esperando señal de tu PC...<br />
                      Asegúrate de que 'node index.js' esté corriendo.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <label className="block text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest">Google Gemini API Key</label>
              <input 
                type="password" 
                value={settings.geminiKey}
                onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                placeholder="Pega aquí tu clave secreta de Gemini"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-indigo-600 font-mono"
              />
            </section>

            <button onClick={handleSaveSettings} className="w-full bg-slate-900 text-white rounded-[2.5rem] py-8 font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-tighter">
              {isSaved ? 'DATOS GUARDADOS ✅' : 'GUARDAR CONFIGURACIÓN'}
            </button>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
             <h2 className="text-5xl font-black italic uppercase tracking-tighter">Mensaje de Campaña</h2>
             <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 space-y-8">
                <div className="relative">
                  <textarea 
                    value={currentCampaign.baseMessage}
                    onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                    className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10 outline-none focus:border-blue-600 text-xl font-medium resize-none"
                    placeholder="Escribe tu mensaje usando {{Nombre}}..."
                  />
                  <div className="absolute bottom-8 right-8 bg-white px-4 py-2 rounded-full border text-[10px] font-black text-slate-400 uppercase">
                    Variables permitidas: Nombre, Apellido, Genero
                  </div>
                </div>
                
                <button 
                  disabled={isGenerating || apiStatus !== 'conectado'}
                  onClick={handleProcessIA}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full py-8 font-black text-xl shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                  {isGenerating ? 'IA TRABAJANDO...' : 'PROCESAR CON IA GEMINI'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <div className="flex justify-between items-end mb-12">
               <div>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter">Cola de Envío</h2>
                  <p className="text-slate-400 font-bold mt-2 uppercase text-xs tracking-widest">{generatedMessages.length} mensajes listos</p>
               </div>
               
               {generatedMessages.length > 0 && (
                 <button 
                  disabled={isSending || apiStatus !== 'conectado'}
                  onClick={handleSendMassive}
                  className="bg-blue-600 text-white px-12 py-6 rounded-full font-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg"
                 >
                   {isSending ? <Loader2 className="animate-spin" /> : <Play size={24} className="fill-white" />}
                   {isSending ? 'PROCESANDO ENVÍOS...' : 'INICIAR ENVÍO MASIVO'}
                 </button>
               )}
            </div>

            <div className="space-y-6">
              {generatedMessages.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-300">
                   <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="font-bold text-slate-300 uppercase italic">No hay mensajes en cola. Ve a Campaña IA primero.</p>
                </div>
              ) : (
                generatedMessages.map((msg, i) => (
                  <div key={i} className={`bg-white p-10 rounded-[3rem] border-2 flex items-center justify-between transition-all ${msg.status === 'sent' ? 'border-green-100 bg-green-50/10' : 'border-slate-50'}`}>
                    <div className="flex-1 mr-12">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{msg.telefono}</span>
                         <StatusBadge status={msg.status} />
                      </div>
                      <p className="font-bold text-xl text-slate-800 leading-tight">{msg.mensaje}</p>
                    </div>
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${msg.status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-200'}`}>
                       {msg.status === 'sent' ? <CheckCircle size={32} /> : msg.status === 'error' ? <XCircle className="text-red-500" size={32} /> : <Clock size={32} />}
                    </div>
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

// Componentes de Interfaz
function NavItem({ id, icon: Icon, label, active, onClick }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all ${isActive ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white/5'}`}
    >
      <Icon size={20} className={isActive ? 'fill-current' : ''} />
      <span className="font-black text-sm tracking-tight uppercase">{label}</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const configs = {
    pending: { label: 'En cola', color: 'bg-slate-100 text-slate-500' },
    sending: { label: 'Enviando...', color: 'bg-amber-100 text-amber-600 animate-pulse' },
    sent: { label: 'Enviado ✅', color: 'bg-green-100 text-green-600' },
    error: { label: 'Fallo', color: 'bg-red-100 text-red-600' }
  };
  const config = configs[status] || configs.pending;
  return <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${config.color}`}>{config.label}</span>;
}
