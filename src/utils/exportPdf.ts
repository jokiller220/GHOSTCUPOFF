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

    // 1. Fetch Equipes
    const { data: teams } = await supabase.from('teams').select('*').order('points', { ascending: false });
    if (teams && teams.length > 0) {
      doc.setFontSize(14);
      doc.text('Équipes (Classement 4v4)', 14, currentY);
      
      const teamBody = teams.map((t: any, index: number) => [
        index + 1,
        t.name,
        t.tag || '-',
        t.points,
        t.matches_played,
        t.wins,
        t.losses
      ]);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Rang', 'Nom', 'Tag', 'Points', 'Matchs Joués', 'Victoires', 'Défaites']],
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

    if (matches && matches.length > 0) {
      if (currentY > 150) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Matchs 4v4 et 1v1', 14, currentY);
      
      const matchBody = matches.map((m: any) => {
        let dateStr = 'À confirmer';
        if (m.scheduled_at) {
          dateStr = new Date(m.scheduled_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        
        return [
          m.format,
          m.round_name || '-',
          m.team1_name || 'TBD',
          m.team2_name || 'TBD',
          m.status,
          `${m.team1_score ?? '-'} / ${m.team2_score ?? '-'}`,
          dateStr
        ];
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Format', 'Tour', 'Equipe 1', 'Equipe 2', 'Statut', 'Score', 'Date']],
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
