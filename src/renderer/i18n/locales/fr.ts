export default {
  // App
  appName: 'MaPlume',
  loading: 'Chargement...',

  // Setup
  welcome: 'Bienvenue sur MaPlume',
  welcomeSubtitle: 'Votre compagnon de suivi de mots pour l\'écriture de romans.',
  chooseDataFolder: 'Choisissez où stocker vos données',
  chooseDataFolderDesc: 'Sélectionnez un dossier où MaPlume sauvegardera vos projets et votre progression. Cela peut être un dossier local ou un dossier synchronisé dans le cloud (comme Google Drive ou OneDrive).',
  selectFolder: 'Sélectionner un dossier',
  selecting: 'Sélection...',

  // Projects
  projects: 'Projets',
  newProject: '+ Nouveau',
  noProjects: 'Aucun projet pour l\'instant. Créez-en un pour commencer !',
  showArchived: 'Afficher les archivés',
  archived: 'Archivé',
  noProjectSelected: 'Aucun projet sélectionné',
  noProjectSelectedDesc: 'Créez un nouveau projet ou sélectionnez-en un existant pour commencer.',
  createFirstProject: 'Créer votre premier projet',
  editProject: 'Modifier le projet',

  // Project Form
  newProjectTitle: 'Nouveau projet',
  editProjectTitle: 'Modifier le projet',
  projectTitle: 'Titre',
  projectTitlePlaceholder: 'Mon Roman',
  projectNotes: 'Notes',
  projectNotesPlaceholder: 'Notes optionnelles sur votre projet...',
  startDate: 'Date de début',
  endDate: 'Date de fin',
  targetWords: 'Objectif de mots',
  archive: 'Archiver',
  cancel: 'Annuler',
  save: 'Enregistrer',
  create: 'Créer',

  // Word Entry
  date: 'Date',
  words: 'Mots',
  wordsWrittenToday: 'Mots écrits aujourd\'hui',
  totalWordCount: 'Nombre total de mots',
  type: 'Type',
  add: '+ Ajouter',
  total: '= Total',
  log: 'Enregistrer',

  // Chart
  actual: 'Réel',
  target: 'Objectif',
  today: 'Aujourd\'hui',
  wordsUnit: 'mots',

  // Statistics
  statistics: 'Statistiques',
  progress: 'Progression',
  wordsRemaining: 'Mots restants',
  dailyAverage: 'Moyenne quotidienne',
  weeklyAverage: 'Moyenne hebdomadaire',
  bestDay: 'Meilleur jour',
  currentStreak: 'Série en cours',
  projectedFinish: 'Fin prévue',
  wordsPerDay: 'mots/jour',
  day: 'jour',
  days: 'jours',

  // Entries
  showEntryHistory: 'Afficher l\'historique',
  hideEntryHistory: 'Masquer l\'historique',
  entries: 'entrées',
  noEntries: 'Aucune entrée pour l\'instant. Commencez à enregistrer votre progression !',
  deleteEntryConfirm: 'Supprimer cette entrée ?',
  actions: 'Actions',

  // Settings
  settings: 'Paramètres',
  dataStorage: 'Stockage des données',
  currentFolder: 'Dossier actuel :',
  changeFolder: 'Changer de dossier',
  exportData: 'Exporter les données',
  exportAll: 'Exporter tous les projets',
  exportCurrent: 'Exporter le projet actuel',
  importData: 'Importer des données',
  importFromFile: 'Importer depuis un fichier',
  importConfirm: 'Cela remplacera vos données actuelles. Êtes-vous sûr ?',
  importError: 'Échec de lecture du fichier. Veuillez sélectionner un fichier JSON valide.',
  importInvalidFormat: 'Format de fichier invalide. Veuillez sélectionner un fichier d\'export MaPlume valide.',
  folderChanged: 'Dossier de données modifié. Vos données seront maintenant sauvegardées dans le nouvel emplacement.',
  help: 'Aide',
  reportBug: 'Signaler un bug',
  language: 'Langue',
  close: 'Fermer',

  // Messages
  newMessage: 'Nouveau message',
} as const;
