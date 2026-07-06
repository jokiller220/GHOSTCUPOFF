import { Match } from '../types';

interface BracketTreeProps {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
  format?: '1v1' | '4v4';
}

interface Round {
  name: string;
  matches: Match[];
  order: number;
}

function StatusDot({ status }: { status: Match['status'] }) {
  if (status === 'live') return <span className="w-2 h-2 rounded-full bg-ghost-red live-indicator inline-block" />;
  if (status === 'completed') return <span className="w-2 h-2 rounded-full bg-ghost-green inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-ghost-border inline-block" />;
}

function MatchCard({ match, onMatchClick, format }: { match: Match; onMatchClick?: (m: Match) => void; format?: string }) {
  const team1 = match.team1_name ?? 'À déterminer';
  const team2 = match.team2_name ?? 'À déterminer';
  const isTeam1Winner = match.winner_id === match.team1_id;
  const isTeam2Winner = match.winner_id === match.team2_id;

  const score1 = match.scores
    ? match.scores.filter(s => s.team1_score > s.team2_score).length
    : null;
  const score2 = match.scores
    ? match.scores.filter(s => s.team2_score > s.team1_score).length
    : null;

  return (
    <div
      className={`bg-ghost-card border border-ghost-border cursor-pointer hover:border-ghost-gold/50 transition-all duration-200 ${
        match.status === 'live' ? 'border-ghost-red/50' : ''
      } ${format === '4v4' ? 'w-32 md:w-36' : 'w-44'}`}
      onClick={() => onMatchClick?.(match)}
    >
      <div className={`flex items-center justify-between border-b border-ghost-border ${format === '4v4' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}>
        <span className={`text-ghost-gray font-barlow uppercase tracking-widest truncate flex-1 ${format === '4v4' ? 'text-[8px]' : 'text-[9px]'}`}>{match.round_name}</span>
        <StatusDot status={match.status} />
      </div>
      <div className={`flex items-center justify-between border-b border-ghost-border/50 ${isTeam1Winner ? 'bg-ghost-gold/5' : ''} ${format === '4v4' ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
        <span className={`font-barlow font-bold truncate ${isTeam1Winner ? 'text-ghost-gold' : match.winner_id && !isTeam1Winner ? 'text-ghost-gray/50' : 'text-white'} ${format === '4v4' ? 'text-[10px] max-w-[80px]' : 'text-xs max-w-[100px]'}`}>
          {team1}
        </span>
        {score1 !== null && <span className={`font-barlow font-black ml-1 ${isTeam1Winner ? 'text-ghost-gold' : 'text-ghost-gray'} ${format === '4v4' ? 'text-xs' : 'text-sm'}`}>{score1}</span>}
      </div>
      <div className={`flex items-center justify-between ${isTeam2Winner ? 'bg-ghost-gold/5' : ''} ${format === '4v4' ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
        <span className={`font-barlow font-bold truncate ${isTeam2Winner ? 'text-ghost-gold' : match.winner_id && !isTeam2Winner ? 'text-ghost-gray/50' : 'text-white'} ${format === '4v4' ? 'text-[10px] max-w-[80px]' : 'text-xs max-w-[100px]'}`}>
          {team2}
        </span>
        {score2 !== null && <span className={`font-barlow font-black ml-1 ${isTeam2Winner ? 'text-ghost-gold' : 'text-ghost-gray'} ${format === '4v4' ? 'text-xs' : 'text-sm'}`}>{score2}</span>}
      </div>
    </div>
  );
}

export default function BracketTree({ matches, onMatchClick, format = '1v1' }: BracketTreeProps) {
  const roundsMap = new Map<number, Round>();
  matches.forEach(m => {
    if (!roundsMap.has(m.round_order)) {
      roundsMap.set(m.round_order, { name: m.round_name, matches: [], order: m.round_order });
    }
    roundsMap.get(m.round_order)!.matches.push(m);
  });
  const rounds = Array.from(roundsMap.values()).sort((a, b) => a.order - b.order);

  if (rounds.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-ghost-gray text-sm font-barlow uppercase tracking-wider">
        Aucun match disponible
      </div>
    );
  }

  return (
    <div className="pb-4 min-w-0">
      <div className={`flex items-stretch min-w-max py-4 px-2 ${format === '4v4' ? 'gap-2 md:gap-4' : 'gap-8'}`}>
        {rounds.map((round, roundIdx) => (
          <div key={round.order} className="flex flex-col">
            {/* Round header */}
            <div className="mb-4 text-center">
              <span className="text-ghost-gold font-barlow font-black text-xs uppercase tracking-widest border-b border-ghost-gold/30 pb-1">
                {round.name}
              </span>
            </div>

            {/* Matches in round */}
            <div
              className="flex flex-col flex-1"
              style={{ gap: format === '4v4' ? '8px' : (roundIdx === 0 ? '8px' : `${Math.pow(2, roundIdx) * 8 + 48}px`) }}
            >
              {round.matches.sort((a, b) => a.match_order - b.match_order).map(match => (
                <div key={match.id} className="flex items-center">
                  <MatchCard match={match} onMatchClick={onMatchClick} format={format} />
                  {/* Connector line */}
                  {format === '1v1' && roundIdx < rounds.length - 1 && (
                    <div className="w-8 h-px bg-ghost-border ml-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Champion */}
        {format === '1v1' && rounds.length >= 2 && (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 text-center">
              <span className="text-ghost-gold font-barlow font-black text-xs uppercase tracking-widest">CHAMPION</span>
            </div>
            <div className="w-28 h-16 bg-ghost-card border-2 border-ghost-gold flex flex-col items-center justify-center border-gold-glow">
              <span className="text-ghost-gold font-barlow font-black text-xs uppercase tracking-wider">
                {(() => {
                  const finale = rounds[rounds.length - 1]?.matches[0];
                  if (finale?.winner_id) {
                    return finale.team1_id === finale.winner_id ? finale.team1_name : finale.team2_name;
                  }
                  return '?';
                })()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
