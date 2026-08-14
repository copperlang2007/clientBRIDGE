import React, { useState } from 'react';
import { SquishyLogo } from './SquishyLogo';
import { ArrowLeft, Activity, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] border-b border-gold/10 bg-vanta/80 backdrop-blur-md px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-4">
        <button className="hidden sm:flex items-center gap-2 text-oat/60 hover:text-gold transition-colors text-xs font-mono group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Hub
        </button>
        <div className="hidden sm:block h-4 w-[1px] bg-gold/20" />
        <div className="flex items-center gap-3">
          <SquishyLogo />
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-black tracking-tighter text-oat uppercase">Floor Ops</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-widest">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">Deliverables</a>
        <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">Invoices</a>
        <a href="#" className="text-[10px] font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">SOW</a>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 border border-gold/20 rounded-full bg-gold/5">
          <Activity size={12} className="text-gold" />
          <span className="text-[10px] font-mono text-gold uppercase tracking-tighter">System Nominal</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gold hover:bg-gold/10 rounded-lg transition-colors"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-vanta border-b border-gold/10 p-6 flex flex-col gap-6 md:hidden backdrop-blur-xl"
          >
            <a href="#" onClick={() => setIsMenuOpen(false)} className="text-xs font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">Deliverables</a>
            <a href="#" onClick={() => setIsMenuOpen(false)} className="text-xs font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">Invoices</a>
            <a href="#" onClick={() => setIsMenuOpen(false)} className="text-xs font-mono uppercase tracking-widest text-oat/60 hover:text-gold transition-colors">SOW</a>
            <div className="flex items-center gap-2 px-4 py-2 border border-gold/20 rounded-full bg-gold/5 w-fit">
              <Activity size={12} className="text-gold" />
              <span className="text-[10px] font-mono text-gold uppercase tracking-tighter">System Nominal</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
