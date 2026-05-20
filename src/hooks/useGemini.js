import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';

export function useGemini() {
  const { settings } = useSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [campaignMedia, setCampaignMedia] = useState(null);

  const generateMessages = async (baseMessage, contacts) => {
    const cleanKey = settings.geminiKey?.trim();
    if (!cleanKey) {
      toast.error("Primero pega tu API KEY en la pestaña Ajustes");
      return false;
    }
    
    setIsGenerating(true);
    try {
      const prompt = `Eres un experto en marketing por WhatsApp. Personaliza este mensaje base: "${baseMessage}" para estos contactos: ${JSON.stringify(contacts)}. 
      REGLAS:
      1. Tienes disponibles las variables: nombre, apellido, colegio_ciudadanos, telefono y genero en el JSON. Utilízalos para hacer el mensaje natural e hiper-personalizado.
      2. Si genero es M usa "Estimado" o palabras masculinas, si es F usa "Estimada" o palabras femeninas.
      3. No uses asteriscos ni negritas ni formato Markdown.
      4. MUY IMPORTANTE PARA EVITAR SPAM: No redactes exactamente el mismo mensaje para todos. Utiliza sinónimos y varía la estructura o el vocabulario de cada mensaje para que todos sean únicos, pero mantén intacto el sentido, la intención y la idea principal del mensaje base que te di.
      5. Responde SOLAMENTE con un JSON puro con este formato exacto: [{"telefono": "...", "mensaje": "..."}]`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  telefono: { type: "STRING" },
                  mensaje: { type: "STRING" }
                },
                required: ["telefono", "mensaje"]
              }
            }
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const detail = errorData.error?.message || `Error ${res.status}: Revisa tu clave y conexión.`;
        throw new Error(detail);
      }

      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      
      setGeneratedMessages(parsed.map(m => ({ ...m, status: 'pending' })));
      return true; // Exito
    } catch (e) {
      console.error("Detalle técnico:", e);
      if (e.message.includes('Failed to fetch')) {
        toast.error("Error de Red: Revisa tu conexión a Internet o si un antivirus/VPN bloquea la petición a Google.");
      } else {
        toast.error(`Error IA: ${e.message}`);
      }
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generatedMessages, setGeneratedMessages, generateMessages, campaignMedia, setCampaignMedia };
}
