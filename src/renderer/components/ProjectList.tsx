import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Plus, Archive, BookOpen, ChevronRight, Settings, Feather, Coffee, Users, Share2, LayoutDashboard, UserPlus, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSocial } from '../context/SocialContext';
import { ConnectionStatus } from './social/ConnectionStatus';
import { PartySection } from './social/PartySection';

// Helper to get icon component by name
function getIconComponent(name: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[name] || LucideIcons.BookOpen;
}
import { useI18n, supportedLanguages } from '../i18n';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '../lib/utils';

interface ProjectListProps {
  onNewProject: () => void;
  onOpenSettings?: () => void;
  onOpenGlobalStats?: () => void;
  onOpenSponsor?: () => void;
  onOpenSocial?: () => void;
  onOpenDashboard?: () => void;
  onProjectSelect?: () => void;
  onShareProject?: (projectId: string) => void;
  onViewSharedProject?: (shareId: string) => void;
  onViewParty?: (partyId: string) => void;
  showSocial?: boolean;
  showDashboard?: boolean;
  selectedSharedProjectId?: string | null;
  selectedPartyId?: string | null;
}

export function ProjectList({ onNewProject, onOpenSettings, onOpenGlobalStats, onOpenSponsor, onOpenSocial, onOpenDashboard, onProjectSelect, onShareProject, onViewSharedProject, onViewParty, showSocial, showDashboard, selectedSharedProjectId, selectedPartyId }: ProjectListProps) {
  const { state, actions } = useApp();
  const { state: socialState, actions: socialActions } = useSocial();
  const { t, language, setLanguage } = useI18n();

  // Refresh shares, parties, and friend requests when user is logged in and online
  useEffect(() => {
    if (socialState.user && socialState.isOnline) {
      socialActions.refreshShares();
      socialActions.refreshParties();
      socialActions.refreshFriendRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socialState.user?.id, socialState.isOnline]);

  // Cycle through supported languages
  const toggleLanguage = () => {
    const currentIndex = supportedLanguages.findIndex((l) => l.code === language);
    const nextIndex = (currentIndex + 1) % supportedLanguages.length;
    setLanguage(supportedLanguages[nextIndex].code);
  };

  // Get short language code for display (e.g., "EN", "FR")
  const shortLang = language.toUpperCase().slice(0, 2);

  const visibleProjects = state.showArchived
    ? state.projects
    : state.projects.filter((p) => !p.archived);

  return (
    <div className="flex h-full flex-col">
      {/* App Header */}
      <div className="flex items-center justify-between border-b border-warm-200/60 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 dark:border-warm-700/60">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onOpenGlobalStats}
                className="flex items-center gap-2 rounded-lg px-2 py-1 -ml-2 transition-colors hover:bg-white/10"
              >
                <Feather className="h-5 w-5 text-white" />
                <span className="font-serif text-lg font-semibold text-white">{t.appName}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.globalStatistics}</TooltipContent>
          </Tooltip>

          {/* Sponsor Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenSponsor}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Coffee className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.buyMeCoffee}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Language Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleLanguage}
                className="text-white/80 hover:text-white hover:bg-white/10 text-xs font-medium"
              >
                {shortLang}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t.language}</TooltipContent>
          </Tooltip>

          {/* Settings Button */}
          {onOpenSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onOpenSettings}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t.settings}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Dashboard Button */}
      {onOpenDashboard && (
        <div className="border-b border-warm-200/60 px-3 py-2 dark:border-warm-700/60">
          <button
            onClick={onOpenDashboard}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              showDashboard
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'text-warm-600 hover:bg-warm-100 dark:text-warm-400 dark:hover:bg-warm-800'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-sm font-medium">{t.dashboard || 'Dashboard'}</span>
          </button>
        </div>
      )}

      {/* Projects Header */}
      <div className="flex items-center justify-between border-b border-warm-200/60 px-4 py-2.5 dark:border-warm-700/60">
        <h2 className="font-serif text-xs font-semibold uppercase tracking-wider text-warm-500 dark:text-warm-400">
          {t.projects}
        </h2>
        <Button size="sm" onClick={onNewProject} className="gap-1.5 h-7 text-xs">
          <Plus className="h-3 w-3" />
          {t.new}
        </Button>
      </div>

      {/* Project Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          <AnimatePresence mode="popLayout">
            {visibleProjects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center px-4 py-8 text-center"
              >
                <div className="mb-4 rounded-2xl bg-warm-100 p-4 dark:bg-warm-700">
                  <BookOpen className="h-8 w-8 text-warm-400 dark:text-warm-500" />
                </div>
                <p className="text-sm text-warm-500 dark:text-warm-400">{t.noProjects}</p>
              </motion.div>
            ) : (
              visibleProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'project-item group',
                    state.activeProjectId === project.id && 'active',
                    project.archived && 'opacity-60'
                  )}
                  onClick={() => {
                    actions.setActiveProject(project.id);
                    onProjectSelect?.();
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Project indicator */}
                    <div
                      className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                        'bg-warm-100 text-warm-500 transition-colors',
                        'group-hover:bg-primary-100 group-hover:text-primary-600',
                        state.activeProjectId === project.id &&
                          'bg-primary-200 text-primary-700 dark:bg-primary-800 dark:text-primary-300',
                        'dark:bg-warm-700 dark:text-warm-400'
                      )}
                    >
                      {(() => {
                        const ProjectIcon = getIconComponent(project.icon || 'BookOpen');
                        return <ProjectIcon className="h-4 w-4" />;
                      })()}
                    </div>

                    {/* Project title */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate font-medium text-warm-700',
                          'transition-colors group-hover:text-warm-900',
                          state.activeProjectId === project.id && 'text-primary-900',
                          'dark:text-warm-200 dark:group-hover:text-warm-50'
                        )}
                      >
                        {project.title}
                      </p>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-1">
                    {project.archived && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Archive className="mr-1 h-2.5 w-2.5" />
                        {t.archived}
                      </Badge>
                    )}
                    {/* Share button */}
                    {!project.archived && socialState.user && onShareProject && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareProject(project.id);
                            }}
                            className={cn(
                              'p-1.5 rounded-md transition-colors',
                              'opacity-0 group-hover:opacity-100',
                              'text-warm-400 hover:text-primary-600 hover:bg-primary-50',
                              'dark:text-warm-500 dark:hover:text-primary-400 dark:hover:bg-primary-900/30'
                            )}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{t.shareProject}</TooltipContent>
                      </Tooltip>
                    )}
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-warm-300 transition-all',
                        'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5',
                        state.activeProjectId === project.id && 'opacity-100 text-primary-500'
                      )}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Show Archived Toggle - near projects */}
        <div className="px-4 py-2 border-t border-warm-200/60 dark:border-warm-700/60">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-warm-600 dark:text-warm-400">
              <Archive className="h-4 w-4" />
              {t.showArchived}
            </span>
            <Switch
              checked={state.showArchived}
              onCheckedChange={() => actions.toggleShowArchived()}
            />
          </label>
        </div>

        {/* Shared Projects Section */}
        {socialState.user && socialState.receivedShares.length > 0 && (
          <div className="border-t border-warm-200/60 dark:border-warm-700/60">
            <div className="px-4 py-2 flex items-center gap-2">
              <Share2 className="h-3 w-3 text-warm-400" />
              <span className="text-xs font-medium text-warm-500 dark:text-warm-400 uppercase tracking-wider">
                {t.sharedWithYou} ({socialState.receivedShares.length})
              </span>
            </div>
            <div className="pb-2">
              <AnimatePresence mode="popLayout">
                {socialState.receivedShares.map((share, index) => (
                  <motion.div
                    key={share.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'project-item group cursor-pointer',
                      selectedSharedProjectId === share.id && 'active'
                    )}
                    onClick={() => {
                      actions.setActiveProject(null); // Deselect any local project
                      onViewSharedProject?.(share.id);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* Shared project indicator - green tinted */}
                      <div
                        className={cn(
                          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                          'bg-green-100 text-green-600 transition-colors',
                          'group-hover:bg-green-200 group-hover:text-green-700',
                          selectedSharedProjectId === share.id &&
                            'bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300',
                          'dark:bg-green-900/40 dark:text-green-400'
                        )}
                      >
                        <Share2 className="h-4 w-4" />
                      </div>

                      {/* Shared project title and owner */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate font-medium text-warm-700',
                            'transition-colors group-hover:text-warm-900',
                            selectedSharedProjectId === share.id && 'text-green-800',
                            'dark:text-warm-200 dark:group-hover:text-warm-50'
                          )}
                        >
                          {share.projectLocalId.split('-')[0]}...
                        </p>
                        <p className="text-xs text-warm-500 dark:text-warm-500 truncate">
                          {share.owner?.username}
                        </p>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-warm-300 transition-all',
                          'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5',
                          selectedSharedProjectId === share.id && 'opacity-100 text-green-500'
                        )}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Active Parties Section */}
        {socialState.activeParties.length > 0 && onViewParty && (
          <div className="border-t border-warm-200/60 px-2 py-2 space-y-1.5 dark:border-warm-700/60">
            {socialState.activeParties.map((party) => (
              <PartySection
                key={party.id}
                party={party}
                onClick={() => onViewParty(party.id)}
                isActive={selectedPartyId === party.id}
              />
            ))}
          </div>
        )}

        {/* Social Tab Button */}
        {onOpenSocial && (
          <div className="border-t border-warm-200/60 px-3 py-2 dark:border-warm-700/60">
            <button
              onClick={onOpenSocial}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                showSocial
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-warm-600 hover:bg-warm-100 dark:text-warm-400 dark:hover:bg-warm-800'
              )}
            >
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{t.social || 'Social'}</span>
            </button>
          </div>
        )}

        {/* Friend Requests Section */}
        {socialState.user && socialState.friendRequests.length > 0 && (
          <div className="border-t border-warm-200/60 px-3 py-2 dark:border-warm-700/60">
            <div className="flex items-center gap-2 px-1 mb-2">
              <UserPlus className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-warm-500 dark:text-warm-400 uppercase tracking-wider">
                {t.friendRequests || 'Friend Requests'} ({socialState.friendRequests.length})
              </span>
            </div>
            <div className="space-y-1">
              {socialState.friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-6 w-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">
                      {request.fromUser?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-warm-700 dark:text-warm-300 truncate">
                      {request.fromUser?.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => socialActions.acceptFriendRequest(request.id)}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t.accept || 'Accept'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => socialActions.rejectFriendRequest(request.id)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t.reject || 'Reject'}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
