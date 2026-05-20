import { MessageSquare, Play, Clock, Settings, Monitor } from 'lucide-react';
import { NavItem } from './NavItem';
import { useWhatsApp } from '../../hooks/useWhatsApp';

export function Sidebar({ activeTab, setActiveTab }) {
  const { apiStatus } = useWhatsApp();

  return (
    <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0">
      <div className="flex items-center gap-4 mb-12">
        <div className="bg-green-500 p-2 rounded-2xl">
          <Monitor size={24} className="text-white" />
        </div>
        <h1 className="font-black text-2xl uppercase italic tracking-tighter">WhatsAI PRO</h1>
      </div>
      <nav className="space-y-3 flex-1">
        <NavItem id="campana" icon={MessageSquare} label="Campaña IA" active={activeTab} onClick={setActiveTab} />
        <NavItem id="envios" icon={Play} label="Cola de Envío" active={activeTab} onClick={setActiveTab} />
        <NavItem id="historial" icon={Clock} label="Historial" active={activeTab} onClick={setActiveTab} />
        <NavItem id="config" icon={Settings} label="Ajustes Local" active={activeTab} onClick={setActiveTab} />
      </nav>
      <div className="mt-auto p-5 bg-white/5 rounded-3xl border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase text-slate-500">Motor PC</span>
          <div className={`w-2 h-2 rounded-full ${apiStatus === 'conectado' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
        <span className="text-xs font-bold uppercase tracking-tight">
          {apiStatus === 'conectado' ? 'Sistema Listo ✅' : 'Sin conexión ❌'}
        </span>
      </div>
    </aside>
  );
}
