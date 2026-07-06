import { Trophy, Crown } from 'lucide-react';

export default function Recompenses() {
  return (
    <div className="px-4 md:px-6 py-8 md:py-12 animate-slide-up">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-14">
          <p className="section-title text-center">GHOST CUP 2026</p>
          <h1 className="font-barlow font-black text-3xl md:text-5xl text-white uppercase mb-4">
            RÉCOMPENSES
          </h1>
          <div className="gold-divider" />
        </div>

        {/* Main rewards */}
        <div className="max-w-2xl mx-auto mb-8 md:mb-12">
          <div className="card relative overflow-hidden hover:border-ghost-gold/40 transition-all duration-300 group">
            {/* Gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-b from-ghost-gold/20 to-transparent opacity-60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-ghost-card to-transparent pointer-events-none" />

            <div className="relative p-5 md:p-8 text-center">
              {/* Format badge */}
              <div className="inline-flex items-center gap-2 bg-ghost-gold/10 border border-ghost-gold/30 px-3 py-1 mb-6">
                <span className="font-barlow font-black text-ghost-gold text-xs uppercase tracking-widest">RÉCOMPENSE SUPRÊME</span>
              </div>

              {/* Trophy icon */}
              <div className="flex justify-center mb-4 md:mb-6 group-hover:scale-105 transition-transform duration-300">
                <Trophy size={56} className="text-ghost-gold md:w-20 md:h-20" strokeWidth={1} />
              </div>

              {/* Title */}
              <h2 className="font-barlow font-black text-xl md:text-3xl text-white uppercase mb-1">CHAMPION DE LA GHOST CUP</h2>
              <p className="font-barlow text-ghost-gray text-xs uppercase tracking-widest mb-8">Un seul vainqueur unifié</p>

              {/* Prizes */}
              <div className="space-y-3 max-w-md mx-auto text-left">
                {[
                  { label: 'Trophée exclusif', desc: 'Le trophée officiel Ghost Cup édition 2026 — objet collector unique.' },
                  { label: 'Avatar spécial', desc: 'Avatar de Champion exclusif affiché sur votre profil de jeu.' },
                  { label: 'Gloire éternelle', desc: 'Votre nom gravé dans le Hall of Fame de la compétition.' },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-ghost-black/30 border border-ghost-border/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-ghost-gold mt-1.5 shrink-0" />
                    <div>
                      <p className="font-barlow font-bold text-ghost-gold text-xs uppercase tracking-wider">{label}</p>
                      <p className="text-ghost-gray text-xs mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-12">
          <div className="gold-divider" />
          <h3 className="font-barlow font-black text-2xl md:text-3xl text-white uppercase tracking-widest mt-6">
            UN SEUL OBJECTIF : <span className="text-ghost-gold">LA VICTOIRE !</span>
          </h3>
        </div>

        {/* Rules details info band */}
        <div className="card p-4 md:p-6 bg-ghost-gold/5 border border-ghost-gold/20 flex gap-3 md:gap-4 items-start">
          <Crown size={24} className="text-ghost-gold shrink-0 md:w-8 md:h-8" strokeWidth={1} />
          <div>
            <p className="font-barlow font-black text-ghost-gold text-sm uppercase tracking-wider mb-2">
              COMMENT DEVENIR CHAMPION ?
            </p>
            <p className="text-ghost-gray text-sm leading-relaxed">
              La compétition combine vos performances en **équipe (4v4)** et en **solo (mêlée générale)** dans un classement général unique. Les meilleurs se qualifient pour le bracket final en **1v1** afin de déterminer l'unique Champion de la Ghost Cup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
