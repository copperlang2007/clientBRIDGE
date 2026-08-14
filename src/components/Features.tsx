import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Globe } from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 border-t border-gold/5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: "Secure Signing", desc: "Military-grade encryption for all SOW and legal documentation." },
          { icon: Zap, title: "Instant Payments", desc: "Automated invoice processing with real-time settlement." },
          { icon: Globe, title: "Global Delivery", desc: "Seamless project deliverable distribution across any region." }
        ].map((feature, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-4 border border-gold/10 bg-gold/5 rounded-xl flex items-start gap-4 group hover:border-gold/20 transition-colors"
          >
            <div className="p-2 bg-gold/10 rounded-lg text-gold group-hover:scale-110 transition-transform">
              <feature.icon size={16} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-oat uppercase tracking-widest mb-1">{feature.title}</h3>
              <p className="text-[10px] text-oat/40 leading-tight">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
