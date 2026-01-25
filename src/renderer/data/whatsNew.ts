/**
 * What's New content for each version.
 * Only add entries for versions with significant new features.
 * Bug fixes and minor changes don't need entries here.
 */

export interface VersionFeature {
  titleKey: string; // i18n key for feature title
  descriptionKey: string; // i18n key for feature description
  icon?: string; // Optional icon name from lucide-react
}

export interface VersionChanges {
  version: string;
  features: VersionFeature[];
}

// Ordered from newest to oldest
export const whatsNewData: VersionChanges[] = [
  {
    version: '0.4.0',
    features: [
      {
        titleKey: 'whatsNew_projectIcons_title',
        descriptionKey: 'whatsNew_projectIcons_desc',
        icon: 'Smile',
      },
    ],
  },
  {
    version: '0.3.0',
    features: [
      {
        titleKey: 'whatsNew_backgrounds_title',
        descriptionKey: 'whatsNew_backgrounds_desc',
        icon: 'Palette',
      },
    ],
  },
  {
    version: '0.2.0',
    features: [
      {
        titleKey: 'whatsNew_unitTypes_title',
        descriptionKey: 'whatsNew_unitTypes_desc',
        icon: 'Ruler',
      },
    ],
  },
  // Add new versions above this line
];

/**
 * Get the latest version that has What's New content
 */
export function getLatestWhatsNewVersion(): string | null {
  return whatsNewData.length > 0 ? whatsNewData[0].version : null;
}

/**
 * Get all versions with new features since a given version (exclusive)
 * Returns versions in order from oldest to newest
 */
export function getNewFeaturesSince(lastSeenVersion: string | null): VersionChanges[] {
  if (!lastSeenVersion) {
    // First time user - show only the latest version's features
    return whatsNewData.length > 0 ? [whatsNewData[0]] : [];
  }

  const result: VersionChanges[] = [];
  for (const entry of whatsNewData) {
    if (compareVersions(entry.version, lastSeenVersion) > 0) {
      result.push(entry);
    }
  }

  // Return in chronological order (oldest first)
  return result.reverse();
}

/**
 * Compare two semver version strings
 * Returns: positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}
