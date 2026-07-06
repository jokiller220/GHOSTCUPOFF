import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Notification, NotifType } from '../types';

const TYPE_COLORS: Record<NotifType, string> = {
  info: 'text-ghost-gray border-ghost-border',
  match: 'text-ghost-gold border-ghost-gold/30',
  result: 'text-ghost-green border-ghost-green/30',
  warning: 'text-ghost-red border-ghost-red/30',
  announcement: 'text-white border-ghost-border',
};

const TYPE_LABELS: Record<NotifType, string> = {
  info: 'INFO',
  match: 'MATCH',
  result: 'RÉSULTAT',
  warning: 'ALERTE',
  announcement: 'ANNONCE',
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile]);

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile!.id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('profile_id', profile!.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <div className="animate-slide-up max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-title">GHOST CUP</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">NOTIFICATIONS</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={markAllRead} className="btn-outline text-xs py-2 flex items-center gap-1.5">
            <Check size={12} /> TOUT MARQUER LU
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-ghost-gray text-sm">Chargement...</div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={32} className="mx-auto mb-3 text-ghost-gray/30" />
          <p className="font-barlow text-ghost-gray text-sm uppercase tracking-wider">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card p-5 cursor-pointer transition-all duration-200 ${!n.read ? 'border-ghost-gold/20 bg-ghost-gold/[0.03]' : ''}`}
              onClick={() => markRead(n.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-ghost-gold' : 'bg-ghost-border'}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`status-badge border px-2 py-0.5 text-[9px] ${TYPE_COLORS[n.type]}`}>
                        {TYPE_LABELS[n.type]}
                      </span>
                      <span className="font-barlow font-bold text-white text-sm">{n.title}</span>
                    </div>
                    <span className="text-ghost-gray text-[10px]">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-ghost-gray text-xs leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
