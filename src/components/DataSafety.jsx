import { useState, useEffect } from 'react';
import { ShieldCheck, Download, Calendar, HardDriveDownload, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SETTING_KEY = 'last_backup_date';
const today = () => new Date().toISOString().slice(0, 10);

export default function DataSafety() {
  const [lastBackup, setLastBackup] = useState('');
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  const loadDate = async () => {
    const rows = await base44.entities.AppSetting.filter({ key: SETTING_KEY });
    setLastBackup(rows[0]?.value || '');
  };
  useEffect(() => { loadDate(); }, []);

  const upsertDate = async (dateStr) => {
    const rows = await base44.entities.AppSetting.filter({ key: SETTING_KEY });
    if (rows[0]) await base44.entities.AppSetting.update(rows[0].id, { value: dateStr });
    else await base44.entities.AppSetting.create({ key: SETTING_KEY, value: dateStr });
    setLastBackup(dateStr);
  };

  const exportBackup = async () => {
    setExporting(true); setMsg('');
    try {
      const tables = ['Farm', 'Camp', 'Species', 'Group', 'Animal', 'Movement', 'Mortality', 'Sale', 'FeedItem', 'User', 'AnimalDocument',
        'AnimalPurchaseFinance', 'SaleFinance', 'PlannedSaleFinance', 'HuntFinance', 'AuctionFinance'];
      const data = { app: 'Aucamp Boerdery', exported_at: new Date().toISOString(), tables: {} };
      for (const t of tables) {
        data.tables[t] = await base44.entities[t].list('-created_date', 5000);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aucamp-backup-${today()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      await upsertDate(today());
      setMsg('Backup exported. Keep this file somewhere safe outside Base44.');
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const markDone = async () => {
    await upsertDate(today());
    setMsg('Backup date updated to today.');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900"><ShieldCheck className="w-4 h-4 text-amber-500" /> Data Safety</div>

      <div className="auc-card p-3 space-y-2 text-sm text-stone-600">
        <p className="flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> <span>This app is on the <b>Base44 Starter</b> plan, which does <b>not</b> include automatic point-in-time database backups. Export your data regularly and keep a copy outside Base44.</span></p>
      </div>

      <div className="auc-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="auc-section-label">Last backup / export</span>
          <span className="text-sm font-semibold text-stone-900 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-stone-400" />{lastBackup || 'Never'}</span>
        </div>
        <button onClick={exportBackup} disabled={exporting} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium bg-stone-900 text-stone-50 disabled:opacity-50">
          <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export Backup (JSON)'}
        </button>
        <button onClick={markDone} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-stone-200 bg-white text-stone-700">
          <HardDriveDownload className="w-4 h-4" /> Mark backup completed
        </button>
        {msg && <p className="text-xs text-stone-500">{msg}</p>}
        <p className="text-xs text-stone-400">Exports all main tables (Farms, Camps, Species, Groups, Animals, Movements, Mortality, Sales and more) as one JSON file. You can also export any single table as CSV from the dashboard Data page.</p>
      </div>

      <div className="auc-card p-3 space-y-1.5 text-xs text-stone-600">
        <p className="font-semibold text-stone-800 text-sm">Platform recovery</p>
        <p>• Deleted records: recoverable for <b>30 days</b> via the dashboard Data → Recently deleted.</p>
        <p>• Deleted app project: recoverable for <b>30 days</b> via the workspace Recently deleted.</p>
        <p>• Starter has no automatic point-in-time DB backups — keep independent exports.</p>
        <p>• Keep your backup files <b>outside Base44</b> (your own computer or cloud drive).</p>
      </div>

      <div className="auc-card p-3 space-y-1.5 text-xs text-stone-600">
        <p className="font-semibold text-stone-800 text-sm">Account safety</p>
        <p>To avoid being locked out, keep at least one second trusted person with <b>Workspace Editor</b> + <b>App collaborator</b> + <b>App Admin</b> access. Manage these from the App Users dashboard page.</p>
      </div>
    </div>
  );
}