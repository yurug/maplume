export default {
  // App
  appName: 'MaPlume',
  loading: 'Loading...',

  // Setup
  welcome: 'Welcome to MaPlume',
  welcomeSubtitle: 'Your word tracking companion for novel writing.',
  chooseDataFolder: 'Choose where to store your data',
  chooseDataFolderDesc: 'Select a folder where MaPlume will save your projects and progress. This can be a local folder or a cloud-synced folder (like Google Drive or OneDrive).',
  selectFolder: 'Select Folder',
  selecting: 'Selecting...',

  // Projects
  projects: 'Projects',
  newProject: '+ New',
  noProjects: 'No projects yet. Create one to get started!',
  showArchived: 'Show archived',
  archived: 'Archived',
  noProjectSelected: 'No Project Selected',
  noProjectSelectedDesc: 'Create a new project or select an existing one to get started.',
  createFirstProject: 'Create Your First Project',
  editProject: 'Edit Project',

  // Project Form
  newProjectTitle: 'New Project',
  editProjectTitle: 'Edit Project',
  projectTitle: 'Title',
  projectTitlePlaceholder: 'My Novel',
  projectNotes: 'Notes',
  projectNotesPlaceholder: 'Optional notes about your project...',
  startDate: 'Start Date',
  endDate: 'End Date',
  targetWords: 'Target Words',
  archive: 'Archive',
  cancel: 'Cancel',
  save: 'Save',
  create: 'Create',

  // Word Entry
  date: 'Date',
  words: 'Words',
  wordsWrittenToday: 'Words written today',
  totalWordCount: 'Total word count',
  type: 'Type',
  add: '+ Add',
  total: '= Total',
  log: 'Log',

  // Chart
  actual: 'Actual',
  target: 'Target',
  today: 'Today',
  wordsUnit: 'words',

  // Statistics
  statistics: 'Statistics',
  progress: 'Progress',
  wordsRemaining: 'Words Remaining',
  dailyAverage: 'Daily Average',
  weeklyAverage: 'Weekly Average',
  bestDay: 'Best Day',
  currentStreak: 'Current Streak',
  projectedFinish: 'Projected Finish',
  wordsPerDay: 'words/day',
  day: 'day',
  days: 'days',

  // Entries
  showEntryHistory: 'Show Entry History',
  hideEntryHistory: 'Hide Entry History',
  entries: 'entries',
  noEntries: 'No entries yet. Start logging your progress!',
  deleteEntryConfirm: 'Delete this entry?',
  actions: 'Actions',

  // Settings
  settings: 'Settings',
  dataStorage: 'Data Storage',
  currentFolder: 'Current folder:',
  changeFolder: 'Change Folder',
  exportData: 'Export Data',
  exportAll: 'Export All Projects',
  exportCurrent: 'Export Current Project',
  importData: 'Import Data',
  importFromFile: 'Import from File',
  importConfirm: 'This will replace your current data. Are you sure?',
  importError: 'Failed to read file. Please select a valid JSON file.',
  importInvalidFormat: 'Invalid file format. Please select a valid MaPlume export file.',
  folderChanged: 'Data folder changed. Your data will now be saved to the new location.',
  help: 'Help',
  reportBug: 'Report a Bug',
  language: 'Language',
  close: 'Close',

  // Messages
  newMessage: 'New message',
} as const;
