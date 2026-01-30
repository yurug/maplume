import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Feather } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SocialProvider } from './context/SocialContext';
import { SyncBridge } from './components/SyncBridge';
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
import { WhatsNewDialog } from './components/WhatsNewDialog';
import { GlobalStatistics } from './components/GlobalStatistics';
import { SponsorDialog } from './components/SponsorDialog';
import { SocialTab } from './components/social/SocialTab';
import { ConnectionStatus } from './components/social/ConnectionStatus';
import { SharedProjectView } from './components/social/SharedProjectView';
import { ShareProjectModal } from './components/social/ShareProjectModal';
import { Dashboard } from './components/Dashboard';
import { calculateStatistics } from './services/statistics';
import { getUserDataPath, ensureDirectory } from './services/storage';
import { useSocial } from './context/SocialContext';
import { getNewFeaturesSince, getLatestWhatsNewVersion, type VersionChanges } from './data/whatsNew';
import { Button } from './components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './components/ui/tooltip';
import { cn } from './lib/utils';
import type { Project } from '@shared/types';

function AppContent() {
  const { state, actions } = useApp();
  const { state: socialState } = useSocial();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [showGlobalStats, setShowGlobalStats] = useState(false);
  const [showSponsor, setShowSponsor] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [dataPath, setDataPath] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [whatsNewChanges, setWhatsNewChanges] = useState<VersionChanges[]>([]);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [selectedSharedProjectId, setSelectedSharedProjectId] = useState<string | null>(null);
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);

  const activeProject = state.projects.find((p) => p.id === state.activeProjectId);

  // Load background image URL when project changes
  useEffect(() => {
    const loadBackgroundImage = async () => {
      if (activeProject?.background?.type === 'image' && activeProject.background.value && dataPath) {
        const url = await window.electronAPI.getBackgroundImageUrl(dataPath, activeProject.background.value);
        setBackgroundImageUrl(url);
      } else {
        setBackgroundImageUrl(null);
      }
    };
    loadBackgroundImage();
  }, [activeProject?.background, dataPath]);

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

  // Track which username data was loaded for
  const [loadedForUser, setLoadedForUser] = useState<string | null | undefined>(undefined);

  // Initialize app when data path is set and social context is ready
  useEffect(() => {
    const initializeApp = async () => {
      if (!dataPath || state.initialized) return;

      // Wait for social context to initialize before deciding which path to use
      if (!socialState.initialized) return;

      let effectiveDataPath = dataPath;

      // If user is logged in, use their specific folder
      if (socialState.user?.username) {
        effectiveDataPath = getUserDataPath(dataPath, socialState.user.username);
        await ensureDirectory(effectiveDataPath);
      }

      actions.initialize(effectiveDataPath);
      setLoadedForUser(socialState.user?.username || null);
    };

    initializeApp();
  }, [dataPath, state.initialized, socialState.initialized, socialState.user?.username, actions]);

  // Handle user login/logout after app is initialized - reload data from correct path
  useEffect(() => {
    const handleUserChange = async () => {
      // Only run if app is initialized and we've tracked which user it was loaded for
      if (!state.initialized || !dataPath || loadedForUser === undefined) return;

      const currentUser = socialState.user?.username || null;

      // If user hasn't changed, nothing to do
      if (loadedForUser === currentUser) return;

      // User changed - reinitialize with correct data path
      let effectiveDataPath = dataPath;
      if (currentUser) {
        effectiveDataPath = getUserDataPath(dataPath, currentUser);
        await ensureDirectory(effectiveDataPath);
      }

      // Use reinitialize to reset state and load new data
      await actions.reinitialize(effectiveDataPath);
      setLoadedForUser(currentUser);
    };

    handleUserChange();
  }, [state.initialized, dataPath, socialState.user?.username, loadedForUser, actions]);

  // Reset selected date when project changes
  useEffect(() => {
    if (activeProject) {
      const today = new Date().toISOString().split('T')[0];
      const maxDate = activeProject.endDate < today ? activeProject.endDate : today;
      setSelectedDate(maxDate);
    }
  }, [activeProject?.id]);

  // Check for What's New on app initialization
  useEffect(() => {
    const checkWhatsNew = async () => {
      if (!state.initialized) return;

      const lastSeenVersion = await window.electronAPI.getConfigValue('lastSeenWhatsNewVersion');
      const changes = getNewFeaturesSince(lastSeenVersion as string | null);

      if (changes.length > 0) {
        setWhatsNewChanges(changes);
        setShowWhatsNew(true);
      }
    };
    checkWhatsNew();
  }, [state.initialized]);

  const handleWhatsNewClose = async () => {
    const latestVersion = getLatestWhatsNewVersion();
    if (latestVersion) {
      await window.electronAPI.setConfigValue('lastSeenWhatsNewVersion', latestVersion);
    }
    setShowWhatsNew(false);
  };

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

  // Generate background styles for main content
  const getBackgroundStyles = (): React.CSSProperties => {
    if (!activeProject?.background) return {};

    const { type, value, opacity } = activeProject.background;

    if (type === 'color') {
      return {
        backgroundColor: value,
      };
    }

    if (type === 'image' && backgroundImageUrl) {
      return {
        backgroundImage: `url("${backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }

    return {};
  };

  // Get overlay opacity for readability (mainly for images)
  const getOverlayOpacity = (): number => {
    if (!activeProject?.background) return 0;
    if (activeProject.background.type === 'image') {
      return 1 - (activeProject.background.opacity || 0.3);
    }
    return 0;
  };

  return (
    <TooltipProvider>
      <div className="app-container">
        {/* Main Layout */}
        <div className="app-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <ProjectList
              onNewProject={handleNewProject}
              onOpenSettings={() => setShowSettings(true)}
              onOpenGlobalStats={() => setShowGlobalStats(true)}
              onOpenSponsor={() => setShowSponsor(true)}
              onOpenSocial={() => {
                setShowSocial(true);
                setShowDashboard(false);
              }}
              onOpenDashboard={() => {
                setShowDashboard(true);
                setShowSocial(false);
                setSelectedPartyId(null);
                setSelectedSharedProjectId(null);
              }}
              onProjectSelect={() => {
                setShowSocial(false);
                setShowDashboard(false);
                setSelectedPartyId(null);
                setSelectedSharedProjectId(null);
              }}
              onShareProject={(projectId) => setSharingProjectId(projectId)}
              onViewSharedProject={(shareId) => {
                setShowSocial(false);
                setShowDashboard(false);
                setSelectedPartyId(null);
                setSelectedSharedProjectId(shareId);
              }}
              onViewParty={(partyId) => {
                setShowSocial(true);
                setShowDashboard(false);
                setSelectedPartyId(partyId);
                setSelectedSharedProjectId(null);
              }}
              showSocial={showSocial}
              showDashboard={showDashboard}
              selectedPartyId={selectedPartyId}
              selectedSharedProjectId={selectedSharedProjectId}
            />
          </aside>

          {/* Main Content */}
          <main className="main-content relative" style={(showSocial || showDashboard) ? {} : getBackgroundStyles()}>
            {/* Overlay for readability when using background images */}
            {!showSocial && !showDashboard && activeProject?.background?.type === 'image' && backgroundImageUrl && (
              <div
                className="pointer-events-none absolute inset-0 bg-white dark:bg-warm-900"
                style={{ opacity: getOverlayOpacity() }}
              />
            )}
            <AnimatePresence mode="wait">
              {showDashboard ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 h-full overflow-y-auto"
                >
                  <Dashboard />
                </motion.div>
              ) : showSocial ? (
                <motion.div
                  key="social"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 h-full"
                >
                  <SocialTab selectedPartyId={selectedPartyId} />
                </motion.div>
              ) : selectedSharedProjectId ? (
                <motion.div
                  key={`shared-${selectedSharedProjectId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 h-full"
                >
                  <SharedProjectView
                    shareId={selectedSharedProjectId}
                    onBack={() => setSelectedSharedProjectId(null)}
                  />
                </motion.div>
              ) : activeProject ? (
                <motion.div
                  key={activeProject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 space-y-6"
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
                      <StatisticsPanel stats={stats} unitType={activeProject.unitType || 'words'} endDate={activeProject.endDate} project={activeProject} entries={projectEntries} />
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
                <div className="relative z-10">
                  <EmptyState onCreateProject={handleNewProject} />
                </div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Project Form Modal */}
        <AnimatePresence>
          {showProjectForm && dataPath && (
            <ProjectForm
              project={editingProject}
              entries={editingProject ? state.entries.filter(e => e.projectId === editingProject.id) : []}
              onSave={handleSaveProject}
              onCancel={() => {
                setShowProjectForm(false);
                setEditingProject(undefined);
              }}
              onArchive={editingProject ? handleArchiveProject : undefined}
              dataPath={dataPath}
            />
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        </AnimatePresence>

        {/* Global Statistics */}
        <AnimatePresence>
          {showGlobalStats && (
            <GlobalStatistics
              projects={state.projects}
              entries={state.entries}
              onClose={() => setShowGlobalStats(false)}
            />
          )}
        </AnimatePresence>

        {/* Sponsor Dialog */}
        <AnimatePresence>
          {showSponsor && <SponsorDialog onClose={() => setShowSponsor(false)} />}
        </AnimatePresence>

        {/* Share Project Modal */}
        <AnimatePresence>
          {sharingProjectId && (() => {
            const projectToShare = state.projects.find(p => p.id === sharingProjectId);
            if (!projectToShare) return null;
            const projectEntries = state.entries.filter(e => e.projectId === sharingProjectId);
            return (
              <ShareProjectModal
                project={projectToShare}
                entries={projectEntries}
                onClose={() => setSharingProjectId(null)}
              />
            );
          })()}
        </AnimatePresence>

        {/* What's New Dialog */}
        <AnimatePresence>
          {showWhatsNew && whatsNewChanges.length > 0 && (
            <WhatsNewDialog changes={whatsNewChanges} onClose={handleWhatsNewClose} />
          )}
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
          <SocialProvider>
            <SyncBridge />
            <AppContent />
          </SocialProvider>
        </AppProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
