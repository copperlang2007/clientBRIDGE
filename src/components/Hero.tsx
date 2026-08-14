import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Shield, Zap, Globe } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 border border-gold/20 bg-gold/5 rounded-full text-[8px] md:text-[10px] font-mono uppercase tracking-[0.2em] md:tracking-[0.3em] text-gold"
          >
            <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-gold animate-pulse" />
            Next-Gen Client Infrastructure
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-7xl font-extralight tracking-tighter leading-tight md:leading-none"
          >
            The <span className="font-extralight text-oat">artificial</span><span className="font-black text-gradient-gold">BRIDGE</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-2xl text-oat/60 font-light text-base md:text-xl leading-relaxed"
          >
            A cutting-edge client portal for signing scope of work, invoice payments, 
            and receiving project deliverables with automated precision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4 md:pt-8 w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto px-8 py-3 md:py-4 bg-gold text-vanta font-bold rounded-full flex items-center justify-center gap-2 hover:bg-oat transition-colors group text-sm md:text-base">
              Access Portal
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-8 py-3 md:py-4 border border-gold/20 text-oat font-mono text-[10px] md:text-xs uppercase tracking-widest rounded-full hover:bg-gold/5 transition-colors">
              View Documentation
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
