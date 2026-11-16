import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KanoteCorner, KanoteDivider, SafeArtwork } from './KanoteOrnaments';

export function SplashScreen({
  appName,
  subtitle,
  artworkUrl,
  onDone,
}: {
  appName: string;
  subtitle: string;
  artworkUrl: string;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="dhamma-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] px-6 cursor-pointer select-none overflow-hidden"
        >
          {/* Ambient radial golden-emerald aura */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.18)_0%,rgba(6,59,43,0.16)_38%,rgba(5,5,5,1)_72%)]"
          />

          {/* Kanote Frame Corners */}
          <KanoteCorner position="tl" className="absolute top-6 left-6 w-16 h-16 sm:w-24 sm:h-24 opacity-80" />
          <KanoteCorner position="tr" className="absolute top-6 right-6 w-16 h-16 sm:w-24 sm:h-24 opacity-80" />
          <KanoteCorner position="bl" className="absolute bottom-6 left-6 w-16 h-16 sm:w-24 sm:h-24 opacity-80" />
          <KanoteCorner position="br" className="absolute bottom-6 right-6 w-16 h-16 sm:w-24 sm:h-24 opacity-80" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center text-center max-w-md"
          >
            {/* Radiating halo */}
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(232,201,106,0.34),transparent_70%)] blur-xl animate-gold-pulse"
              />
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl p-1 bg-gradient-to-br from-[#E8C96A] via-[#C9A227] to-[#6E530B] shadow-[0_0_50px_rgba(201,162,39,0.28)]">
                <div className="w-full h-full rounded-[20px] overflow-hidden bg-[#050505]">
                  <SafeArtwork
                    src={artworkUrl}
                    alt={appName}
                    className="w-full h-full object-cover"
                    fallbackTitle={appName}
                  />
                </div>
              </div>
            </div>

            <motion.h1
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-7 text-3xl sm:text-4xl font-bold tracking-wide text-[#F7F5EE] font-myanmar"
            >
              {appName}
            </motion.h1>

            <KanoteDivider className="w-48 my-3" />

            <motion.p
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xs sm:text-sm text-[#E8C96A]/85 tracking-widest uppercase font-display"
            >
              {subtitle || 'Dhamma Yway Gyi'}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
