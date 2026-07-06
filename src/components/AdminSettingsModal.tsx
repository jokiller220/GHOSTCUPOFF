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
      </div>
    </div>
  );
}
