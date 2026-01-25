import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Feather } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nProvider';
import { useI18n } from './i18n';
import { SetupScreen } from './components/SetupScreen';
import { ProjectList } from './components/ProjectList';
import { ProjectForm } from './components/ProjectForm';
import { WordEntryForm } from './components/WordEntryForm';
import { ProgressChart } from './components/ProgressChart';
import { StatisticsPanel } from './components/StatisticsPanel';
import { EntriesTable } from './components/EntriesTable';
import { MotivationalMessage } from './components/MotivationalMessage';
import { SettingsPanel } from './components/SettingsPanel';
import { EmptyState } from './components/EmptyState';
import { calculateStatistics } from './services/statistics';
import { Button } from './components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { cn } from './lib/utils';
import type { Project } from '@shared/types';

function AppContent() {
  const { state, actions } = useApp();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [dataPath, setDataPath] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId);

  // Check for stored data path on mount
  useEffect(() => {
    const loadDataPath = async () => {
      // Try new config storage first (more reliable on Windows)
      const configPath = await window.electronAPI.getConfigValue('dataPath');
      if (configPath && typeof configPath === 'string') {
        setDataPath(configPath);
        return;
      }
      // Fallback to localStorage for migration
      const storedPath = localStorage.getItem('maplume-data-path');
      if (storedPath) {
        // Migrate to new config storage
        await window.electronAPI.setConfigValue('dataPath', storedPath);
        setDataPath(storedPath);
      }
    };
    loadDataPath();
  }, []);

  // Initialize app when data path is set
  useEffect(() => {
    if (dataPath && !state.initialized) {
      actions.initialize(dataPath);
    }
  }, [dataPath, state.initialized, actions]);

  // Reset selected date when project changes
  useEffect(() => {
    if (activeProject) {
      const today = new Date().toISOString().split('T')[0];
      const maxDate = activeProject.endDate < today ? activeProject.endDate : today;
      setSelectedDate(maxDate);
    }
  }, [activeProject?.id]);

  const handleSetupComplete = async (path: string) => {
    // Store in both config (reliable) and localStorage (backup)
    await window.electronAPI.setConfigValue('dataPath', path);
    localStorage.setItem('maplume-data-path', path);
    setDataPath(path);
  };

  // Show setup screen if no data path
  if (!dataPath) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  // Show loading while initializing
  if (!state.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Feather className="h-12 w-12 text-primary-500" />
          </motion.div>
          <p className="font-serif text-lg text-warm-600 dark:text-warm-400">{t.loading}</p>
        </motion.div>
      </div>
    );
  }

  const projectEntries = activeProject
    ? state.entries.filter((e) => e.projectId === activeProject.id)
    : [];
  const stats = activeProject ? calculateStatistics(activeProject, state.entries) : null;

  const isBehindSchedule = stats
    ? stats.projectedCompletionDate !== null &&
      new Date(stats.projectedCompletionDate) > new Date(activeProject!.endDate)
    : false;

  const handleNewProject = () => {
    setEditingProject(undefined);
    setShowProjectForm(true);
  };

  const handleEditProject = () => {
    if (activeProject) {
      setEditingProject(activeProject);
      setShowProjectForm(true);
    }
  };

  const handleSaveProject = (data: Omit<Project, 'id' | 'archived' | 'createdAt' | 'updatedAt'>) => {
    if (editingProject) {
      actions.updateProject({ ...editingProject, ...data });
    } else {
      actions.addProject(data);
    }
    setShowProjectForm(false);
    setEditingProject(undefined);
  };

  const handleArchiveProject = () => {
    if (editingProject) {
      actions.archiveProject(editingProject.id);
      setShowProjectForm(false);
      setEditingProject(undefined);
    }
  };

  return (
    <TooltipProvider>
      <div className="app-container">
        {/* Main Layout */}
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <ProjectList onNewProject={handleNewProject} onOpenSettings={() => setShowSettings(true)} />
          </aside>

          {/* Main Content */}
          <main className="main-content">
            <AnimatePresence mode="wait">
              {activeProject ? (
                <motion.div
                  key={activeProject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <motion.h2
                        className="font-serif text-2xl font-semibold text-warm-900 dark:text-warm-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {activeProject.title}
                      </motion.h2>
                      {activeProject.notes && (
                        <motion.p
                          className="text-sm text-warm-500 dark:text-warm-400 max-w-xl"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          {activeProject.notes}
                        </motion.p>
                      )}
                    </div>
                    <Button variant="secondary" onClick={handleEditProject}>
                      {t.editProject}
                    </Button>
                  </div>

                  {/* Motivational Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <MotivationalMessage behindSchedule={isBehindSchedule} />
                  </motion.div>

                  {/* Word Entry Form */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <WordEntryForm
                      project={activeProject}
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                    />
                  </motion.div>

                  {/* Progress Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ProgressChart
                      project={activeProject}
                      entries={projectEntries}
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                    />
                  </motion.div>

                  {/* Statistics Panel */}
                  {stats && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <StatisticsPanel stats={stats} />
                    </motion.div>
                  )}

                  {/* Entry History Toggle */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-2"
                  >
                    <Button
                      variant="link"
                      onClick={() => setShowEntries(!showEntries)}
                      className="text-warm-600 hover:text-primary-600"
                    >
                      {showEntries ? t.hideEntryHistory : t.showEntryHistory} ({projectEntries.length}{' '}
                      {t.entries})
                    </Button>

                    <AnimatePresence>
                      {showEntries && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <EntriesTable entries={projectEntries} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              ) : (
                <EmptyState onCreateProject={handleNewProject} />
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Project Form Modal */}
        <AnimatePresence>
          {showProjectForm && (
            <ProjectForm
              project={editingProject}
              onSave={handleSaveProject}
              onCancel={() => {
                setShowProjectForm(false);
                setEditingProject(undefined);
              }}
              onArchive={editingProject ? handleArchiveProject : undefined}
            />
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
