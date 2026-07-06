import { useEffect, useState, FormEvent } from 'react';
import { Users, Crown, UserPlus, LogOut, Copy, Check, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Team, TeamMember, Format, Page } from '../types';

interface MonEquipePageProps {
  onNavigate: (page: Page) => void;
}

function MemberRow({ member, isCaptain, isMe, onKick }: {
  member: TeamMember;
  isCaptain: boolean;
  isMe: boolean;
  onKick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-ghost-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ghost-gold/10 border border-ghost-gold/20 flex items-center justify-center shrink-0">
          <span className="font-barlow font-black text-ghost-gold text-xs">
            {member.profile?.cod_username?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-barlow font-bold text-white text-sm">{member.profile?.cod_username ?? 'Joueur'}</span>
            {isCaptain && <Crown size={10} className="text-ghost-gold" />}
            {isMe && <span className="text-ghost-gold text-[9px] font-barlow uppercase tracking-wider">(vous)</span>}
          </div>
          <span className="text-ghost-gray text-[10px]">{member.profile?.real_name}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-ghost-green' : 'bg-ghost-gold'}`} />
        <span className="text-ghost-gray text-[10px] font-barlow uppercase">
          {isCaptain ? 'Capitaine' : member.status === 'active' ? 'Membre' : 'En attente'}
        </span>
        {onKick && !isMe && !isCaptain && (
          <button onClick={onKick} className="text-ghost-red hover:text-red-400 text-[10px] font-barlow uppercase ml-2">
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}

export default function MonEquipePage({ onNavigate: _onNavigate }: MonEquipePageProps) {
  const { profile } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Create team form
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamFormat, setTeamFormat] = useState<Format>('4v4');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Join team form
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    loadTeam();
  }, [profile]);

  async function loadTeam() {
    setLoading(true);
    // Check if player is in a team
    const { data: memberData } = await supabase
      .from('team_members')
      .select('*, team:teams(*)')
      .eq('profile_id', profile!.id)
      .eq('status', 'active')
      .maybeSingle();

    if (memberData?.team) {
      const t = memberData.team as Team;
      setTeam(t);
      // Load all team members
      const { data: allMembers } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', t.id)
        .neq('status', 'kicked');
      setMembers((allMembers as TeamMember[]) ?? []);
    } else {
      setTeam(null);
      setMembers([]);
    }
    setLoading(false);
  }

  async function createTeam(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ name: teamName, captain_id: profile!.id, format: teamFormat })
      .select()
      .maybeSingle();

    if (error) { setCreateError(error.message); setCreateLoading(false); return; }

    // Add captain as active member
    await supabase.from('team_members').insert({
      team_id: newTeam!.id,
      profile_id: profile!.id,
      status: 'active',
    });

    setCreateLoading(false);
    setShowCreate(false);
    loadTeam();
  }

  async function joinTeam(e: FormEvent) {
    e.preventDefault();
    setJoinError('');
    setJoinLoading(true);
    const { data: foundTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .maybeSingle();

    if (!foundTeam) { setJoinError('Code invalide ou équipe introuvable.'); setJoinLoading(false); return; }

    const { data: currentMembers } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', foundTeam.id)
      .neq('status', 'kicked');
      
    const maxMembers = foundTeam.format === '4v4' ? 4 : 1;
    if (currentMembers && currentMembers.length >= maxMembers) {
      setJoinError(`Cette équipe est déjà complète (${maxMembers} joueurs max).`);
      setJoinLoading(false);
      return;
    }

    const { error } = await supabase.from('team_members').insert({
      team_id: foundTeam.id,
      profile_id: profile!.id,
      status: 'active',
    });

    if (error) { setJoinError(error.message); setJoinLoading(false); return; }
    setJoinLoading(false);
    setShowJoin(false);
    loadTeam();
  }

  async function leaveTeam() {
    if (!team || !profile) return;
    await supabase
      .from('team_members')
      .update({ status: 'kicked' })
      .eq('team_id', team.id)
      .eq('profile_id', profile.id);
    loadTeam();
  }

  async function kickMember(memberId: string) {
    await supabase
      .from('team_members')
      .update({ status: 'kicked' })
      .eq('id', memberId);
    loadTeam();
  }

  function copyInviteCode() {
    if (!team?.invite_code) return;
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-ghost-gray text-sm font-barlow uppercase tracking-wider">Chargement...</div>;
  }

  if (!team) {
    return (
      <div className="animate-slide-up max-w-2xl">
        <div className="mb-8">
          <p className="section-title">GHOST CUP</p>
          <h1 className="font-barlow font-black text-3xl text-white uppercase">MON ÉQUIPE</h1>
        </div>

        <div className="card p-8 text-center mb-6">
          <Users size={40} className="mx-auto mb-4 text-ghost-gray/30" />
          <p className="font-barlow font-black text-white text-lg uppercase mb-2">Aucune équipe</p>
          <p className="text-ghost-gray text-sm mb-6">Créez une équipe ou rejoignez-en une avec un code d'invitation.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setShowCreate(true); setShowJoin(false); }} className="btn-gold text-xs py-2">
              <Plus size={12} className="mr-1.5 inline" /> CRÉER UNE ÉQUIPE
            </button>
            <button onClick={() => { setShowJoin(true); setShowCreate(false); }} className="btn-outline text-xs py-2">
              REJOINDRE
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="card p-6 animate-fade-in">
            <p className="section-title mb-4">CRÉER UNE ÉQUIPE</p>
            <form onSubmit={createTeam} className="space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Nom de l'équipe</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ex: Wild Squad" className="input-dark" required />
              </div>
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Format</label>
                <select value={teamFormat} onChange={e => setTeamFormat(e.target.value as Format)} className="input-dark">
                  <option value="4v4">4 VS 4</option>
                  <option value="1v1">1 VS 1</option>
                </select>
              </div>
              {createError && (
                <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-3 py-2">
                  <AlertCircle size={12} className="text-ghost-red" />
                  <span className="text-ghost-red text-xs">{createError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={createLoading} className="btn-gold text-xs py-2 disabled:opacity-50">
                  {createLoading ? 'CRÉATION...' : 'CRÉER'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-outline text-xs py-2">ANNULER</button>
              </div>
            </form>
          </div>
        )}

        {showJoin && (
          <div className="card p-6 animate-fade-in">
            <p className="section-title mb-4">REJOINDRE UNE ÉQUIPE</p>
            <form onSubmit={joinTeam} className="space-y-4">
              <div>
                <label className="block text-ghost-gray text-xs font-barlow uppercase tracking-widest mb-2">Code d'invitation</label>
                <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Ex: a1b2c3d4" className="input-dark" required />
              </div>
              {joinError && (
                <div className="flex items-center gap-2 bg-ghost-red/10 border border-ghost-red/30 px-3 py-2">
                  <AlertCircle size={12} className="text-ghost-red" />
                  <span className="text-ghost-red text-xs">{joinError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={joinLoading} className="btn-gold text-xs py-2 disabled:opacity-50">
                  {joinLoading ? 'REJOINDRE...' : 'REJOINDRE'}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="btn-outline text-xs py-2">ANNULER</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  const isCaptain = team.captain_id === profile?.id;

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <p className="section-title">GHOST CUP</p>
        <h1 className="font-barlow font-black text-3xl text-white uppercase">MON ÉQUIPE</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team card */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            {/* Team header */}
            <div className="bg-ghost-gold/5 border-b border-ghost-border p-6 flex items-center gap-4">
              <div className="w-16 h-16 bg-ghost-dark border border-ghost-gold/30 flex items-center justify-center">
                <span className="font-barlow font-black text-ghost-gold text-2xl">{team.name[0]}</span>
              </div>
              <div>
                <p className="font-barlow font-black text-2xl text-white uppercase">{team.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-barlow text-ghost-gray text-xs uppercase tracking-wider">
                    {team.format.toUpperCase()}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-ghost-border" />
                  <span className={`text-xs font-barlow font-bold uppercase ${
                    team.status === 'active' ? 'text-ghost-green' :
                    team.status === 'eliminated' ? 'text-ghost-red' :
                    'text-ghost-gold'
                  }`}>
                    {team.status === 'forming' ? 'En formation' :
                     team.status === 'registered' ? 'Inscrit' :
                     team.status === 'active' ? 'En compétition' :
                     team.status === 'eliminated' ? 'Éliminé' : 'Champion'}
                  </span>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="px-4 py-2 bg-ghost-black/30 border-b border-ghost-border">
                <p className="font-barlow font-bold text-ghost-gray text-[10px] uppercase tracking-widest">
                  Membres ({members.length}/4)
                </p>
              </div>
              {members.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isCaptain={m.profile_id === team.captain_id}
                  isMe={m.profile_id === profile?.id}
                  onKick={isCaptain ? () => kickMember(m.id) : undefined}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="border-t border-ghost-border p-4 flex gap-3 flex-wrap">
              <button onClick={leaveTeam} className="btn-red text-xs py-2 flex items-center gap-1.5">
                <LogOut size={12} /> QUITTER L'ÉQUIPE
              </button>
              {isCaptain && (
                <button
                  onClick={() => {
                    const username = prompt('Pseudo du joueur à inviter :');
                    if (username) alert(`Envoyez ce code au joueur : ${team.invite_code}`);
                  }}
                  className="btn-gold text-xs py-2 flex items-center gap-1.5"
                >
                  <UserPlus size={12} /> INVITER UN JOUEUR
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Invite code */}
          <div className="card p-5">
            <p className="section-title mb-3">CODE D'INVITATION</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-ghost-black border border-ghost-border px-3 py-2 font-barlow font-bold text-ghost-gold text-sm uppercase tracking-widest">
                {team.invite_code}
              </div>
              <button
                onClick={copyInviteCode}
                className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
              >
                {copied ? <Check size={12} className="text-ghost-green" /> : <Copy size={12} />}
                {copied ? 'COPIÉ' : 'COPIER'}
              </button>
            </div>
            <p className="text-ghost-gray text-xs mt-2">Partagez ce code à vos coéquipiers pour les inviter.</p>
          </div>

          {/* Next match */}
          <div className="card p-5">
            <p className="section-title mb-3">PROCHAIN MATCH</p>
            <p className="text-ghost-gray text-xs font-barlow uppercase tracking-wider">Aucun match programmé</p>
          </div>
        </div>
      </div>
    </div>
  );
}
