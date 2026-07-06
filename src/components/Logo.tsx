import { Crosshair } from 'lucide-react';
import { Page } from '../types';

interface LogoProps {
  onNavigate: (page: Page) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ onNavigate, size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 20 : size === 'lg' ? 36 : 28;
  const textClass =
    size === 'sm'
      ? 'text-base leading-none'
      : size === 'lg'
      ? 'text-2xl leading-none'
      : 'text-xl leading-none';
  const subClass =
    size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[11px]' : 'text-[9px]';

  return (
    <button
      onClick={() => onNavigate('home')}
      className="flex items-center gap-2 group"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-ghost-gold/20 blur-sm rounded-full group-hover:bg-ghost-gold/40 transition-all duration-300" />
        <Crosshair size={iconSize} className="text-ghost-gold relative z-10" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col">
        <span className={`font-barlow font-black uppercase tracking-widest text-white ${textClass}`}>
          GHOST <span className="text-ghost-gold">CUP</span>
        </span>
        <span className={`font-barlow font-bold uppercase tracking-[0.2em] text-ghost-gray ${subClass}`}>
          Tournoi Call of Duty
        </span>
      </div>
    </button>
  );
}
