import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

export async function exportTournamentDataToPDF() {
  try {
    const doc = new jsPDF('landscape');
    
    // Titre global
    doc.setFontSize(22);
    doc.text('GHOST CUP 2026 - Données du Tournoi', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 28);
    
    let currentY = 40;

    // 1. Fetch Equipes and players
    const { data: teams } = await supabase.from('teams').select('*, profiles!teams_captain_id_fkey(cod_username)').order('points', { ascending: false });
    const { data: teamPlayers } = await supabase.from('tournament_entries').select('team_id, profiles(cod_username)').not('team_id', 'is', null);
    
    if (teams && teams.length > 0) {
      doc.setFontSize(14);
      doc.text('Équipes (Classement 4v4)', 14, currentY);
      
      const teamBody = teams.map((t: any, index: number) => {
        const playersInTeam = teamPlayers?.filter(p => p.team_id === t.id).map((p: any) => p.profiles?.cod_username) || [];
        const playersStr = playersInTeam.join(', ');
        const captainName = t.profiles?.cod_username || '-';

        return [
          index + 1,
          t.name,
          captainName,
          playersStr,
          t.points,
          `${t.wins} / ${t.losses}`
        ];
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Rang', 'Nom (Tag)', 'Capitaine', 'Joueurs', 'Points', 'V / D']],
        body: teamBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 2. Fetch Joueurs (Tournoi Solo)
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('*, profiles(cod_username, discord_username)')
      .eq('status', 'approved')
      .order('solo_points', { ascending: false });

    if (entries && entries.length > 0) {
      if (currentY > 150) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Joueurs (Mêlée Générale / Bracket)', 14, currentY);
      
      const playerBody = entries.map((e: any, index: number) => [
        index + 1,
        e.profiles?.cod_username || 'Inconnu',
        e.profiles?.discord_username || '-',
        e.solo_points || 0
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Rang', 'Pseudo COD', 'Discord', 'Points FFA']],
        body: playerBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // 3. Fetch Matchs
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true });

    const { data: ffaData } = await supabase.from('schedule_config').select('config').eq('type', 'ffa').single();
    
    let allMatches: any[] = [];
    if (matches) allMatches = [...matches];

    if (ffaData && ffaData.config && ffaData.config.lobbies) {
      ffaData.config.lobbies.forEach((r: any) => {
        r.lobbies.forEach((l: any) => {
          allMatches.push({
            format: 'ffa',
            round_name: `Partie ${r.round}`,
            team1_name: `Lobby: ${l.name}`,
            team2_name: `${l.players?.length || 0} Joueurs`,
            status: l.status || 'scheduled',
            team1_score: null,
            team2_score: null,
            scheduled_at: l.scheduled_at
          });
        });
      });
    }

    // Sort all by date
    allMatches.sort((a, b) => {
      const timeA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Infinity;
      const timeB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Infinity;
      return timeA - timeB;
    });

    if (allMatches.length > 0) {
      if (currentY > 150) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Historique des Matchs (4v4, 1v1, FFA)', 14, currentY);
      
      const matchBody = allMatches.map((m: any) => {
        let dateStr = 'À confirmer';
        if (m.scheduled_at) {
          dateStr = new Date(m.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        
        let scoreStr = '-';
        if (m.format === 'ffa') {
           scoreStr = '-'; // FFA no score
        } else {
           scoreStr = `${m.team1_score ?? '-'} / ${m.team2_score ?? '-'}`;
        }

        return [
          m.format.toUpperCase(),
          m.round_name || '-',
          m.team1_name || 'TBD',
          m.team2_name || 'TBD',
          m.status,
          scoreStr,
          dateStr
        ];
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Format', 'Tour', 'Equipe 1 / Lobby', 'Equipe 2 / Infos', 'Statut', 'Score', 'Date']],
        body: matchBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] }
      });
    }

    doc.save('ghost_cup_donnees.pdf');
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return false;
  }
}
