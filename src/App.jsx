import React, { useState, useEffect } from 'react';
import { 
  Users, Play, FileSpreadsheet, Plus, Settings, MessageSquare, 
  Send, Sparkles, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon,
  Trash2, X, Timer, Key, Smartphone, Save, Server, Paperclip, ExternalLink
} from 'lucide-react';

// URL de Gemini (Opcional si usas la tuya en Ajustes)
const systemApiKey = "";

// Componente de Ventana Emergente
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('listas');
  
  // --- CONFIGURACIÓN ---
  const [settings, setSettings] = useState({ geminiKey: '', waApiUrl: '' });
  const [isSaved, setIsSaved] = useState(false);
  const [apiStatus, setApiStatus] = useState('desconocido');

  useEffect(() => {
    const saved = localStorage.getItem('whatsAiSettingsPro');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      if (parsed.waApiUrl) checkApiStatus(parsed.waApiUrl);
    }
  }, []);

  // --- DATOS Y LISTAS ---
  const [lists, setLists] = useState([
    {
      id: 'list-1',
      name: 'Lista de Ejemplo',
      contacts: [
        { telefono: '584241341702', nombre: 'Eduardo', apellido: 'Avilán', genero: 'M' }
      ]
    }
  ]);
  
  const [currentCampaign, setCurrentCampaign] = useState({
    listId: '', 
    baseMessage: 'Hola {{Nombre}}, estamos probando el nuevo sistema de envíos masivos con IA.',
    mediaFile: null, mediaBase64: '', mediaMime: '', mediaName: ''
  });
  
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListUrl, setNewListUrl] = useState('');
  const [newListCsvData, setNewListCsvData] = useState('');

  const [sendingState, setSendingState] = useState({ status: 'idle', progress: 0, currentIdx: 0, currentDelay: 0 });

  // --- LÓGICA DE CONFIGURACIÓN ---
  const handleSaveSettings = () => {
    localStorage.setItem('whatsAiSettingsPro', JSON.stringify(settings));
    setIsSaved(true);
    checkApiStatus(settings.waApiUrl);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const checkApiStatus = async (url) => {
    if (!url) return;
    setApiStatus('comprobando');
    try {
      const cleanUrl = url.split('/send')[0];
      const res = await fetch(`${cleanUrl}/status`);
      const data = await res.json();
      setApiStatus(data.whatsappReady ? 'conectado' : 'desconectado');
    } catch (e) {
      setApiStatus('error');
    }
  };

  // --- LÓGICA DE ARCHIVOS ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("Archivo muy grande (máx 10MB)");

    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentCampaign(prev => ({
        ...prev,
        mediaFile: file,
        mediaBase64: reader.result,
        mediaMime: file.type,
        mediaName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  // --- LÓGICA DE IA (GEMINI) ---
  const handleGenerateIA = async () => {
    if (!currentCampaign.listId) return alert("Selecciona una lista");
    const targetList = lists.find(l => l.id === currentCampaign.listId);
    const apiKey = settings.geminiKey || systemApiKey;
    if (!apiKey) return alert("Falta API Key de Gemini");

    setIsGenerating(true);
    try {
      const prompt = `Eres un experto en marketing. Reescribe este mensaje de forma única para cada contacto, variando saludos y estructura (Spintax) para evitar el spam de WhatsApp. Usa {{Nombre}}. Respeta el género (M/F). Mensaje: "${currentCampaign.baseMessage}". Contactos: ${JSON.stringify(targetList.contacts)}`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { telefono: { type: "STRING" }, mensaje: { type: "STRING" } } } } }
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      setGeneratedMessages(result.map(m => ({ ...m, ...targetList.contacts.find(c => c.telefono === m.telefono), status: 'pending' })));
      setActiveTab('envios');
    } catch (e) {
      alert("Error al conectar con la IA");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LÓGICA DE ENVÍO ---
  const handleAutoSend = async () => {
    if (!settings.waApiUrl) return alert("Configura la URL de tu API");
    setSendingState({ status: 'sending', progress: 0, currentIdx: 0, currentDelay: 0 });

    for (let i = 0; i < generatedMessages.length; i++) {
      const msg = generatedMessages[i];
      const delay = Math.floor(Math.random() * 3000) + 2000;
      setSendingState(p => ({ ...p, currentIdx: i, currentDelay: (delay / 1000).toFixed(1) }));
      
      await new Promise(r => setTimeout(r, delay));

      let success = false;
      try {
        const res = await fetch(settings.waApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: msg.telefono,
            text: msg.mensaje,
            mediaBase64: currentCampaign.mediaBase64 || undefined,
            mimetype: currentCampaign.mediaMime || undefined,
            filename: currentCampaign.mediaName || undefined
          })
        });
        if (res.ok) success = true;
      } catch (e) {}

      setGeneratedMessages(prev => {
        const n = [...prev]; n[i].status = success ? 'sent' : 'failed'; return n;
      });
      setSendingState(p => ({ ...p, progress: Math.round(((i + 1) / generatedMessages.length) * 100) }));
    }
    setSendingState(p => ({ ...p, status: 'completed' }));
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <nav className="w-64 bg-[#111b21] text-white flex flex-col p-4 shadow-xl">
        <div className="flex items-center gap-3 mb-10 p-2">
          <div className="bg-[#00a884] p-2 rounded-lg"><Send size={20}/></div>
          <span className="font-bold text-xl tracking-tight">WhatsAI Pro</span>
        </div>
        <div className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('listas')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'listas' ? 'bg-[#00a884]' : 'hover:bg-slate-800'}`}><Users size={18}/> Directorio</button>
          <button onClick={() => setActiveTab('campana')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'campana' ? 'bg-[#00a884]' : 'hover:bg-slate-800'}`}><MessageSquare size={18}/> Campaña</button>
          <button onClick={() => setActiveTab('envios')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'envios' ? 'bg-[#00a884]' : 'hover:bg-slate-800'}`}><Play size={18}/> Ejecución</button>
        </div>
        <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'config' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}><Settings size={18}/> Ajustes</button>
      </nav>

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'config' && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-bold mb-6">Configuración</h2>
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Gemini API Key</label>
                <input type="password" value={settings.geminiKey} onChange={e => setSettings({...settings, geminiKey: e.target.value})} className="w-full border p-3 rounded-xl bg-slate-50" placeholder="AIza..."/>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">URL de tu API en Render</label>
                <input type="url" value={settings.waApiUrl} onChange={e => setSettings({...settings, waApiUrl: e.target.value})} className="w-full border p-3 rounded-xl bg-slate-50" placeholder="https://tu-app.onrender.com/send"/>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  Estado de WhatsApp: 
                  {apiStatus === 'conectado' ? <span className="text-green-600 font-bold">● Conectado</span> : <span className="text-red-600 font-bold">● Desconectado (Escanea QR)</span>}
                </div>
              </div>
              <button onClick={handleSaveSettings} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center">
                {isSaved ? <CheckCircle2 size={20}/> : <Save size={20}/>} Guardar Cambios
              </button>
            </div>
          </div>
        )}

        {activeTab === 'campana' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Crear Campaña</h2>
            <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
              <select value={currentCampaign.listId} onChange={e => setCurrentCampaign({...currentCampaign, listId: e.target.value})} className="w-full border p-3 rounded-xl bg-slate-50">
                <option value="">Selecciona una lista...</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contacts.length})</option>)}
              </select>
              <textarea rows={5} value={currentCampaign.baseMessage} onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})} className="w-full border p-4 rounded-xl bg-slate-50" placeholder="Hola {{Nombre}}, mensaje base..."></textarea>
              
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center">
                {currentCampaign.mediaName ? (
                  <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl text-green-700">
                    <span className="flex items-center gap-2"><Paperclip size={16}/> {currentCampaign.mediaName}</span>
                    <button onClick={() => setCurrentCampaign({...currentCampaign, mediaFile: null, mediaName: '', mediaBase64: ''})}><X size={18}/></button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <div className="flex flex-col items-center text-slate-500"><ImageIcon size={30} className="mb-2"/> <span>Adjuntar Imagen o PDF</span></div>
                  </label>
                )}
              </div>
              <button onClick={handleGenerateIA} disabled={isGenerating} className="w-full bg-[#00a884] text-white py-4 rounded-2xl font-bold flex justify-center gap-2">
                {isGenerating ? <Loader2 className="animate-spin"/> : <Sparkles/>} Procesar con IA
              </button>
            </div>
          </div>
        )}

        {activeTab === 'envios' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold">Envío de Mensajes</h2>
              <button onClick={handleAutoSend} disabled={sendingState.status==='sending'} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex gap-2">
                <Play size={18}/> Iniciar Envío Automático
              </button>
            </div>

            {sendingState.status !== 'idle' && (
              <div className="bg-white p-6 rounded-2xl border mb-6">
                <div className="flex justify-between mb-2 text-sm font-bold"><span>Progreso: {sendingState.progress}%</span> <span>Pausa: {sendingState.currentDelay}s</span></div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-[#00a884] h-full transition-all duration-500" style={{width: `${sendingState.progress}%`}}></div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                  <tr><th className="p-4">Contacto</th><th className="p-4">Mensaje Personalizado</th><th className="p-4">Estado</th></tr>
                </thead>
                <tbody className="divide-y">
                  {generatedMessages.map((m, i) => (
                    <tr key={i} className={sendingState.currentIdx === i ? 'bg-green-50' : ''}>
                      <td className="p-4 font-bold text-slate-900">{m.nombre} <br/> <span className="text-xs font-mono text-slate-400">+{m.telefono}</span></td>
                      <td className="p-4 text-sm text-slate-600">{m.mensaje}</td>
                      <td className="p-4">
                        {m.status === 'sent' ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Enviado</span> : 
                         m.status === 'failed' ? <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Error</span> : 
                         <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Pendiente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}