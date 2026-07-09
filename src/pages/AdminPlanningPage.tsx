import { useEffect, useState } from 'react';
import { RefreshCw, Save, Calendar as CalendarIcon, Clock, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBracketMatches, generateRoundRobinSchedule, generateSoloLobbyRounds, SoloLobbyRound, formatScheduledAt } from '../lib/tournament';
import { ScheduleConfig } from '../types';

export default function AdminPlanningPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  const [rrDates, setRrDates] = useState<{ date: string; time: string }[]>([]);
  const [bracketDates, setBracketDates] = useState<{ date: string; times: string[] }[]>([]);

  function getHelperText(date: string, time: string) {
    if (!date || !time) return null;
    const timeStr = time.length === 5 ? `${time}:00` : time;
    const d = new Date(`${date}T${timeStr}Z`);
    if (isNaN(d.getTime())) return null;
    const frTime = d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    return `(${frTime} FR)`;
  }

  function getBracketHelperText(date: string, times: string[]) {
    if (!date || !times || times.length === 0) return null;
    const frTimes = times.map(time => {
      const t = time.trim();
      if (!t) return '';
      const timeStr = t.length === 5 ? `${t}:00` : t;
      const d = new Date(`${date}T${timeStr}Z`);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    }).filter(Boolean);
    if (frTimes.length === 0) return null;
    return `(${frTimes.join(', ')} FR)`;
  }

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
      
      const bracket = data.find(c => c.type === 'bracket');
      let loadedBracketDates = bracket?.config?.dates || [];
      if (loadedBracketDates.length < 4) {
        const padded = [...loadedBracketDates];
        while (padded.length < 4) padded.push({ date: '', times: [] });
        loadedBracketDates = padded;
      }
      setBracketDates(loadedBracketDates);
    }
    setLoading(false);
    setIsEditing(false);
  }

  async function save() {
    setSaving(true);
    setMessage('');
    
    // Check if dates are well formed
    const existingRr = configs.find(c => c.type === 'round_robin')?.config || {};
    const existingBracket = configs.find(c => c.type === 'bracket')?.config || {};

    const rrConfig = { ...existingRr, dates: rrDates };
    const bracketConfig = { ...existingBracket, dates: bracketDates };

    await supabase.from('schedule_config').upsert([
      { type: 'round_robin', config: rrConfig },
      { type: 'bracket', config: bracketConfig }
    ], { onConflict: 'type' });

    // Update RR matches
    for (let i = 0; i < rrDates.length; i++) {
        const d = rrDates[i];
        if (!d.date || !d.time) continue;
        await supabase.from('matches')
            .update({ scheduled_at: formatScheduledAt(d.date, d.time) })
            .eq('format', '4v4')
            .eq('round_order', i + 1);
    }
    
    // Update Bracket matches
    if (bracketDates[0]) {
        for (let i = 0; i < 8; i++) {
            const time = bracketDates[0].times[i] || bracketDates[0].times[0] || '18:00';
            await supabase.from('matches')
                .update({ scheduled_at: formatScheduledAt(bracketDates[0].date, time) })
                .eq('format', '1v1')
                .eq('round_order', 1)
                .eq('match_order', i + 1);
        }
    }
    if (bracketDates[1]) {
        for (let i = 0; i < 4; i++) {
            const time = bracketDates[1].times[i] || bracketDates[1].times[0] || '18:00';
            await supabase.from('matches')
                .update({ scheduled_at: formatScheduledAt(bracketDates[1].date, time) })
                .eq('format', '1v1')
                .eq('round_order', 2)
                .eq('match_order', i + 1);
        }
    }
    if (bracketDates[2]) {
        for (let i = 0; i < 2; i++) {
            const time = bracketDates[2].times[i] || bracketDates[2].times[0] || '18:00';
            await supabase.from('matches')
                .update({ scheduled_at: formatScheduledAt(bracketDates[2].date, time) })
                .eq('format', '1v1')
                .eq('round_order', 3)
                .eq('match_order', i + 1);
        }
    }
    if (bracketDates[3]) {
        const time = bracketDates[3].times[0] || '18:00';
        await supabase.from('matches')
            .update({ scheduled_at: formatScheduledAt(bracketDates[3].date, time) })
            .eq('format', '1v1')
            .eq('round_order', 4);
    }

    await supabase.from('activity_logs').insert({
        action: 'schedule_updated',
        details: { desc: 'Configuration des horaires modifiée' }
    });

    setMessage('Horaires enregistrés et matchs mis à jour.');
    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
    setIsEditing(false);
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
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn-outline text-xs py-2 px-4 flex items-center gap-2">
              <Edit2 size={12} /> MODIFIER
            </button>
          ) : (
            <button onClick={save} disabled={saving} className="btn-gold text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-50">
              <Save size={12} /> ENREGISTRER
            </button>
          )}
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
                    disabled={!isEditing}
                    className="input-dark flex-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                  <div className="flex-1 flex flex-col gap-1">
                    <input 
                      type="time" 
                      value={item.time} 
                      onChange={e => {
                        const newDates = [...rrDates];
                        newDates[i].time = e.target.value;
                        setRrDates(newDates);
                      }}
                      disabled={!isEditing}
                      className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                    {getHelperText(item.date, item.time) && (
                      <span className="text-[10px] text-ghost-gray font-barlow italic">
                        {getHelperText(item.date, item.time)}
                      </span>
                    )}
                  </div>
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
                    <input 
                      type="date" 
                      value={bracketDates[i]?.date || ''} 
                      onChange={e => {
                        const newDates = [...bracketDates];
                        if (!newDates[i]) newDates[i] = { date: '', times: [] };
                        newDates[i].date = e.target.value;
                        setBracketDates(newDates);
                      }}
                      disabled={!isEditing}
                      className="input-dark disabled:opacity-50 disabled:cursor-not-allowed" 
                    />
                    <div className="flex-1 flex flex-col gap-1">
                      <input 
                        type="text" 
                        value={bracketDates[i]?.times?.join(', ') || ''} 
                        onChange={e => {
                          const newDates = [...bracketDates];
                          if (!newDates[i]) newDates[i] = { date: '', times: [] };
                          newDates[i].times = e.target.value.split(',').map(t => t.trim());
                          setBracketDates(newDates);
                        }}
                        placeholder="Ex: 18:00, 19:30"
                        disabled={!isEditing}
                        className="input-dark w-full disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]" 
                      />
                      {bracketDates[i] && getBracketHelperText(bracketDates[i].date, bracketDates[i].times) && (
                        <span className="text-[10px] text-ghost-gray font-barlow italic">
                          {getBracketHelperText(bracketDates[i].date, bracketDates[i].times)}
                        </span>
                      )}
                    </div>
                  </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
