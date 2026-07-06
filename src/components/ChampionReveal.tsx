import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ChampionRevealProps {
  champion: string;
  onClose: () => void;
  visible: boolean;
}

export default function ChampionReveal({ champion, onClose, visible }: ChampionRevealProps) {
  const [showAudio, setShowAudio] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowAudio(true);
    }
  }, [visible]);

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-500 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,214,10,0.18),_transparent_30%)]" />
        <div className="pointer-events-none absolute top-0 left-1/2 w-80 h-80 -translate-x-1/2 rounded-full bg-ghost-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-ghost-red/15 blur-3xl" />
      </div>

      <div className="relative mx-auto mt-24 w-full max-w-4xl px-4 text-center">
        <button onClick={onClose} className="absolute right-4 top-4 text-white hover:text-ghost-gold">
          <X size={24} />
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-ghost-gold/50 bg-black/70 px-4 py-2 mb-6">
          <span className="text-ghost-gold text-[10px] uppercase tracking-[0.4em] font-barlow font-bold">CHAMPION 2026</span>
        </div>

        <div className="rounded-3xl border border-ghost-gold/20 bg-ghost-card/95 p-10 shadow-[0_0_120px_rgba(255,214,10,0.18)] backdrop-blur">
          <p className="text-ghost-gold text-sm uppercase tracking-[0.35em] mb-4">Annonce officielle</p>
          <h1 className="font-barlow font-black text-5xl md:text-7xl text-white uppercase leading-tight mb-4">
            {champion}
          </h1>
          <p className="text-ghost-gray text-sm md:text-base max-w-2xl mx-auto mb-8">
            Le champion de la Ghost Cup 2026 a été couronné. Découvrez le bracket final, les statistiques et la victoire historique.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onClose} className="btn-gold text-sm py-3 px-8">
              Voir le tournoi
            </button>
            <button onClick={() => setHasPlayed(true)} className="btn-outline text-sm py-3 px-8">
              {hasPlayed ? 'Son activé' : 'Lire la célébration'}
            </button>
          </div>
        </div>
      </div>

      {showAudio && hasPlayed && (
        <audio autoPlay muted={false} src="/champion-celebration.mp3" onEnded={() => setHasPlayed(false)} />
      )}
    </div>
  );
}
