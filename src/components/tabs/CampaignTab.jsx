import { useState, useRef, useEffect } from 'react';
import { Wand2, RefreshCw, UploadCloud, FileSpreadsheet, Users, Save, List, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export function CampaignTab({ setActiveTab, contacts, setContacts, gemini }) {
  const { isGenerating, generateMessages, setCampaignMedia } = gemini;
  const [campaigns, setCampaigns] = useState([]);
  const [currentCampaign, setCurrentCampaign] = useState({
    id: null,
    name: '',
    baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Te escribo de parte de Vente Venezuela El partido de la libertad...',
    media: null
  });

  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('http://localhost:3000/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns', err);
    }
  };

  const handleSaveCampaign = async () => {
    if (!currentCampaign.name.trim()) {
      toast.error('Por favor, ingresa un nombre para la campaña.');
      return;
    }
    try {
      const method = currentCampaign.id ? 'PUT' : 'POST';
      const url = currentCampaign.id 
        ? `http://localhost:3000/campaigns/${currentCampaign.id}`
        : `http://localhost:3000/campaigns`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentCampaign.name,
          base_message: currentCampaign.baseMessage,
          contacts: contacts,
          media: currentCampaign.media ? JSON.stringify(currentCampaign.media) : null
        })
      });

      if (res.ok) {
        toast.success('Campaña guardada exitosamente');
        fetchCampaigns();
        if (!currentCampaign.id) {
            const data = await res.json();
            setCurrentCampaign(prev => ({...prev, id: data.id}));
        }
      } else {
        toast.error('Error al guardar la campaña');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error de red al guardar la campaña');
    }
  };

  const handleSelectCampaign = (e) => {
    const id = e.target.value;
    if (!id) {
      setCurrentCampaign({ id: null, name: '', baseMessage: 'Hola {{Nombre}}, ¿cómo estás? Te escribo de parte de Vente Venezuela El partido de la libertad...', media: null });
      setContacts([]);
      return;
    }
    const selected = campaigns.find(c => c.id === parseInt(id));
    if (selected) {
      setCurrentCampaign({ 
        id: selected.id, 
        name: selected.name, 
        baseMessage: selected.base_message,
        media: selected.media ? JSON.parse(selected.media) : null
      });
      setContacts(selected.contacts || []);
      toast.success(`Campaña "${selected.name}" cargada`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const formattedContacts = data.map(row => {
        const getVal = (keys) => {
           const foundKey = Object.keys(row).find(k => keys.includes(String(k).toLowerCase().trim()));
           return foundKey ? row[foundKey] : '';
        };

        let tel = getVal(['telefono', 'teléfono', 'phone', 'celular', 'numero', 'número', 'whatsapp']);
        if (tel) {
            tel = String(tel).replace(/\D/g, ''); // Limpiar para dejar solo números
            // Arreglar números de Venezuela con el 0 adicional (ej: 580412... a 58412...)
            if (tel.startsWith('580') && tel.length === 13) {
                tel = '58' + tel.substring(3);
            }
        }

        return {
          telefono: tel,
          nombre: getVal(['nombre', 'name', 'nombres', 'cliente']),
          apellido: getVal(['apellido', 'apellidos', 'last name', 'lastname']) || '',
          colegio_ciudadanos: getVal(['centro electoral', 'centro', 'colegio', 'colegio de ciudadanos']) || 'No asignado',
          genero: getVal(['genero', 'género', 'sexo', 'gender', 'sex'])?.toString().toUpperCase()?.charAt(0) || 'M',
          ...row
        };
      }).filter(c => c.telefono && c.telefono.length > 5);

      if (formattedContacts.length === 0) {
         toast.error("No se encontraron contactos válidos. La hoja de cálculo debe tener una columna 'Telefono'.");
         return;
      }

      setContacts(formattedContacts);
      e.target.value = ''; // Limpiar el input para permitir volver a subir el mismo archivo si se modificó
    };
    reader.readAsBinaryString(file);
  };

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64Data = evt.target.result.split(',')[1];
      setCurrentCampaign(prev => ({
        ...prev,
        media: {
          mimetype: file.type,
          data: base64Data,
          filename: file.name
        }
      }));
      toast.success('Archivo multimedia adjuntado');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleProcessIA = async () => {
    if (contacts.length === 0) {
      toast.error("Sube una base de datos de contactos antes de generar los mensajes.");
      return;
    }
    setCampaignMedia(currentCampaign.media);
    const success = await generateMessages(currentCampaign.baseMessage, contacts);
    if (success) {
      setActiveTab('envios');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
       <div className="flex justify-between items-center">
         <h2 className="text-5xl font-black italic uppercase tracking-tighter">Nueva Campaña</h2>
         {campaigns.length > 0 && (
           <div className="flex items-center gap-3 bg-white p-3 rounded-full border border-slate-200 shadow-sm">
             <List className="text-slate-400" size={20} />
             <select 
               className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
               onChange={handleSelectCampaign}
               value={currentCampaign.id || ''}
             >
               <option value="">-- Cargar Campaña Guardada --</option>
               {campaigns.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
             </select>
           </div>
         )}
       </div>
       
       {/* Carga de Base de Datos */}
       <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-4 border-b border-slate-100 pb-6">
            <input 
              type="text"
              placeholder="Nombre de la Campaña..."
              value={currentCampaign.name}
              onChange={e => setCurrentCampaign({...currentCampaign, name: e.target.value})}
              className="text-2xl font-black uppercase text-slate-800 outline-none bg-transparent placeholder-slate-300 flex-1"
            />
            <button 
              onClick={handleSaveCampaign}
              className="bg-green-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all w-max"
            >
              <Save size={20} /> Guardar
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase flex items-center gap-3">
               <FileSpreadsheet className="text-green-600" size={32}/>
               Base de Datos
            </h3>
            <div className="flex gap-4 items-center">
              {contacts.length > 0 && (
                <span className="bg-green-100 text-green-700 font-bold px-4 py-2 rounded-full flex items-center gap-2">
                  <Users size={18} /> {contacts.length} Contactos
                </span>
              )}
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all"
              >
                <UploadCloud size={20} />
                {contacts.length > 0 ? 'REEMPLAZAR LISTA' : 'SUBIR EXCEL / CSV'}
              </button>
            </div>
          </div>
          {contacts.length === 0 && (
             <p className="text-slate-400 font-medium">Sube un archivo de Excel (.xlsx) o CSV. El sistema detectará automáticamente las columnas "Teléfono", "Nombre", "Apellido", "Centro Electoral" (guardado como Colegio de Ciudadanos) y "Género".</p>
          )}
       </div>

       <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-slate-200 space-y-8 relative">
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-700 ml-4">Mensaje de la Campaña</h3>
            <div className="flex items-center gap-4">
               {currentCampaign.media && (
                 <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-200">
                   <ImageIcon size={16} />
                   <span className="truncate max-w-[150px]">{currentCampaign.media.filename}</span>
                   <button onClick={() => setCurrentCampaign(prev => ({...prev, media: null}))} className="hover:text-red-500 ml-2">
                     <X size={16} />
                   </button>
                 </div>
               )}
               <input 
                 type="file" 
                 accept="image/*, application/pdf, video/*" 
                 className="hidden" 
                 ref={mediaInputRef} 
                 onChange={handleMediaUpload} 
               />
               <button 
                 onClick={() => mediaInputRef.current?.click()}
                 className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-200 transition-all border border-slate-300"
                 title="Adjuntar Imagen, Video o PDF"
               >
                 <ImageIcon size={18} />
                 {currentCampaign.media ? 'CAMBIAR MULTIMEDIA' : 'ADJUNTAR MULTIMEDIA'}
               </button>
            </div>
          </div>

          <textarea 
            value={currentCampaign.baseMessage}
            onChange={e => setCurrentCampaign({...currentCampaign, baseMessage: e.target.value})}
            className="w-full h-80 bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-10 outline-none focus:border-blue-600 text-xl font-medium resize-none shadow-inner"
          />
          <button 
            disabled={isGenerating || contacts.length === 0}
            onClick={handleProcessIA}
            className="w-full bg-blue-600 text-white rounded-full py-8 font-black text-xl shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 hover:brightness-110"
          >
            {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
            {isGenerating ? 'IA PROCESANDO...' : 'REDACTAR CON GEMINI 2.5'}
          </button>
       </div>
    </div>
  );
}
