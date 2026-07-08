import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TournamentSettings } from '../types';

interface AdminSettingsModalProps {
  onClose: () => void;
}

export function AdminSettingsModal({ onClose }: AdminSettingsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  
  // Form states
  const [startDate, setStartDate] = useState('');
  const [finalDate, setFinalDate] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(28);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase.from('tournament_settings').select('*').single();
      if (!error && data) {
        setSettings(data);
        
        // Format ISO dates to datetime-local format (YYYY-MM-DDThh:mm)
        const formatForInput = (isoString: string) => {
          const date = new Date(isoString);
          return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        };
        
        setStartDate(formatForInput(data.start_date));
        setFinalDate(formatForInput(data.final_date));
        setMaxPlayers(data.max_players);
        setMaintenanceMode(data.maintenance_mode ?? false);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const startIso = new Date(startDate).toISOString();
      const finalIso = new Date(finalDate).toISOString();

      const { error: err } = await supabase.from('tournament_settings').update({
        start_date: startIso,
        final_date: finalIso,
        max_players: maxPlayers,
        maintenance_mode: maintenanceMode
      }).eq('id', 1);

      if (err) throw err;
      
      setSuccess('Paramètres mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  const handleReset = async () => {
    if (resetConfirmText !== 'CONFIRMER') return;
    
    setResetting(true);
    setError('');
    
    try {
      // 1. Delete dependent tables first
      await supabase.from('score_proofs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('match_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 2. Delete matches and entries
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('tournament_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Note: We intentionally do NOT delete teams and team_members so players don't have to recreate them.
      
      // 3. Reset schedule config
      await supabase.from('schedule_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Log action
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('activity_logs').insert({
          admin_id: user.user.id,
          action: 'RÉINITIALISATION',
          details: { message: "Toutes les données du tournoi (équipes, matchs, brackets, scores) ont été effacées pour une nouvelle saison." }
        });
      }
      
      setSuccess('Tournoi réinitialisé avec succès !');
      setShowResetConfirm(false);
      setResetConfirmText('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  };

  const handleSyncSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { error: ffaError } = await supabase.from('schedule_config').upsert({
        type: 'ffa',
        config: { dates: [{ date: "2026-07-08", time: "21:00" }, { date: "2026-07-08", time: "21:30" }, { date: "2026-07-08", time: "22:00" }, { date: "2026-07-08", time: "22:30" }] }
      }, { onConflict: 'type' });
      
      const { error: rrError } = await supabase.from('schedule_config').upsert({
        type: 'round_robin',
        config: { dates: [{ date: "2026-07-09", time: "21:00" }, { date: "2026-07-09", time: "21:45" }, { date: "2026-07-09", time: "22:30" }, { date: "2026-07-10", time: "21:00" }, { date: "2026-07-10", time: "21:45" }, { date: "2026-07-10", time: "22:30" }, { date: "2026-07-11", time: "21:00" }] }
      }, { onConflict: 'type' });
      
      const { error: bracketError } = await supabase.from('schedule_config').upsert({
        type: 'bracket',
        config: { dates: [{ date: "2026-07-12", times: ["18:00", "19:30", "21:00", "22:30"] }, { date: "2026-07-13", times: ["18:00", "19:30", "21:00", "22:30"] }, { date: "2026-07-14", times: ["18:00", "19:30"] }, { date: "2026-07-15", times: ["20:00"] }] }
      }, { onConflict: 'type' });

      if (ffaError || rrError || bracketError) throw new Error('Erreur lors de la mise à jour des dates');
      
      setSuccess('Calendrier officiel synchronisé avec succès !');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la synchronisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-ghost-border pb-4">
          <h2 className="font-barlow font-black text-2xl text-white uppercase">PARAMÈTRES DU TOURNOI</h2>
          <button onClick={onClose} className="text-ghost-gray hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-ghost-gray py-8 font-barlow uppercase tracking-widest text-sm">
            Chargement...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="bg-ghost-red/10 border border-ghost-red/30 text-ghost-red px-4 py-3 rounded text-xs font-barlow">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-ghost-green/10 border border-ghost-green/30 text-ghost-green px-4 py-3 rounded text-xs font-barlow">
                {success}
              </div>
            )}

            <div>
              <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                Date et Heure de Lancement (Compte à rebours)
              </label>
              <input 
                type="datetime-local" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>

            <div>
              <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                Date et Heure de la Finale
              </label>
              <input 
                type="datetime-local" 
                value={finalDate}
                onChange={e => setFinalDate(e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>

            <div>
              <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">
                Limite de Joueurs
              </label>
              <input 
                type="number" 
                min="4"
                max="100"
                value={maxPlayers}
                onChange={e => setMaxPlayers(parseInt(e.target.value) || 28)}
                className="input-dark w-full"
                required
              />
            </div>

            <div className="flex items-center justify-between bg-black/40 p-4 border border-ghost-border">
              <div>
                <p className="font-barlow font-bold text-white uppercase tracking-wider text-sm">Mode Maintenance</p>
                <p className="text-ghost-gray text-[10px] font-barlow uppercase tracking-widest mt-1">Bloque l'accès aux joueurs</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                <div className="w-11 h-6 bg-ghost-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ghost-gold"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-ghost-border">
              <button 
                type="submit"
                disabled={saving}
                className="btn-gold w-full text-xs py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'ENREGISTREMENT...' : 'ENREGISTRER LES MODIFICATIONS'}
              </button>
            </div>
          </form>
        )}
        


        {/* Sync Schedule */}
        {!loading && (
          <div className="mt-8 pt-6 border-t border-ghost-border">
            <h3 className="font-barlow font-bold text-ghost-gold text-sm uppercase tracking-wider mb-2">Synchronisation</h3>
            <p className="text-xs text-ghost-gray mb-4">
              Ajuste automatiquement les dates internes du système (Solo, Équipes, Brackets) pour correspondre au calendrier officiel du 08 au 15 Juillet.
            </p>
            <button 
              onClick={handleSyncSchedule}
              className="w-full bg-ghost-gold/10 text-ghost-gold border border-ghost-gold/30 hover:bg-ghost-gold hover:text-black py-3 rounded text-xs font-bold transition-colors uppercase"
            >
              SYNCHRONISER LE CALENDRIER OFFICIEL
            </button>
          </div>
        )}
        
        {/* Danger Zone */}
        {!loading && (
          <div className="mt-8 pt-6 border-t border-red-900/30">
            <h3 className="font-barlow font-bold text-red-500 text-sm uppercase tracking-wider mb-2">Zone de Danger</h3>
            <p className="text-xs text-ghost-gray mb-4">
              La réinitialisation effacera de manière irréversible toutes les équipes, les matchs, et les scores de la saison. Seuls les comptes utilisateurs seront conservés.
            </p>
            
            {!showResetConfirm ? (
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-900/40 py-3 rounded text-xs font-bold transition-colors"
              >
                RÉINITIALISER LE TOURNOI
              </button>
            ) : (
              <div className="bg-red-950/30 border border-red-900 rounded p-4">
                <p className="text-xs font-bold text-red-400 mb-2">Êtes-vous absolument sûr ?</p>
                <p className="text-xs text-red-300/70 mb-4">Tapez "CONFIRMER" ci-dessous pour valider la suppression définitive.</p>
                <input
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="Tapez CONFIRMER"
                  className="input-ghost w-full mb-3 border-red-900/50 focus:border-red-500"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetConfirmText('');
                    }}
                    className="flex-1 btn-outline py-2 text-xs"
                    disabled={resetting}
                  >
                    ANNULER
                  </button>
                  <button 
                    onClick={handleReset}
                    disabled={resetConfirmText !== 'CONFIRMER' || resetting}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 font-bold py-2 rounded text-xs transition-colors"
                  >
                    {resetting ? 'SUPPRESSION...' : 'CONFIRMER'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
