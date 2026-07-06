import { useState, FormEvent } from 'react';
import { Megaphone, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminAnnoncesPage() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'match' | 'info' | 'warning'>('announcement');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function sendAnnouncement(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');

    // Get all player IDs
    const { data: players } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'player');

    if (!players || players.length === 0) {
      setError('Aucun joueur inscrit à notifier.');
      setSending(false);
      return;
    }

    // Insert public announcement for the website
    const { error: announcementError } = await supabase.from('public_announcements').insert([{
      title,
      message,
      type,
    }]);
    if (announcementError) { setError(announcementError.message); setSending(false); return; }

    // Insert notification for each player
    const notifications = players.map(p => ({
      profile_id: p.id,
      title,
      message,
      type,
    }));

    const { error: insertError } = await supabase.from('notifications').insert(notifications);
    if (insertError) { setError(insertError.message); setSending(false); return; }

    // Log activity
    await supabase.from('activity_logs').insert({
      admin_id: profile?.id,
      action: 'announcement',
      details: { title, recipients: players.length },
    });

    setSuccess(`Annonce envoyée à ${players.length} joueur(s).`);
    setTitle('');
    setMessage('');
    setSending(false);
    setTimeout(() => setSuccess(''), 5000);
  }

  return (
    <div className="animate-slide-up max-w-2xl">
      <div className="mb-8">
        <p className="section-title">ADMIN</p>
        <h1 className="font-barlow font-black text-3xl text-white uppercase">ANNONCES</h1>
        <p className="text-ghost-gray text-sm mt-2">Envoyez une notification à tous les joueurs inscrits.</p>
      </div>

      <div className="card p-8">
        <div className="flex items-center gap-3 mb-6 p-4 bg-ghost-gold/5 border border-ghost-gold/20">
          <Megaphone size={20} className="text-ghost-gold" />
          <p className="text-ghost-gold font-barlow font-bold text-sm uppercase tracking-wider">
            Diffusion groupée
          </p>
        </div>

        <form onSubmit={sendAnnouncement} className="space-y-5">
          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="input-dark"
            >
              <option value="announcement">Annonce générale</option>
              <option value="match">Notification de match</option>
              <option value="info">Information</option>
              <option value="warning">Alerte</option>
            </select>
          </div>

          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Titre</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'annonce"
              className="input-dark"
              required
            />
          </div>

          <div>
            <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Contenu de l'annonce..."
              rows={5}
              className="input-dark resize-none"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-4 py-3">
              <AlertCircle size={14} className="text-ghost-red shrink-0" />
              <span className="text-ghost-red text-xs">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-ghost-green/10 border border-ghost-green/30 px-4 py-3">
              <CheckCircle size={14} className="text-ghost-green shrink-0" />
              <span className="text-ghost-green text-xs">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="btn-gold w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={14} />
            {sending ? 'ENVOI EN COURS...' : 'ENVOYER À TOUS LES JOUEURS'}
          </button>
        </form>
      </div>
    </div>
  );
}
