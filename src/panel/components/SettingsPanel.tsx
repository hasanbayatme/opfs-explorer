import { useEffect } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import type { AppSettings } from '../api';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] modal-backdrop-enter"
      onClick={onClose}
    >
      <div
        className="bg-dt-surface border border-dt-border shadow-xl rounded-lg w-[400px] overflow-hidden modal-content-enter"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-dt-border bg-dt-bg">
          <h3 id="settings-title" className="font-semibold text-dt-text text-sm flex items-center gap-2">
            <SettingsIcon size={14} aria-hidden="true" /> Settings
          </h3>
          <button
            onClick={onClose}
            className="p-0.5 rounded text-dt-text-secondary hover:text-dt-text hover:bg-dt-hover transition-colors"
            aria-label="Close settings"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* JSON formatting */}
          <section>
            <h4 className="text-xs font-semibold text-dt-text mb-2 uppercase tracking-wide opacity-70">JSON Formatting</h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs text-dt-text-secondary">
                <span>Indentation</span>
                <select
                  value={String(settings.jsonIndent)}
                  onChange={(e) => update({ jsonIndent: e.target.value === 'tab' ? 'tab' : (Number(e.target.value) as 2 | 4) })}
                  className="bg-dt-bg border border-dt-border rounded px-2 py-1 text-xs text-dt-text focus:border-[var(--dt-focus)] focus:outline-none"
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="tab">Tab</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-dt-text-secondary">
                <span>Sort object keys alphabetically</span>
                <input
                  type="checkbox"
                  checked={settings.jsonSortKeys}
                  onChange={(e) => update({ jsonSortKeys: e.target.checked })}
                  className="accent-blue-600"
                />
              </label>
            </div>
          </section>

          {/* Directory size */}
          <section>
            <h4 className="text-xs font-semibold text-dt-text mb-2 uppercase tracking-wide opacity-70">Directory Sizes</h4>
            <p className="text-[10px] text-dt-text-secondary mb-2 opacity-75">
              Folder sizes are calculated on demand via the right-click menu by default.
              Enabling auto-calculate can slow down browsing large trees.
            </p>
            <div className="space-y-1.5">
              {([
                { value: 'off', label: 'Off (manual only, recommended)' },
                { value: 'shallow', label: 'Auto: this folder only, on expand' },
                { value: 'recursive', label: 'Auto: full recursive, on expand' },
              ] as const).map(opt => (
                <label key={opt.value} className="flex items-center gap-2 text-xs text-dt-text-secondary cursor-pointer">
                  <input
                    type="radio"
                    name="autoDirSize"
                    value={opt.value}
                    checked={settings.autoDirSize === opt.value}
                    onChange={() => update({ autoDirSize: opt.value })}
                    className="accent-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end px-4 py-2 bg-dt-bg border-t border-dt-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
