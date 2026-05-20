import { Play, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

// Helper hook to get the previous value of a state or prop
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function EnviosTab({ whatsapp, gemini }) {
  const { apiStatus, sendMessagesMassive, isSending, cancelSendMassive, messageStatuses } = whatsapp;
  const { generatedMessages, setGeneratedMessages, campaignMedia } = gemini;

  const prevIsSending = usePrevious(isSending);

  useEffect(() => {
    // Cuando el proceso de envío termina (isSending pasa de true a false)
    if (prevIsSending && !isSending && generatedMessages.length > 0) {
      toast.success('Proceso de envío finalizado.');
      // Limpiar la cola de la UI
      setGeneratedMessages([]);
    }
  }, [isSending, prevIsSending, setGeneratedMessages, generatedMessages.length]);

  const handleSendMassive = async () => {
    const success = await sendMessagesMassive(generatedMessages, campaignMedia);
    if (success) {
      toast.success('Envío masivo iniciado. El servidor procesará los mensajes en segundo plano.');
      // La cola ya no se limpia aquí. Se limpiará cuando el proceso termine.
    } else {
      toast.error('Error al iniciar el envío masivo. Revisa la consola.');
    }
  };

  const handleCancel = async () => {
    await cancelSendMassive();
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-end mb-12">
         <h2 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 font-sans">Cola de Envío</h2>
         {isSending ? (
            <button
              onClick={handleCancel}
              className="bg-red-600 text-white px-12 py-6 rounded-full font-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all text-lg uppercase"
            >
              <X size={24} />
              CANCELAR ENVÍO
            </button>
         ) : generatedMessages.length > 0 && (
            <button
              disabled={apiStatus !== 'conectado'}
              onClick={handleSendMassive}
              className="bg-green-600 text-white px-12 py-6 rounded-full font-black flex items-center gap-4 shadow-2xl hover:scale-105 transition-all text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={24} className="fill-white" />
              INICIAR ENVÍO MASIVO
            </button>
         )}
      </div>
      <div className="space-y-6">
        {generatedMessages.length === 0 ? (
          <p className="text-center text-slate-400 font-bold">No hay mensajes en la cola. Genera una campaña primero.</p>
        ) : (
          generatedMessages.map((msg, i) => {
            const currentStatus = messageStatuses[msg.telefono] || msg.status;
            return (
            <div key={i} className={`bg-white p-10 rounded-[3rem] border-2 flex items-center justify-between ${currentStatus === 'sent' ? 'border-green-100 bg-green-50/10' : currentStatus === 'error' ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
              <div className="flex-1 mr-12">
                <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-3 py-1 rounded-full mb-3 inline-block font-sans">{msg.telefono}</span>
                <p className="font-bold text-xl text-slate-800 leading-tight">{msg.mensaje}</p>
              </div>
              <div className={`text-xs font-black p-4 rounded-2xl ${currentStatus === 'sent' ? 'text-green-500 bg-green-100' : currentStatus === 'error' ? 'text-red-500 bg-red-100' : 'text-slate-300'}`}>
                 {currentStatus === 'sent' ? 'ENVIADO ✅' : currentStatus === 'sending' ? 'PROCESANDO...' : currentStatus === 'error' ? 'ERROR ❌' : 'LISTO'}
              </div>
            </div>
          )})
        )}
      </div>
    </div>
  );
}
