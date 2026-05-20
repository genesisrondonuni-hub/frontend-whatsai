import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

export function useWhatsApp() {
  const { settings } = useSettings();
  const [apiStatus, setApiStatus] = useState('buscando'); 
  const [qrCode, setQrCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState({}); // Nuevo estado para seguir mensajes individuales
  const ws = useRef(null);
  const connectionToastId = useRef(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const forceReconnect = () => setReconnectAttempt(prev => prev + 1);

  useEffect(() => {
    let reconnectTimeoutId = null;

    if (!settings.waApiUrl) {
      setApiStatus('error');
      return;
    }

    // Limpiar conexiones y toasts anteriores
    ws.current?.close(1000, 'Changing URL');
    if (connectionToastId.current) {
      toast.dismiss(connectionToastId.current);
    }

    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = settings.waApiUrl.replace(/^http/, 'ws');
    const socket = new WebSocket(wsUrl);
    ws.current = socket;
    setApiStatus('buscando');
    connectionToastId.current = toast.loading('Conectando con el motor de WhatsApp...');

    socket.onopen = () => {
      console.log('WebSocket connection established');
      toast.loading('Motor conectado. Esperando estado de WhatsApp...', { id: connectionToastId.current });
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'qr':
          setApiStatus('desconectado');
          setQrCode(message.data);
          toast('Escanea el código QR para vincular WhatsApp.', { icon: '📱', id: connectionToastId.current, duration: 10000 });
          break;
        case 'ready':
          setApiStatus('conectado');
          setQrCode('');
          toast.success('¡WhatsApp sincronizado y listo!', { id: connectionToastId.current });
          connectionToastId.current = null; // Conexión exitosa, ya no necesitamos el ID
          break;
        case 'disconnected':
          setApiStatus('desconectado');
          setQrCode('');
          toast.error('WhatsApp se ha desconectado.');
          break;
        case 'bulk-sending-started':
          setIsSending(true);
          setMessageStatuses({}); // Reset status when new bulk starts
          break;
        case 'message-status':
          setMessageStatuses(prev => ({
              ...prev,
              [message.data.number]: message.data.status
          }));
          break;
        case 'bulk-sending-finished':
        case 'bulk-sending-cancelled':
          setIsSending(false);
          break;
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket connection error. Is the server running at the specified URL?", event);
      setApiStatus('error');
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      // No mostrar error si la desconexión fue intencional (por cambio de URL o desmonte)
      if (event.code === 1000) return;

      setApiStatus('error');
      toast.error('Conexión perdida. Reconectando en 5 segundos...', { id: connectionToastId.current });
      
      reconnectTimeoutId = setTimeout(() => {
        forceReconnect();
      }, 5000);
    };

    return () => {
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (connectionToastId.current) {
        toast.dismiss(connectionToastId.current);
      }
      socket.close(1000, 'Component unmounting');
    };
  }, [settings.waApiUrl, reconnectAttempt]);

  const sendMessagesMassive = async (messages, media = null) => {
    if (!settings.waApiUrl || isSending) return;
    try {
      // El frontend ahora solo delega la tarea al backend.
      // El backend se encargará de la cola y los retardos sin bloquear la UI.
      const messagesToSend = messages.map(m => ({ number: m.telefono, text: m.mensaje }));
      const response = await fetch(`${settings.waApiUrl}/send-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesToSend, media })
      });
      
      if (response.status === 409) {
        toast.error('Ya hay un envío masivo en progreso.');
        return false;
      }
      if (!response.ok) {
        console.error('Error al iniciar el envío masivo en el backend.');
        return false;
      }
      return true; // El backend aceptó la tarea.
    } catch (error) {
      console.error('Error de red al contactar el endpoint /send-bulk', error);
      return false;
    }
  };

  const cancelSendMassive = async () => {
    if (!settings.waApiUrl || !isSending) return;
    try {
        const response = await fetch(`${settings.waApiUrl}/cancel-bulk`, {
            method: 'POST',
        });
        if (!response.ok) {
            toast.error('No se pudo cancelar el envío.');
            return false;
        }
        toast.success('Cancelando envío masivo...');
        // isSending will be set to false by the 'bulk-sending-cancelled' WebSocket event
        return true;
    } catch (error) {
        console.error('Error de red al cancelar el envío masivo', error);
        toast.error('Error de red al cancelar.');
        return false;
    }
  };

  const unlinkWhatsApp = async () => {
    if (!settings.waApiUrl) return false;
    try {
        toast.loading('Desvinculando cuenta...', { id: connectionToastId.current });
        setApiStatus('buscando');
        const response = await fetch(`${settings.waApiUrl}/logout`, {
            method: 'POST',
        });
        if (!response.ok) {
            toast.error('No se pudo desvincular.', { id: connectionToastId.current });
            return false;
        }
        toast.success('Cuenta desvinculada. Esperando nuevo QR...', { id: connectionToastId.current });
        return true;
    } catch (error) {
        console.error('Error de red al desvincular', error);
        toast.error('Error de red al intentar desvincular.', { id: connectionToastId.current });
        return false;
    }
  };

  return { apiStatus, qrCode, sendMessagesMassive, isSending, cancelSendMassive, forceReconnect, unlinkWhatsApp, messageStatuses };
}
