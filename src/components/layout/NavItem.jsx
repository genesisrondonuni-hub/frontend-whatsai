export function NavItem({ id, icon: Icon, label, active, onClick }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-xl scale-105' 
          : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      <Icon size={20} className={isActive ? 'fill-current' : ''} />
      <span className="font-black text-xs uppercase tracking-widest">{label}</span>
    </button>
  );
}
