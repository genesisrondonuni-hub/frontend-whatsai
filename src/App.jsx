import React, { useState, useEffect } from 'react';
import { 
  Users, Play, Settings, MessageSquare, CheckCircle2, 
  Loader2, Wand2, RefreshCw, Database, Zap, Clock, 
  AlertTriangle, CheckCircle, XCircle, Terminal, ShieldCheck
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

  // Directorio de contactos
  const [contacts] = useState([
    { telefono: '584241234567', nombre: 'Eduardo', apellido: 'Avilán', genero: 'M' },
    { telefono: '584129876543', nombre: 'María', apellido: 'Pérez', genero: 'F' }
  ]);

  const [currentCampaign, setCurrentCampaign] = useState({
    baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Te escribo para comentarte que...',
  });

  useEffect(() => {
    const saved = localStorage.getItem('whatsAiConfigPro_v3');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  // Radar de conexión ultra-sensible
  useEffect(() => {
    let interval;
    if (settings.waApiUrl) {
      checkApiStatus(); // Ejecución inmediata
      interval = setInterval(() => checkApiStatus(), 4000);
    }
    return () => clearInterval(interval);
  }, [settings.waApiUrl]);

  const checkApiStatus = async () => {
    if (!settings.waApiUrl) return;
    try {
      let baseUrl = settings.waApiUrl.trim().replace(/\/$/, "");
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;

      // Cabeceras especiales para saltar bloqueos de túneles
      const res = await fetch(`${baseUrl}/status?cache_bust=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'bypass-tunnel-reminder': 'true', // Especial para Localtunnel/Pinggy
        }
      });
      
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
      setApiStatus('error');
      setCorsIssue(true);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiConfigPro_v3', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus();
    setTimeout(() => setIsSaved(false), 2000);
  };

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
                headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
                body: JSON.stringify({ number: messages[i].telefono, text: messages[i].mensaje })
            });
            messages[i].status = response.ok ? 'sent' : 'error';
        } catch {
            messages[i].status = 'error';
        }
        setGeneratedMessages([...messages]);
        await new Promise(r => setTimeout(r, 2500)); // Delay para seguridad de WhatsApp
    }
    setIsSending(false);
  };

  const handleProcessIA = async () => {
    if (!settings.geminiKey) return alert("Pega tu API Key de Gemini");
    setIsGenerating(true);
    try {
      const prompt = `Reescribe de forma única y profesional: "${currentCampaign.baseMessage}". Contactos: ${JSON.stringify(contacts)}. Responde solo JSON: [{"telefono":"", "mensaje":""}]`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${settings.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
      setGeneratedMessages(parsed.map(m => ({ ...m, status: 'pending' })));
      setActiveTab('envios');
    } catch (e) {
      alert("Error IA: Revisa tu conexión");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans text-slate-900 overflow-hidden">
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <Zap size={24} className="text-blue-400 fill-current" />
          <h1 className="font-black text-2xl uppercase italic tracking-tighter">WhatsAI PRO</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          <NavItem id="campana" icon={MessageSquare} label="Campaña IA" active={activeTab} onClick={setActiveTab} />
          <NavItem id="envios" icon={Play} label="Cola de Envío" active={activeTab} onClick={setActiveTab} />
          <NavItem id="config" icon={Settings} label="Conexión PC" active={activeTab} onClick={setActiveTab} />
        </nav>

        <div className="mt-auto p-5 bg-white/5 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase text-slate-500">
            <span>Motor Local</span>
            <div className={`w-2 h-2 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-tight">
            {apiStatus === 'conectado' ? 'Sistema Activo ✅' : 'Buscando Señal...'}
          </span>
        </div>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto">
        {activeTab === 'config' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <h2 className="text-5xl font-black italic tracking-tighter text-slate-900 mb-10">Conexión Maestro</h2>
            
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <label className="block text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Enlace de Pinggy</label>
              <input 
                type="url" value={settings.waApiUrl}
                onChange={e => setSettings({...settings, waApiUrl: e.target.value})}
                placeholder="https://...run.pinggy-free.link"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 mb-8 focus:border-blue-600 outline-none font-bold text-slate-700"
              />
              
              {corsIssue && (
                <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100 mb-8 flex items-start gap-4">
                  <ShieldCheck className="text-amber-600 shrink-0" size={24} />
                  <div>
                    <h4 className="font-black text-amber-900 uppercase text-xs mb-1">Autorización Requerida</h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Tu PC está conectada pero Chrome necesita que confirmes el acceso. <br />
                      <b>1.</b> Abre <a href={settings.waApiUrl} target="_blank" className="underline font-black">este enlace</a> en una pestaña nueva.<br />
                      <b>2.</b> Haz clic en el botón azul para aceptar.<br />
                      <b>3.</b> Regresa aquí y todo se pondrá en verde.
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-10 flex justify-center min-h-[300px] items-center">
                {apiStatus === 'conectado' ? (
                  <div className="text-center animate-in zoom-in">
                    <CheckCircle2 size={80} className="text-green-500 mx-auto mb-4" />
                    <h3 className="text-3xl font-black italic uppercase italic tracking-tighter">PC Sincronizada</h3>
                    <p className="text-slate-400 font-bold">WhatsApp está operando desde tu computadora.</p>
                  </div>
                ) : apiStatus === 'desconectado' && qrCode ? (
                   <div className="text-center space-y-4">
                      <img src={qrCode} alt="QR" className="w-56 h-56 mx-auto border-8 border-white shadow-2xl rounded-3xl" />
                      <p className="font-black text-blue-600 uppercase text-[10px] animate-pulse">Escanea para Vincular</p>
                   </div>
                ) : (
                  <div className="text-center opacity-20 flex flex-col items-center">
                    <Loader2 className="animate-spin mb-4" size={40} />
                    <p className="font-bold italic">Esperando señal del servidor local...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
              <label className="block text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Gemini API Key</label>
              <input 
                type="password" value={settings.geminiKey}
                onChange={e => setSettings({...settings, geminiKey: e.target.value})}
                placeholder="Pega tu clave secreta de Gemini aquí"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-blue-600 font-mono font-bold"
              />
            </div>

            <button onClick={handleSaveSettings} className="w-full bg-[#0f172a] text-white rounded-[2.5rem] py-8 font-black text-xl shadow-xl hover:scale-[1.02] transition-all uppercase tracking-tighter">
              {isSaved ? 'CONFIGURACIÓN GUARDADA ✅' : 'GUARDAR Y VINCULAR PC'}
            </button>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
             <h2 className="text-5xl font-black italic uppercase tracking-tighter">Campaña IA</h2>
             <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 space-y-8">
                <textarea 
                  value={currentCampaign.baseMessage}
                  onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
                  className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10 outline-none focus:border-blue-600 text-xl font-medium resize-none"
                  placeholder="Escribe tu mensaje..."
                />
                <button 
                  disabled={isGenerating || apiStatus !== 'conectado'}
                  onClick={handleProcessIA}
                  className="w-full bg-blue-600 text-white rounded-full py-8 font-black text-xl shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 hover:brightness-110 transition-all"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                  {isGenerating ? 'IA TRABAJANDO...' : 'REDACTAR CON IA GEMINI'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <div className="flex justify-between items-end mb-12">
               <div>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter">Cola de Envío</h2>
                  <p className="text-slate-400 font-bold mt-2 uppercase text-xs tracking-widest">{generatedMessages.length} mensajes preparados</p>
               </div>
               {generatedMessages.length > 0 && (
                 <button 
                  disabled={isSending || apiStatus !== 'conectado'}
                  onClick={handleSendMassive}
                  className="bg-green-600 text-white px-12 py-6 rounded-full font-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all disabled:opacity-50 text-lg"
                 >
                   {isSending ? <Loader2 className="animate-spin" /> : <Play size={24} className="fill-white" />}
                   {isSending ? 'ENVIANDO...' : 'INICIAR ENVÍO MASIVO'}
                 </button>
               )}
            </div>

            <div className="space-y-6">
              {generatedMessages.map((msg, i) => (
                <div key={i} className={`bg-white p-10 rounded-[3rem] border-2 flex items-center justify-between transition-all ${msg.status === 'sent' ? 'border-green-100 bg-green-50/10' : 'border-slate-50'}`}>
                  <div className="flex-1 mr-12">
                    <div className="flex items-center gap-3 mb-3">
                       <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{msg.telefono}</span>
                       <StatusBadge status={msg.status} />
                    </div>
                    <p className="font-bold text-xl text-slate-800 leading-tight">{msg.mensaje}</p>
                  </div>
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${msg.status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-200'}`}>
                     {msg.status === 'sent' ? <CheckCircle size={32} /> : <Clock size={32} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ id, icon: Icon, label, active, onClick }) {
  const isActive = active === id;
  return (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all ${isActive ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white/5'}`}>
      <Icon size={20} className={isActive ? 'fill-current' : ''} />
      <span className="font-black text-xs tracking-widest uppercase">{label}</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const configs = {
    pending: { label: 'Listo', color: 'bg-slate-100 text-slate-500' },
    sending: { label: 'Enviando...', color: 'bg-amber-100 text-amber-600 animate-pulse' },
    sent: { label: 'Enviado ✅', color: 'bg-green-100 text-green-600' },
    error: { label: 'Fallo', color: 'bg-red-100 text-red-600' }
  };
  const config = configs[status] || configs.pending;
  return <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${config.color}`}>{config.label}</span>;
}
