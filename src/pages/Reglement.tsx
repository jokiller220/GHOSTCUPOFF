import { Shield, Target, Scale, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const sections = [
  {
    icon: <Target size={18} />,
    id: 'presentation',
    title: 'Article 1 — Présentation',
    content: [
      { heading: 'Tournoi Unique & Unifié', items: [
        'La Ghost Cup est un tournoi Call of Duty unique et unifié.',
        'Chaque joueur inscrit dispute à la fois des matchs en équipe (4v4) et des matchs en mêlée générale (solo).',
        'Le joueur cumule les points dans les deux cas pour un classement général unique.',
        "Il n'y a pas deux compétitions séparées. Les points s'additionnent pour désigner un seul et unique Champion de la Ghost Cup."
      ] },
    ],
  },
  {
    icon: <Shield size={18} />,
    id: 'inscription',
    title: 'Article 2 — Inscription & Éligibilité',
    content: [
      { heading: 'Conditions', items: [
        'Inscription obligatoire sur le site : pseudo Call of Duty + prénom réel + mot de passe.',
        'Le pseudo COD doit être exact et vérifiable (identifiant en jeu).',
        'À l’inscription, chaque joueur est rattaché à une équipe de 4 (avec un capitaine désigné).',
        'Format 4v4 natif : aucun remplaçant n\'est autorisé. Un joueur = une seule équipe à la fois.',
        'La répartition des poules et le calendrier des parties solo sont générés automatiquement à la clôture des inscriptions.'
      ] },
    ],
  },
  {
    icon: <Scale size={18} />,
    id: 'structure',
    title: 'Article 3 — Structure de la compétition',
    content: [
      { heading: 'Phase 1 : Qualifications (9 matchs/parties)', items: [
        'Bloc Équipe (5 matchs) : 6 équipes de 4 en poule unique. Format round-robin complet en BO3 (Search & Destroy, Contrôle, Hardpoint).',
        'Bloc Solo (4 parties) : 4 parties de Kill Confirmed en mêlée générale (FFA) (lobbys de 6-8 joueurs mélangés aléatoirement).',
        'Points Équipe : Victoire nette (2-0/3-0) = 3 pts | Victoire courte (2-1) = 2 pts | Défaite courte (1-2) = 1 pt | Défaite nette (0-2/0-3) = 0 pt.',
        'Points Solo (FFA) : 1er = 5 pts | 2e = 3 pts | 3e = 2 pts | 4e = 1 pt | 5e et + = 0 pt.'
      ] },
      { heading: 'Phase 2 : Élimination directe', items: [
        'Les meilleurs joueurs du classement général (ex. top 16) se qualifient pour le bracket final en 1v1 (BO5).',
        'Seeding basé sur le classement général (le mieux classé affronte le moins bien classé qualifié).'
      ] }
    ],
  },
  {
    icon: <AlertTriangle size={18} />,
    id: 'departage',
    title: 'Article 4 — Règles de départage',
    content: [
      { heading: 'Ordre de départage', items: [
        '1. Différentiel de manches/kills cumulé (équipe + solo).',
        '2. Meilleur classement individuel en FFA (mêlée générale).',
        '3. Fair-play (nombre de sanctions reçues pendant le tournoi).'
      ] },
    ],
  },
  {
    icon: <Shield size={18} />,
    id: 'forfaits',
    title: 'Article 5 — Ponctualité et forfaits',
    content: [
      { heading: 'Règles de présence', items: [
        'Les joueurs/équipes doivent être prêts et connectés 15 minutes avant l’heure du match.',
        'Passé 10 minutes de retard non justifié, l’adversaire peut être déclaré vainqueur par forfait.',
        'Une équipe peut jouer à 3 titulaires minimum (sans remplaçant). En dessous, forfait automatique.'
      ] },
    ],
  },
  {
    icon: <Scale size={18} />,
    id: 'validation',
    title: 'Article 6 — Preuve de score',
    content: [
      { heading: 'Preuves obligatoires', items: [
        'Chaque match/partie doit être accompagné d’une preuve : clip vidéo de l’écran de fin de partie (un screenshot n’est accepté qu’à défaut).',
        'Sur les matchs décisifs (demi-finale, finale), un observateur/admin peut être présent dans le lobby.'
      ] },
    ],
  },
];

function Section({ section, expanded, onToggle }: {
  section: typeof sections[0];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`card cursor-pointer overflow-hidden transition-all duration-200 ${expanded ? 'border-ghost-gold/20' : 'border-ghost-border hover:border-ghost-gold/10'}`}>
      <button
        className="w-full flex items-center justify-between px-4 md:px-5 py-4 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className={`transition-colors duration-200 ${expanded ? 'text-ghost-gold' : 'text-ghost-gray'}`}>
            {section.icon}
          </span>
          <span className={`font-barlow font-black text-xs md:text-sm uppercase tracking-widest transition-colors duration-200 ${expanded ? 'text-ghost-gold' : 'text-white'}`}>
            {section.title}
          </span>
        </div>
        <span className="text-ghost-gray">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-ghost-border/30 pt-3 md:pt-4 animate-fade-in">
          {section.content.map((block, i) => (
            <div key={i} className="mb-4">
              {block.heading && (
                <p className="font-barlow font-bold text-ghost-gold text-xs uppercase tracking-widest mb-3">
                  {block.heading}
                </p>
              )}
              <ul className="space-y-2">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 md:gap-3 text-ghost-gray-light text-xs md:text-sm">
                    <span className="w-1 h-1 rounded-full bg-ghost-gold mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Reglement() {
  const [expanded, setExpanded] = useState<string>('presentation');

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <p className="section-title text-center">GHOST CUP</p>
        <h1 className="font-barlow font-black text-3xl md:text-5xl text-white uppercase mb-4">
          RÈGLEMENT<br />
          <span className="text-ghost-gold">DU TOURNOI</span>
        </h1>
        <div className="gold-divider" />
        <p className="text-ghost-gray text-sm max-w-md mx-auto mt-4">
          La participation implique l'acceptation complète et sans réserve de ce règlement.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map(section => (
          <Section
            key={section.id}
            section={section}
            expanded={expanded === section.id}
            onToggle={() => setExpanded(expanded === section.id ? '' : section.id)}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 md:mt-10 p-4 md:p-5 bg-ghost-gold/5 border border-ghost-gold/20">
        <p className="text-ghost-gold font-barlow font-bold text-xs uppercase tracking-wider mb-2">
          Note importante
        </p>
        <p className="text-ghost-gray text-sm leading-relaxed">
          Les administrateurs se réservent le droit de modifier le règlement à tout moment. Toute modification sera communiquée via le système de notifications en jeu.
        </p>
      </div>
    </div>
  );
}
