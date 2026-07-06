import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-ghost-black flex flex-col items-center justify-center p-4">
      <div className="card max-w-lg w-full p-8 md:p-12 text-center animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-ghost-gold/5 blur-[50px] -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-ghost-red/5 blur-[50px] -ml-10 -mb-10"></div>
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-black border border-ghost-border flex items-center justify-center">
            <Wrench size={32} className="text-ghost-gold" />
          </div>
        </div>
        
        <p className="font-barlow font-bold text-ghost-gold text-xs uppercase tracking-[0.2em] mb-4">
          Accès Temporairement Suspendu
        </p>
        
        <h1 className="font-barlow font-black text-3xl md:text-5xl text-white uppercase mb-6">
          SITE EN MAINTENANCE
        </h1>
        
        <p className="text-ghost-gray text-sm md:text-base leading-relaxed mb-8 font-inter">
          Les administrateurs effectuent actuellement des mises à jour importantes sur le serveur du tournoi. 
          Veuillez patienter, l'accès sera rétabli sous peu.
        </p>
        
        <div className="inline-block border border-ghost-border bg-black/50 px-6 py-3">
          <p className="font-barlow text-xs text-ghost-gray uppercase tracking-widest">
            Merci de votre patience
          </p>
        </div>
      </div>
    </div>
  );
}
