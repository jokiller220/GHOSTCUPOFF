import { Match } from '../types';

type TeamEntry = { id: string; name: string };

type NewMatchRecord = Omit<Match, 'id' | 'created_at' | 'scores'> & { id?: string };

export interface SoloLobbyPlayer {
  id: string;
  name: string;
  team_id?: string | null;
}

export interface SoloLobby {
  name: string;
  players: SoloLobbyPlayer[];
}

export interface SoloLobbyRound {
  round: number;
  lobbies: SoloLobby[];
  repeatCount: number;
}

const SEED_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function formatScheduledAt(date: string, time: string) {
  return `${date}T${time}`;
}

export function generateRoundRobinSchedule(teams: TeamEntry[], dates: { date: string; time: string }[] = []): NewMatchRecord[] {
  if (teams.length < 2) throw new Error('Le round robin nécessite au moins 2 équipes.');

  const matches: NewMatchRecord[] = [];
  const dummy = { id: 'dummy', name: 'dummy' };
  
  // Add a dummy team if the number of teams is odd
  const activeTeams = teams.length % 2 === 1 ? [...teams, dummy] : [...teams];
  
  const totalRounds = activeTeams.length - 1;
  const halfSize = activeTeams.length / 2;

  // We fix the first team and rotate the others
  const fixed = activeTeams[0];
  const rotating = activeTeams.slice(1);

  for (let round = 0; round < totalRounds; round += 1) {
    const dateInfo = dates[round] ?? { date: '2026-07-09', time: '18:00:00' };
    
    // Pairings for this round
    for (let i = 0; i < halfSize; i++) {
      const t1 = i === 0 ? fixed : rotating[i - 1];
      const t2 = rotating[rotating.length - 1 - i];
      
      // If one of the teams is the dummy, the other gets a bye
      if (t1.id === 'dummy' || t2.id === 'dummy') continue;

      matches.push({
        format: '4v4',
        round_name: `Tour ${round + 1}`,
        round_order: round + 1,
        match_order: 1, // Will be fixed below
        team1_id: t1.id,
        team2_id: t2.id,
        team1_name: t1.name,
        team2_name: t2.name,
        winner_id: null,
        status: 'scheduled',
        scheduled_at: formatScheduledAt(dateInfo.date, dateInfo.time),
        map: null,
        mode: 'Round Robin',
        admin_notes: null,
        next_match_id: null,
      });
    }

    // Rotate the array
    rotating.unshift(rotating.pop() as TeamEntry);
  }

  // Fix match_order sequentially per round
  let currentRound = -1;
  let currentOrder = 1;
  for (const m of matches) {
    if (m.round_order !== currentRound) {
      currentRound = m.round_order;
      currentOrder = 1;
    }
    m.match_order = currentOrder++;
  }

  return matches;
}

export function generateSoloLobbyRounds(players: SoloLobbyPlayer[], lobbySize = 6, rounds = 4): SoloLobbyRound[] {
  // if (players.length !== 24) throw new Error('La génération des lobbys solo attend exactement 24 joueurs.');
  const pairCounts = new Map<string, number>();
  const roundsOutput: SoloLobbyRound[] = [];
  const numLobbies = Math.ceil(players.length / lobbySize);

  for (let round = 1; round <= rounds; round += 1) {
    let lobbies: SoloLobbyPlayer[][] = Array.from({ length: numLobbies }, () => []);
    const remaining = [...players];
    const order = shuffle(remaining);

    for (const player of order) {
      let bestLobbyIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let lobbyIndex = 0; lobbyIndex < numLobbies; lobbyIndex += 1) {
        const lobby = lobbies[lobbyIndex];
        if (lobby.length >= lobbySize) continue;
        
        let collisionScore = 0;
        for (const member of lobby) {
          // HUGE penalty for being in the same team
          if (player.team_id && member.team_id && player.team_id === member.team_id) {
            collisionScore += 1000;
          }
          // Penalty for having played together before
          collisionScore += (pairCounts.get(pairKey(player.id, member.id)) ?? 0);
        }

        if (collisionScore < bestScore || (collisionScore === bestScore && lobby.length < lobbies[bestLobbyIndex].length)) {
          bestScore = collisionScore;
          bestLobbyIndex = lobbyIndex;
        }
      }
      lobbies[bestLobbyIndex].push(player);
    }

    let repeatCount = 0;
    lobbies.forEach((lobby) => {
      for (let i = 0; i < lobby.length; i += 1) {
        for (let j = i + 1; j < lobby.length; j += 1) {
          const key = pairKey(lobby[i].id, lobby[j].id);
          const current = pairCounts.get(key) ?? 0;
          repeatCount += current;
          pairCounts.set(key, current + 1);
        }
      }
    });

    roundsOutput.push({
      round,
      lobbies: lobbies.map((lobby, index) => ({
        name: `Partie ${round} — Lobby ${index + 1}`,
        players: lobby,
      })),
      repeatCount,
    });
  }

  return roundsOutput;
}

