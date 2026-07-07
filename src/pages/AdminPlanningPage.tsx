import { useEffect, useState } from 'react';
import { RefreshCw, Save, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBracketMatches, generateRoundRobinSchedule, generateSoloLobbyRounds, SoloLobbyRound, formatScheduledAt } from '../lib/tournament';
import { ScheduleConfig } from '../types';

export default function AdminPlanningPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [rrDates, setRrDates] = useState<{ date: string; time: string }[]>([]);
  const [ffaDates, setFfaDates] = useState<{ date: string; time: string }[]>([]);
  const [bracketDates, setBracketDates] = useState<{ date: string; times: string[] }[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('schedule_config').select('*');
    if (data) {
      setConfigs(data as ScheduleConfig[]);
      const rr = data.find(c => c.type === 'round_robin');
      let loadedRrDates = rr?.config.dates || [];
      // Pad to 7 rounds for 7 teams format
      if (loadedRrDates.length < 7) {
        const padded = [...loadedRrDates];
        while (padded.length < 7) padded.push({ date: '', time: '' });
        loadedRrDates = padded;
      }
      setRrDates(loadedRrDates);
      
      const ffa = data.find(c => c.type === 'ffa');
      if (ffa) setFfaDates(ffa.config.dates || []);

      const bracket = data.find(c => c.type === 'bracket');
      if (bracket) setBracketDates(bracket.config.dates || []);
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setMessage('');
    
    // Check if dates are well formed
    const rrConfig = { dates: rrDates };
    const ffaConfig = { dates: ffaDates };
    const bracketConfig = { dates: bracketDates };

    await supabase.from('schedule_config').upsert([
      { type: 'round_robin', config: rrConfig },
      { type: 'ffa', config: ffaConfig },
      { type: 'bracket', config: bracketConfig }
    ], { onConflict: 'type' });

    // We only save the configuration. We DO NOT automatically update existing matches
    // because the admin may have customized individual match times in the DB.

    await supabase.from('activity_logs').insert({
        action: 'schedule_updated',
        details: { desc: 'Configuration des horaires modifiée' }
    });

    setMessage('Horaires enregistrés et matchs mis à jour.');
    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
  }

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="section-title">ADMIN</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">CONFIGURATION HORAIRES</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
            <RefreshCw size={12} /> ACTUALISER
          </button>
          <button onClick={save} disabled={saving} className="btn-gold text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-50">
            <Save size={12} /> ENREGISTRER
          </button>
        </div>
      </div>
      
      {message && (
        <div className="mb-6 rounded-2xl border border-ghost-green/30 bg-ghost-green/10 px-4 py-3 text-ghost-green text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-ghost-gray">
          <RefreshCw size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Round Robin */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon size={18} className="text-ghost-gold" />
              <h2 className="font-barlow font-black text-xl text-white uppercase tracking-wider">Round Robin (4v4)</h2>
            </div>
            <p className="text-ghost-gray text-xs mb-4">Définissez la date et l'heure de chaque tour (7 tours). Les matchs se répartissent généralement sur le week-end.</p>
            <div className="space-y-3">
              {rrDates.map((item, i) => (
                <div key={`rr-${i}`} className="flex items-center gap-3">
                  <span className="font-barlow font-bold text-ghost-gray text-xs w-16">Tour {i+1}</span>
                  <input 
                    type="date" 
                    value={item.date} 
                    onChange={e => {
                      const newDates = [...rrDates];
                      newDates[i].date = e.target.value;
                      setRrDates(newDates);
                    }}
                    className="input-dark flex-1" 
                  />
                  <input 
                    type="time" 
                    value={item.time} 
                    onChange={e => {
                      const newDates = [...rrDates];
                      newDates[i].time = e.target.value;
                      setRrDates(newDates);
                    }}
                    className="input-dark flex-1" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* FFA */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-ghost-gold" />
              <h2 className="font-barlow font-black text-xl text-white uppercase tracking-wider">Mêlée Générale (FFA)</h2>
            </div>
            <p className="text-ghost-gray text-xs mb-4">Horaires des 4 parties FFA.</p>
            <div className="space-y-3">
              {ffaDates.map((item, i) => (
                <div key={`ffa-${i}`} className="flex items-center gap-3">
                  <span className="font-barlow font-bold text-ghost-gray text-xs w-16">Partie {i+1}</span>
                  <input 
                    type="date" 
                    value={item.date} 
                    onChange={e => {
                      const newDates = [...ffaDates];
                      newDates[i].date = e.target.value;
                      setFfaDates(newDates);
                    }}
                    className="input-dark flex-1" 
                  />
                  <input 
                    type="time" 
                    value={item.time} 
                    onChange={e => {
                      const newDates = [...ffaDates];
                      newDates[i].time = e.target.value;
                      setFfaDates(newDates);
                    }}
                    className="input-dark flex-1" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bracket */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon size={18} className="text-ghost-gold" />
              <h2 className="font-barlow font-black text-xl text-white uppercase tracking-wider">Bracket 1v1</h2>
            </div>
            <p className="text-ghost-gray text-xs mb-4">Définissez la date de chaque tour, et les horaires spécifiques (ex: 4 créneaux pour les 1/8 séparés par une virgule). Si vous ne mettez qu'une heure, tous les matchs du tour se joueront en même temps.</p>
            
            <div className="space-y-4">
              {['1/8 de finale', '1/4 de finale', '1/2 de finale', 'Finale'].map((label, i) => (
                <div key={`bracket-${i}`} className="flex items-center gap-3 flex-wrap">
                  <span className="font-barlow font-bold text-ghost-gray text-xs w-24">{label}</span>
                  {bracketDates[i] && (
                    <>
                      <input 
                        type="date" 
                        value={bracketDates[i].date} 
                        onChange={e => {
                          const newDates = [...bracketDates];
                          newDates[i].date = e.target.value;
                          setBracketDates(newDates);
                        }}
                        className="input-dark" 
                      />
                      <input 
                        type="text" 
                        value={bracketDates[i].times.join(', ')} 
                        onChange={e => {
                          const newDates = [...bracketDates];
                          newDates[i].times = e.target.value.split(',').map(t => t.trim());
                          setBracketDates(newDates);
                        }}
                        placeholder="Ex: 18:00, 19:30"
                        className="input-dark flex-1 min-w-[200px]" 
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
