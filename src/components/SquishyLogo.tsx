import React from 'react';
import { motion } from 'motion/react';

export const SquishyLogo: React.FC = () => {
  return (
    <motion.div
      className="relative w-10 h-10 cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9, rotate: -5 }}
    >
      <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(229,192,123,0.4)]">
        <defs>
          <linearGradient id="gold-primary" x1="0" y1="0" x2="120" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FCD242"/>
            <stop offset="50%" stopColor="#E5C07B"/>
            <stop offset="100%" stopColor="#A6892B"/>
          </linearGradient>
        </defs>
        <motion.path 
          d="M10 80 L30 80 L50 32 L70 32 L90 80 L110 80 L85 20 L35 20 Z" 
          fill="url(#gold-primary)"
          animate={{
            d: [
              "M10 80 L30 80 L50 32 L70 32 L90 80 L110 80 L85 20 L35 20 Z",
              "M12 78 L32 78 L52 34 L72 34 L92 78 L112 78 L87 22 L37 22 Z",
              "M10 80 L30 80 L50 32 L70 32 L90 80 L110 80 L85 20 L35 20 Z"
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.polygon 
          points="60,43 70,53 60,63 50,53" 
          fill="url(#gold-primary)"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </motion.div>
  );
};
