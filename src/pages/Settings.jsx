import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Plus, Pencil, Archive, ArchiveRestore, Users, Tags, UserPlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Layout from '@/components/Layout';
import BrandHeader from '@/components/BrandHeader';
import { useSpecies } from '@/lib/species';
import { useUserRole } from '@/lib/useUserRole';
import RecycleBin from '@/components/RecycleBin';
import DataSafety from '@/components/DataSafety';

export default function Settings() {
  const { isAdmin } = useUserRole();
  const [tab, setTab] = useState('species');

  return (
    <Layout>
      <BrandHeader subtitle="Settings" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-stone-900 text-lg">Settings</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTab('species')} className={`py-2 rounded-md text-xs font-medium border ${tab === 'species' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Species</button>
          <button onClick={() => setTab('users')} className={`py-2 rounded-md text-xs font-medium border ${tab === 'users' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Users</button>
          {isAdmin && <button onClick={() => setTab('recycle')} className={`py-2 rounded-md text-xs font-medium border ${tab === 'recycle' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Recycle Bin</button>}
          {isAdmin && <button onClick={() => setTab('safety')} className={`py-2 rounded-md text-xs font-medium border ${tab === 'safety' ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>Data Safety</button>}
        </div>

        {tab === 'species' && <SpeciesManager isAdmin={isAdmin} />}
        {tab === 'users' && <UserManagement isAdmin={isAdmin} />}
        {tab === 'recycle' && isAdmin && <RecycleBin />}
        {tab === 'safety' && isAdmin && <DataSafety />}
      </div>
    </Layout>
  );
}

function SpeciesManager({ isAdmin }) {
  const { species, reload } = useSpecies();
  const [all, setAll] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);

  const loadAll = async () => setAll(await base44.entities.Species.list('-created_date', 300));
  useEffect(() => { loadAll(); }, []);

  const visible = showArchived ? all : species;

  const addSpecies = async () => {
    if (!name.trim()) return;
    await base44.entities.Species.create({ name: name.trim(), archived: false });
    setName(''); setAdding(false); reload(); loadAll();
  };
  const saveEdit = async () => {
    const newName = editing.name.trim();
    if (!newName) return;
    if (newName === editing.origName) { setEditing(null); return; }
    try {
      await base44.functions.invoke('renameSpecies', { species_id: editing.id, new_name: newName });
      setEditing(null); reload(); loadAll();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Rename failed');
    }
  };
  const toggleArchive = async (s) => {
    await base44.entities.Species.update(s.id, { archived: !s.archived });
    reload(); loadAll();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">One shared list used everywhere a species is selected — groups, individuals, offspring, breeding, movements, mortality and sales. Archiving keeps historical records intact.</p>

      {isAdmin && (
        <div className="flex items-center justify-between">
          <span className="auc-section-label">Species Master List</span>
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm font-medium text-stone-900">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      )}

      {adding && (
        <div className="auc-card p-3 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Species name (e.g. King Wildebeest)" className="auc-input" />
          <div className="flex gap-2">
            <button onClick={addSpecies} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 border border-stone-200 text-sm py-2 rounded-md">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && <p className="text-stone-400 text-sm italic text-center py-6">No species yet.</p>}
        {visible.map((s) => (
          <div key={s.id} className={`bg-white border rounded-lg px-3 py-2.5 flex items-center justify-between ${s.archived ? 'border-stone-200 opacity-60' : 'border-stone-200 shadow-sm'}`}>
            <div>
              <span className="font-semibold text-stone-900 text-sm">{s.name}</span>
              {s.archived && <span className="ml-2 text-[10px] uppercase tracking-wide text-stone-400">Archived</span>}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-3 text-stone-500">
                <button onClick={() => setEditing({ ...s, origName: s.name })} className="hover:text-stone-900"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => toggleArchive(s)} className="hover:text-stone-900">
                  {s.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <button onClick={() => setShowArchived((v) => !v)} className="text-sm text-stone-500">
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center pb-14" onClick={() => setEditing(null)}>
          <div className="auc-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">Edit Species</h3>
            <input value={editing.name || ''} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} className="auc-input" />
            <p className="text-xs text-stone-500">Renaming updates this name everywhere — groups, animals, sales, mortality, movements and dashboard totals all follow the new name. Existing records are not split.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2.5 rounded-md">Save</button>
              <button onClick={() => setEditing(null)} className="px-4 border border-stone-200 text-sm py-2.5 rounded-md">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserManagement({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [invite, setInvite] = useState({ email: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => setUsers(await base44.entities.User.list('-created_date', 100));
  useEffect(() => { load(); }, []);

  const roleLabel = (r) => (r === 'admin' ? 'Admin' : r === 'manager' ? 'Manager' : 'Viewer');

  const sendInvite = async () => {
    if (!invite.email.trim()) return;
    setInviting(true); setMsg('');
    try {
      await base44.users.inviteUser(invite.email.trim(), invite.role);
      setInvite({ email: '', role: 'user' });
      setMsg(`Invitation sent to ${invite.email}.`);
      load();
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message || 'Invitation failed');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (u, role) => {
    try {
      const res = await base44.functions.invoke('setUserRole', { user_id: u.id, role });
      if (res?.data?.error) throw new Error(res.data.error);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Could not change role. Use the App Users dashboard page.');
    }
  };

  const removeUser = async (u) => {
    if (!confirm(`Revoke access for ${u.email}? This removes them from the app.`)) return;
    try {
      await base44.entities.User.delete(u.id);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Could not remove user. Use the App Users dashboard page to revoke access.');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">Three roles: <b>Admin</b> (full access), <b>Viewer</b> (read-only, sees everything) and <b>Manager</b> (read-only, cannot see any Rand values, prices or revenue). Invite a Manager as Viewer, then switch their role below once they have accepted.</p>

      {isAdmin ? (
        <>
          <div className="auc-card p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900"><UserPlus className="w-4 h-4" /> Invite User</div>
            <input value={invite.email} onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} placeholder="Email address" className="auc-input" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500">Role:</label>
              <select value={invite.role} onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))} className="h-9 rounded-md border border-stone-200 px-2 text-sm bg-white">
                <option value="user">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={sendInvite} disabled={inviting || !invite.email} className="flex-1 bg-stone-900 text-stone-50 text-sm py-2 rounded-md disabled:opacity-50">
                {inviting ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
            {msg && <p className="text-xs text-stone-500">{msg}</p>}
          </div>

          <div className="space-y-2">
            <span className="auc-section-label">Current Users ({users.length})</span>
            {users.map((u) => (
              <div key={u.id} className="bg-white border border-stone-200 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{u.email}</p>
                  {u.full_name && <p className="text-xs text-stone-500">{u.full_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="h-8 rounded-md border border-stone-200 px-2 text-xs bg-white">
                    <option value="user">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => removeUser(u)} className="text-stone-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm">
              <span className="text-stone-800">{u.email}</span>
              <span className={`auc-badge ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{roleLabel(u.role)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}