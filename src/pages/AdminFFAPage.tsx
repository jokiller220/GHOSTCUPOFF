import { useEffect, useState } from 'react';
import { RefreshCw, Target, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface RankedPlayer {
  profile_id: string;
  rank: number;
}

export default function AdminFFAPage() {
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Array of 6 selections
  const [selections, setSelections] = useState<string[]>(Array(6).fill(''));

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('cod_username');
    setPlayers((data as Profile[]) ?? []);
    setLoading(false);
  }

  async function submitResults() {
    if (selections.some(s => !s)) {
      setMessage('Veuillez sélectionner 6 joueurs.');
      return;
    }
    
    // Check for duplicates
    if (new Set(selections).size !== 6) {
      setMessage('Un joueur ne peut pas être sélectionné plusieurs fois.');
      return;
    }

    setSaving(true);
    setMessage('');
    
    const rankings: RankedPlayer[] = selections.map((profile_id, index) => ({
      profile_id,
      rank: index + 1
    }));

    const { error } = await supabase.rpc('submit_ffa_lobby_results', {
      rankings: rankings
    });

    if (error) {
      setMessage('Erreur: ' + error.message);
    } else {
      await supabase.from('activity_logs').insert({
        action: 'ffa_results_submitted',
        details: { players: selections }
      });
      setMessage('Résultats soumis avec succès ! Les points ont été calculés.');
      setSelections(Array(6).fill(''));
    }
    setSaving(false);
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">ADMIN</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">RÉSULTATS MÊLÉE GÉNÉRALE (FFA)</h1>
        </div>
        <button onClick={loadPlayers} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
          <RefreshCw size={12} /> ACTUALISER
        </button>
      </div>

      <div className="max-w-2xl">
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="text-ghost-gold" size={24} />
            <div>
              <h2 className="font-barlow font-black text-white text-xl uppercase tracking-wider">Saisir les résultats d'un lobby</h2>
              <p className="text-ghost-gray text-xs mt-1">Sélectionnez les 6 joueurs du lobby dans l'ordre de leur classement final. Les points seront automatiquement ajoutés : 1er (5 pts), 2e (3 pts), 3e (2 pts), 4e (1 pt), autres (0 pt).</p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              message.includes('Erreur') || message.includes('Veuillez') || message.includes('plusieurs fois')
                ? 'border-ghost-red/30 bg-ghost-red/10 text-ghost-red'
                : 'border-ghost-green/30 bg-ghost-green/10 text-ghost-green'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            {selections.map((selectedId, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-ghost-black/40 p-3 rounded-xl border border-ghost-border">
                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-ghost-dark border border-ghost-gold/30 shrink-0">
                  <span className="font-barlow font-black text-ghost-gold text-sm">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <select
                    className="input-dark w-full text-sm"
                    value={selectedId}
                    onChange={(e) => {
                      const newS = [...selections];
                      newS[idx] = e.target.value;
                      setSelections(newS);
                    }}
                    disabled={loading || saving}
                  >
                    <option value="">-- Sélectionner un joueur --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.cod_username} {p.real_name ? `(${p.real_name})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="w-16 text-right shrink-0">
                  <span className="font-barlow font-bold text-ghost-gray text-xs">
                    {idx === 0 ? '+5 pts' : idx === 1 ? '+3 pts' : idx === 2 ? '+2 pts' : idx === 3 ? '+1 pt' : '+0 pt'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={submitResults}
              disabled={saving || loading || selections.some(s => !s)}
              className="btn-gold flex items-center gap-2 py-3 px-8 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              VALIDER LE CLASSEMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