export function generateBracketMatches(qualifiers: TeamEntry[], dates: { date: string; times: string[] }[] = []): NewMatchRecord[] {
  if (qualifiers.length !== 16) throw new Error('Le bracket final attend exactement 16 qualifiés.');

  const seeded = SEED_ORDER.map((seed) => qualifiers[seed - 1]);
  const matchIds = Array.from({ length: 15 }, () => crypto.randomUUID());

  const round16: NewMatchRecord[] = Array.from({ length: 8 }, (_, idx) => ({
    id: matchIds[idx],
    format: '1v1',
    round_name: '1/8 de finale',
    round_order: 1,
    match_order: idx + 1,
    team1_id: seeded[2 * idx]?.id,
    team2_id: seeded[2 * idx + 1]?.id,
    team1_name: seeded[2 * idx]?.name,
    team2_name: seeded[2 * idx + 1]?.name,
    winner_id: undefined,
    status: 'scheduled',
    scheduled_at: formatScheduledAt(dates[0]?.date || '2026-07-12', dates[0]?.times[idx] ?? '18:00:00'),
    map: undefined,
    mode: 'Bracket 1v1',
    admin_notes: undefined,
    next_match_id: matchIds[8 + Math.floor(idx / 2)],
  }));

  const quarter: NewMatchRecord[] = Array.from({ length: 4 }, (_, idx) => ({
    id: matchIds[8 + idx],
    format: '1v1',
    round_name: '1/4 de finale',
    round_order: 2,
    match_order: idx + 1,
    team1_id: undefined,
    team2_id: undefined,
    team1_name: undefined,
    team2_name: undefined,
    winner_id: undefined,
    status: 'scheduled',
    scheduled_at: formatScheduledAt(dates[1]?.date || '2026-07-13', dates[1]?.times[idx] ?? '18:00:00'),
    map: undefined,
    mode: 'Bracket 1v1',
    admin_notes: undefined,
    next_match_id: matchIds[12 + Math.floor(idx / 2)],
  }));

  const semi: NewMatchRecord[] = Array.from({ length: 2 }, (_, idx) => ({
    id: matchIds[12 + idx],
    format: '1v1',
    round_name: '1/2 de finale',
    round_order: 3,
    match_order: idx + 1,
    team1_id: undefined,
    team2_id: undefined,
    team1_name: undefined,
    team2_name: undefined,
    winner_id: undefined,
    status: 'scheduled',
    scheduled_at: formatScheduledAt(dates[2]?.date || '2026-07-14', dates[2]?.times[idx] ?? '19:00:00'),
    map: undefined,
    mode: 'Bracket 1v1',
    admin_notes: undefined,
    next_match_id: matchIds[14],
  }));

  const finalMatch: NewMatchRecord = {
    id: matchIds[14],
    format: '1v1',
    round_name: 'Finale',
    round_order: 4,
    match_order: 1,
    team1_id: undefined,
    team2_id: undefined,
    team1_name: undefined,
    team2_name: undefined,
    winner_id: undefined,
    status: 'scheduled',
    scheduled_at: formatScheduledAt(dates[3]?.date || '2026-07-15', dates[3]?.times?.[0] || '20:00:00'),
    map: undefined,
    mode: 'Bracket 1v1',
    admin_notes: undefined,
    next_match_id: undefined,
  };

  return [...round16, ...quarter, ...semi, finalMatch];
}

export function getBracketChildSlot(match_order: number) {
  return match_order % 2 === 1 ? 'team1' : 'team2';
}

export function getWinnerNameFromMatch(match: Match) {
  if (match.winner_id) {
    if (match.winner_id === match.team1_id) return match.team1_name ?? null;
    if (match.winner_id === match.team2_id) return match.team2_name ?? null;
  }
  if (match.scores && match.scores.length > 0) {
    const t1W = match.scores.filter((s) => s.team1_score > s.team2_score).length;
    const t2W = match.scores.filter((s) => s.team2_score > s.team1_score).length;
    if (t1W > t2W) return match.team1_name ?? null;
    if (t2W > t1W) return match.team2_name ?? null;
  }
  return null;
}

export function getChampionFromMatches(matches: Match[]) {
  const finalMatch = matches
    .filter((m) => m.format === '1v1' && !m.next_match_id)
    .sort((a, b) => b.round_order - a.round_order)[0];
  return finalMatch ? getWinnerNameFromMatch(finalMatch) : null;
}
