import { useEffect, useState } from 'react';
import { Trophy, Target, Users, Zap, ChevronRight, Twitter, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getChampionFromMatches } from '../lib/tournament';
import { Match, Page, PublicAnnouncement } from '../types';
import { useAuth } from '../context/AuthContext';
import ChampionReveal from '../components/ChampionReveal';
import Countdown from '../components/Countdown';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const MAX_PLAYERS = 26;
const START_DATE = '2026-07-08T00:00:00';
const FINAL_DATE = '2026-07-15T20:00:00';

export default function Home({ onNavigate }: HomeProps) {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [availableSlots, setAvailableSlots] = useState(MAX_PLAYERS);
  const [champion, setChampion] = useState<string | null>(null);
  const [showChampion, setShowChampion] = useState(false);
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [isChampionAnnounced, setIsChampionAnnounced] = useState(false);
  const CHAMPION_SEEN_KEY = 'ghostcupChampionSeen';

  useEffect(() => {
    const checkDate = () => {
      setIsRegistrationClosed(new Date() >= new Date(START_DATE));
    };
    checkDate();
    const interval = setInterval(checkDate, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadCounts() {
      const [{ count: playerCount }, { count: teamCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player'),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
      ]);
      const players = playerCount ?? 0;
      setPlayerCount(players);
      setTeamCount(teamCount ?? 0);
      setAvailableSlots(Math.max(0, MAX_PLAYERS - players));
    }

    loadCounts();

    const profileChannel = supabase
      .channel('public-profiles-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadCounts)
      .subscribe();

    const teamChannel = supabase
      .channel('public-teams-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(teamChannel);
    };
  }, []);

  useEffect(() => {
    const seenChampion = window.localStorage.getItem(CHAMPION_SEEN_KEY);

    async function fetchChampion() {
      const [{ data: matchData }, { data: configData }] = await Promise.all([
        supabase.from('matches').select('*, scores:match_scores(*)').eq('format', '1v1').eq('status', 'completed'),
        supabase.from('schedule_config').select('config').eq('type', 'champion_reveal').maybeSingle()
      ]);

      const isAnnounced = configData?.config?.announced === true;
      setIsChampionAnnounced(isAnnounced);

      if (isAnnounced) {
        const winner = getChampionFromMatches(matchData as Match[] ?? []);
        setChampion(winner);
        if (winner && winner !== seenChampion) {
          setShowChampion(true);
        }
      }
    }

    fetchChampion();

    const championChannel = supabase
      .channel('champion-announcement')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchChampion)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_config' }, fetchChampion)
      .subscribe();

    return () => {
      supabase.removeChannel(championChannel);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('public_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      setAnnouncements((data as PublicAnnouncement[]) ?? []);
    })();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <section
        className="relative min-h-[70vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 40%, #0f0c08 100%)',
        }}
      >
        {/* Background image overlay */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url("/bacgroungimg.jpg")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.8) contrast(120%)',
          }}
        />
        {/* Gold vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ghost-black" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,162,39,0.3) 0%, transparent 70%)',
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 w-full">
          <div className="max-w-2xl">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 bg-ghost-gold/10 border border-ghost-gold/30 px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-ghost-gold live-indicator" />
              <span className="font-barlow font-bold text-ghost-gold text-xs uppercase tracking-widest">
                Tournoi Call of Duty — Édition 2026
              </span>
            </div>

            <h1 className="font-barlow font-black uppercase leading-none mb-4">
              <span className="block text-5xl md:text-7xl lg:text-8xl text-white tracking-tight">GHOST</span>
              <span className="block text-5xl md:text-7xl lg:text-8xl text-ghost-gold tracking-tight">CUP</span>
            </h1>
            <p className="font-barlow font-bold text-ghost-gray-light uppercase tracking-[0.3em] text-sm md:text-base mb-2">
              Le Tournoi Call of Duty
            </p>
            <p className="font-barlow font-black text-white uppercase tracking-widest text-lg md:text-xl mb-10">
              4VS4 & 1V1
            </p>

            {/* Finale date */}
            <div className="mb-8">
              <p className="font-barlow text-ghost-gray text-xs uppercase tracking-widest mb-1">Finale</p>
              <p className="font-barlow font-black text-white text-2xl md:text-3xl uppercase tracking-wider">
                15 JUILLET 2026
              </p>
            </div>

            {/* Countdown */}
            <div className="mb-10">
              <p className="font-barlow text-ghost-gray text-xs uppercase tracking-widest mb-4">Compte à rebours</p>
              <Countdown targetDate={START_DATE} />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              {profile ? (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="btn-gold text-sm flex items-center gap-2 py-3 px-8"
                >
                  MON ESPACE JOUEUR
                  <ChevronRight size={16} />
                </button>
              ) : isRegistrationClosed ? (
                <button
                  disabled
                  className="btn-outline opacity-50 cursor-not-allowed text-sm flex items-center gap-2 py-3 px-8"
                >
                  INSCRIPTIONS CLÔTURÉES
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('register')}
                  className="btn-gold text-sm flex items-center gap-2 py-3 px-8"
                >
                  S'INSCRIRE AU TOURNOI
                  <ChevronRight size={16} />
                </button>
              )}
              <button
                onClick={() => onNavigate('bracket')}
                className="btn-outline text-sm py-3 px-8"
              >
                VOIR LE BRACKET
              </button>
            </div>
            <div className="mt-6 text-sm text-ghost-gray max-w-xl">
              {isRegistrationClosed ? (
                <p className="font-barlow font-black text-ghost-gold">Les inscriptions sont officiellement clôturées.</p>
              ) : (
                playerCount < MAX_PLAYERS ? (
                  <p>
                    <span className="font-barlow font-black text-white">{playerCount}</span> participant{playerCount > 1 ? 's' : ''} inscrit{playerCount > 1 ? 's' : ''} — <span className="font-barlow font-black text-ghost-gold">{availableSlots}</span> place{availableSlots > 1 ? 's' : ''} restantes sur {MAX_PLAYERS}.
                  </p>
                ) : (
                  <p className="font-barlow font-black text-ghost-gold">Le tournoi est complet : 24 participants inscrits.</p>
                )
              )}
            </div>
          </div>

          {champion && isChampionAnnounced && (
            <div className="mt-10 rounded-3xl border border-ghost-gold/20 bg-ghost-gold/10 p-6 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-ghost-gold/5 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <p className="text-ghost-gold text-[10px] uppercase tracking-[0.4em] font-barlow font-bold mb-2 relative z-10">Champion en titre</p>
              <p className="font-barlow font-black text-white text-3xl uppercase tracking-widest relative z-10">{champion}</p>
              <p className="text-ghost-gray text-xs uppercase tracking-widest mt-3 mb-4 relative z-10">Le dernier vainqueur du bracket final 1v1</p>
              <button 
                onClick={() => setShowChampion(true)}
                className="relative z-10 btn-gold text-xs py-2 px-6"
              >
                REVOIR LE SACRE
              </button>
            </div>
          )}

          {/* Hashtag */}
          <p className="font-barlow font-bold text-ghost-gold/50 text-sm uppercase tracking-widest mt-8">
            #GHOSTCUP
          </p>
        </div>

        {/* Format cards */}
        <div className="absolute bottom-4 md:bottom-8 left-4 md:left-6 right-4 md:right-6 z-10 max-w-7xl mx-auto">
            <div className="flex gap-3 md:gap-4">
            <div
              className="flex-1 bg-ghost-dark/80 border border-ghost-gold/30 px-3 md:px-6 py-3 md:py-4 cursor-pointer hover:border-ghost-gold transition-all duration-300 group backdrop-blur"
              onClick={() => onNavigate(profile ? 'dashboard' : 'register')}
            >
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Users size={16} className="text-ghost-gold md:w-5 md:h-5" />
                <span className="font-barlow font-black text-lg md:text-2xl text-white group-hover:text-ghost-gold transition-colors">4 VS 4</span>
              </div>
              <p className="font-barlow text-ghost-gray text-[10px] md:text-xs uppercase tracking-wider">Équipes de 4</p>
            </div>
            <div
              className="flex-1 bg-ghost-dark/80 border border-ghost-gold/30 px-3 md:px-6 py-3 md:py-4 cursor-pointer hover:border-ghost-gold transition-all duration-300 group backdrop-blur"
              onClick={() => onNavigate(profile ? 'dashboard' : 'register')}
            >
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                <Target size={16} className="text-ghost-gold md:w-5 md:h-5" />
                <span className="font-barlow font-black text-lg md:text-2xl text-white group-hover:text-ghost-gold transition-colors">1 VS 1</span>
              </div>
              <p className="font-barlow text-ghost-gray text-[10px] md:text-xs uppercase tracking-wider">Duel Individuel</p>
            </div>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="bg-ghost-dark border-y border-ghost-border py-8 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <p className="section-title text-center">ANNONCES</p>
            <div className="grid gap-4 md:grid-cols-3 mt-6">
              {announcements.map(a => (
                <div key={a.id} className="card p-4 border-ghost-border">
                  <p className="font-barlow font-bold text-white text-sm uppercase tracking-wider mb-2">{a.title}</p>
                  <p className="text-ghost-gray text-xs leading-relaxed mb-3">{a.message}</p>
                  <p className="text-ghost-gray/60 text-[10px] uppercase tracking-wider">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* Stats band */}
      <section className="bg-ghost-gold py-3 md:py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-2 md:flex md:flex-wrap gap-4 md:gap-8 justify-center items-center">
          {[
            { label: 'Joueurs inscrits', value: playerCount },
            { label: 'Équipes 4v4', value: teamCount },
            { label: 'Places restantes', value: availableSlots },
            { label: 'Tournoi maximum', value: MAX_PLAYERS },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-barlow font-black text-black text-xl uppercase leading-none">{value}</p>
              <p className="font-barlow text-black/70 text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About section */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div>
            <p className="section-title">À PROPOS</p>
            <h2 className="font-barlow font-black text-4xl md:text-5xl text-white uppercase leading-tight mb-6">
              UN SEUL OBJECTIF :<br />
              <span className="text-ghost-gold">LA VICTOIRE</span>
            </h2>
            <p className="text-ghost-gray text-sm leading-relaxed mb-6">
              La Ghost Cup est une seule compétition unifiée. Chaque joueur dispute à la fois des matchs en équipe (4v4) et des parties en solo (mêlée générale) pour accumuler des points dans un classement général unique. Les meilleurs se qualifient ensuite pour la phase finale en duel 1v1 afin d'élire l'unique Champion.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button onClick={() => onNavigate('reglement')} className="btn-outline text-xs py-2">
                Voir le règlement
              </button>
              <button onClick={() => onNavigate('recompenses')} className="btn-gold text-xs py-2">
                Les récompenses
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Zap size={24} className="text-ghost-gold" />, title: 'BO5', desc: 'Best of 5 manches pour chaque match' },
              { icon: <Target size={24} className="text-ghost-gold" />, title: 'Hardpoint', desc: 'Mode principal en 4v4 — contrôle de zone' },
              { icon: <Trophy size={24} className="text-ghost-gold" />, title: 'Trophée', desc: 'Trophée exclusif + avatar Ghost Cup' },
              { icon: <Users size={24} className="text-ghost-gold" />, title: 'Double Format', desc: '4v4 équipe et 1v1 en simultané' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card p-5 hover:border-ghost-gold/30 transition-all duration-300">
                <div className="mb-3">{icon}</div>
                <p className="font-barlow font-black text-white uppercase text-sm mb-1">{title}</p>
                <p className="text-ghost-gray text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-ghost-dark border-y border-ghost-border py-10 md:py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="section-title text-center">REJOINS L'ARÈNE</p>
          <h2 className="font-barlow font-black text-4xl md:text-5xl text-white uppercase mb-6">
            Prêt à dominer ?
          </h2>
          <p className="text-ghost-gray text-sm max-w-md mx-auto mb-8">
            Inscris-toi maintenant avant la clôture des inscriptions. Les brackets sont générés automatiquement au démarrage du tournoi.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            {profile ? (
              <button onClick={() => onNavigate('dashboard')} className="btn-gold text-sm py-3 px-10 flex items-center gap-2">
                MON ESPACE <ChevronRight size={16} />
              </button>
            ) : isRegistrationClosed ? (
              <button disabled className="btn-outline opacity-50 cursor-not-allowed text-sm py-3 px-10 flex items-center gap-2">
                INSCRIPTIONS CLÔTURÉES
              </button>
            ) : (
              <button onClick={() => onNavigate('register')} className="btn-gold text-sm py-3 px-10 flex items-center gap-2">
                S'INSCRIRE <ChevronRight size={16} />
              </button>
            )}
            <button onClick={() => onNavigate('planning')} className="btn-outline text-sm py-3 px-8">
              VOIR LE PLANNING
            </button>
          </div>

          {/* Social */}
          <div className="flex justify-center gap-6 mt-10">
            {[
              { icon: <Twitter size={18} />, label: 'Twitter' },
              { icon: <Youtube size={18} />, label: 'YouTube' },
            ].map(({ icon, label }) => (
              <button key={label} className="flex items-center gap-2 text-ghost-gray hover:text-ghost-gold transition-colors text-xs font-barlow uppercase tracking-wider">
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <ChampionReveal
        champion={champion ?? ''}
        visible={showChampion}
        onClose={() => {
          setShowChampion(false);
          if (champion) {
            window.localStorage.setItem(CHAMPION_SEEN_KEY, champion);
          }
        }}
      />
    </div>
  );
}
