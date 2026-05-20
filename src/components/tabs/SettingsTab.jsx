import { Terminal, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

export function SettingsTab({ whatsapp }) {
  const { settings, saveSettings, isSaved } = useSettings();
  const { apiStatus, qrCode, forceReconnect } = whatsapp;
  const [qrImageUrl, setQrImageUrl] = useState('');

  useEffect(() => {
    if (qrCode) {
      QRCode.toDataURL(qrCode).then(setQrImageUrl).catch(console.error);
    } else {
      setQrImageUrl('');
    }
  }, [qrCode]);

  const handleSaveAndReconnect = () => {
    saveSettings(settings);
    if (forceReconnect) {
      forceReconnect();
    }
  };

  const handleSettingsChange = (key, value) => {
    saveSettings({ ...settings, [key]: value });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h2 className="text-5xl font-black italic tracking-tighter mb-10">Configuración</h2>
      
      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
        <label className="block text-xs font-black uppercase text-slate-400 mb-4 tracking-widest text-blue-600 font-sans">
          Motor WhatsApp (URL de tu API Node.js)
        </label>
        <div className="flex items-center gap-4 bg-slate-100 rounded-3xl p-6 mb-8 font-mono font-bold text-slate-600 focus-within:ring-2 ring-blue-600 transition-all">
           <Terminal size={18} />
           <input 
              type="text" 
              value={settings.waApiUrl}
              onChange={e => handleSettingsChange('waApiUrl', e.target.value)}
              className="bg-transparent outline-none w-full"
              placeholder="http://localhost:3000"
           />
        </div>
        <div className="border-t border-slate-100 pt-10 flex justify-center min-h-[300px] items-center">
          {apiStatus === 'conectado' ? (
            <div className="text-center animate-in zoom-in">
              <CheckCircle2 size={80} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">PC Sincronizada</h3>
              <button 
                onClick={whatsapp.unlinkWhatsApp}
                className="mt-8 px-8 py-3 border-2 border-red-500 text-red-500 font-bold uppercase rounded-full hover:bg-red-50 hover:scale-105 transition-all text-sm tracking-wider"
              >
                Desvincular WhatsApp
              </button>
            </div>
          ) : apiStatus === 'desconectado' && qrImageUrl ? (
             <div className="text-center space-y-4">
                <div className="bg-white p-6 rounded-[3rem] shadow-2xl border-4 border-blue-600 inline-block">
                  <img src={qrImageUrl} alt="QR" className="w-56 h-56 mx-auto" />
                </div>
                <p className="font-black text-blue-600 uppercase text-[10px] animate-pulse">Vincular Dispositivo</p>
             </div>
          ) : apiStatus === 'error' ? (
            <div className="text-center text-red-500 animate-in zoom-in">
              <Terminal size={80} className="mx-auto mb-4" />
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">ERROR DE CONEXIÓN</h3>
              <div className="text-left bg-red-50 border border-red-200 p-6 rounded-2xl mt-6 max-w-lg mx-auto font-sans text-sm font-semibold">
                <p className="mb-2">No se pudo conectar con la API en <code className="bg-red-100 text-red-700 px-2 py-1 rounded">{settings.waApiUrl || 'URL no especificada'}</code>.</p>
                <p className="font-bold text-red-800">Pasos para solucionarlo:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Asegúrate de que el servidor de Node.js esté corriendo en una terminal separada (`node server/index.js`).</li>
                  <li>Revisa que tu firewall o antivirus no esté bloqueando el puerto 3000.</li>
                  <li>Verifica que la URL en la configuración sea la correcta.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="text-center opacity-20">
              <Loader2 className="animate-spin mb-4 mx-auto" size={40} />
              <p className="font-bold italic">Buscando motor en tu PC...</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200">
        <label className="block text-xs font-black uppercase text-slate-400 mb-4 tracking-widest text-purple-600 font-sans">
          Google Gemini API Key
        </label>
        <input 
          type="password" 
          value={settings.geminiKey}
          onChange={e => handleSettingsChange('geminiKey', e.target.value)}
          placeholder="Pega tu clave de Gemini"
          className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 outline-none focus:border-purple-600 font-mono font-bold"
        />
      </div>

      <button 
        onClick={handleSaveAndReconnect} 
        className="w-full bg-[#0f172a] text-white rounded-[2.5rem] py-8 font-black text-xl shadow-xl hover:scale-[1.01] transition-all uppercase tracking-tighter"
      >
        {isSaved ? 'CONFIGURACIÓN GUARDADA ✅' : 'GUARDAR Y VINCULAR'}
      </button>
    </div>
  );
}