import { motion } from 'framer-motion';
import {
  X,
  FolderOpen,
  Download,
  Upload,
  Bug,
  Globe,
  Moon,
  Sun,
  HardDrive,
  FileJson,
  AlertTriangle,
  Info,
  Coffee,
  Heart,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n, supportedLanguages } from '../i18n';
import { selectDataFolder } from '../services/storage';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';
import type { AppData } from '@shared/types';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { state, actions } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useI18n();

  const handleChangeFolder = async () => {
    const folder = await selectDataFolder();
    if (folder) {
      // Store in both config (reliable) and localStorage (backup)
      await window.electronAPI.setConfigValue('dataPath', folder);
      localStorage.setItem('maplume-data-path', folder);
      actions.initialize(folder);
      alert(t.folderChanged);
    }
  };

  const handleExport = (single: boolean) => {
    const data = actions.exportData(single ? state.activeProjectId || undefined : undefined);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = single ? `maplume-project-${Date.now()}.json` : `maplume-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as AppData;

        if (!data.projects || !data.entries) {
          alert(t.importInvalidFormat);
          return;
        }

        if (confirm(t.importConfirm)) {
          actions.importData(data);
        }
      } catch {
        alert(t.importError);
      }
    };
    input.click();
  };

  const handleReportBug = () => {
    window.electronAPI.openExternalUrl('https://github.com/yurug/maplume/issues/new');
  };

  const handleSponsor = () => {
    window.electronAPI.openExternalUrl('https://github.com/sponsors/yurug');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-950/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-warm-200/80 bg-white p-6 shadow-warm-xl dark:border-warm-700 dark:bg-warm-850"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-warm-900 dark:text-warm-50">
            {t.settings}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-warm-400 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <Sun className="h-4 w-4" />
              {t.appearance}
            </h3>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-warm-50 p-4 dark:bg-warm-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warm-200 p-2 dark:bg-warm-700">
                  {theme === 'dark' ? (
                    <Moon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-warm-900 dark:text-warm-50">{t.darkMode}</p>
                  <p className="text-sm text-warm-500 dark:text-warm-400">
                    {theme === 'dark' ? t.darkTheme : t.lightTheme}
                  </p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </section>

          {/* Language */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <Globe className="h-4 w-4" />
              {t.language}
            </h3>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-warm-300 bg-white px-4 py-2.5',
                'text-warm-900 transition-colors',
                'focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20',
                'dark:border-warm-600 dark:bg-warm-800 dark:text-warm-50'
              )}
            >
              {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </section>

          {/* Data Storage */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <HardDrive className="h-4 w-4" />
              {t.dataStorage}
            </h3>

            <div className="rounded-lg border border-warm-200 p-4 dark:border-warm-700">
              <p className="mb-1 text-sm font-medium text-warm-700 dark:text-warm-300">
                {t.currentFolder}
              </p>
              <p className="mb-3 truncate font-mono text-sm text-warm-500 dark:text-warm-400">
                {localStorage.getItem('maplume-data-path') || t.notSet}
              </p>
              <Button variant="secondary" size="sm" onClick={handleChangeFolder} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                {t.changeFolder}
              </Button>
            </div>
          </section>

          {/* Import/Export */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <FileJson className="h-4 w-4" />
              {t.exportData} / {t.importData}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => handleExport(false)} className="gap-2">
                <Download className="h-4 w-4" />
                {t.exportAll}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExport(true)}
                disabled={!state.activeProjectId}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t.exportCurrent}
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={handleImport}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {t.importFromFile}
            </Button>

            <p className="flex items-start gap-2 text-xs text-warm-500 dark:text-warm-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              {t.importMergeWarning}
            </p>
          </section>

          {/* Help */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <Bug className="h-4 w-4" />
              {t.help}
            </h3>

            <Button variant="outline" onClick={handleReportBug} className="w-full gap-2">
              <Bug className="h-4 w-4" />
              {t.reportBug}
            </Button>
          </section>

          {/* About */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              <Info className="h-4 w-4" />
              {t.about}
            </h3>

            <div className="rounded-lg border border-warm-200 p-4 dark:border-warm-700 text-center">
              <p className="font-serif text-lg font-semibold text-warm-900 dark:text-warm-50">
                {t.appName}
              </p>
              <p className="mt-1 text-sm text-warm-500 dark:text-warm-400">
                {t.version} 0.4.3
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleSponsor}
              className="w-full gap-2 border-primary-300 text-primary-700 hover:bg-primary-50 hover:border-primary-400 dark:border-primary-600 dark:text-primary-400 dark:hover:bg-primary-900/20"
            >
              <Coffee className="h-4 w-4" />
              {t.buyMeCoffee}
              <Heart className="h-3 w-3 text-danger-500" />
            </Button>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-warm-200 pt-4 dark:border-warm-700">
          <Button onClick={onClose}>{t.close}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
