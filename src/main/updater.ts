import { app, dialog, BrowserWindow } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const GITHUB_OWNER = 'yurug';
const GITHUB_REPO = 'maplume';
const RENDERER_BUNDLE_NAME = 'renderer-bundle.zip';
const CHECKSUM_FILE_NAME = 'renderer-bundle.sha256';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  checksumUrl?: string;
}

function getRendererPath(): string {
  return path.join(app.getPath('userData'), 'renderer');
}

function getVersionFilePath(): string {
  return path.join(app.getPath('userData'), 'renderer-version.txt');
}

function getInstalledRendererVersion(): string | null {
  try {
    const versionFile = getVersionFilePath();
    if (fs.existsSync(versionFile)) {
      return fs.readFileSync(versionFile, 'utf-8').trim();
    }
  } catch {
    // No installed version
  }
  return null;
}

function setInstalledRendererVersion(version: string): void {
  const versionFile = getVersionFilePath();
  fs.writeFileSync(versionFile, version, 'utf-8');
}

function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const parts1 = normalize(v1);
  const parts2 = normalize(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'User-Agent': 'MaPlume-Updater' }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          httpsGet(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function httpsDownload(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = https.get(url, {
      headers: { 'User-Agent': 'MaPlume-Updater' }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          httpsDownload(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          onProgress(Math.round((downloadedSize / totalSize) * 100));
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });

    request.setTimeout(120000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const { execSync } = await import('child_process');

  // Ensure destination directory exists and is empty
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Use system unzip (available on macOS, Linux, and Windows with Git)
  if (process.platform === 'win32') {
    // Use PowerShell on Windows
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, {
      timeout: 60000
    });
  } else {
    // Use unzip on macOS/Linux
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, {
      timeout: 60000
    });
  }
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();

  try {
    console.log('[Updater] Checking for updates...');

    const response = await httpsGet(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    );

    const release: GitHubRelease = JSON.parse(response);
    const latestVersion = release.tag_name.replace(/^v/, '');

    console.log(`[Updater] Current: ${currentVersion}, Latest: ${latestVersion}`);

    // Find renderer bundle and checksum assets
    const bundleAsset = release.assets.find(a => a.name === RENDERER_BUNDLE_NAME);
    const checksumAsset = release.assets.find(a => a.name === CHECKSUM_FILE_NAME);

    if (!bundleAsset || !checksumAsset) {
      console.log('[Updater] No renderer bundle found in release, skipping JS update');
      return {
        available: false,
        currentVersion,
        latestVersion
      };
    }

    // Check if update is available
    const installedVersion = getInstalledRendererVersion() || currentVersion;
    const isNewer = compareVersions(latestVersion, installedVersion) > 0;

    return {
      available: isNewer,
      currentVersion: installedVersion,
      latestVersion,
      downloadUrl: bundleAsset.browser_download_url,
      checksumUrl: checksumAsset.browser_download_url
    };
  } catch (error) {
    console.error('[Updater] Error checking for updates:', error);
    throw error;
  }
}

export async function downloadAndInstallUpdate(
  updateInfo: UpdateInfo,
  mainWindow: BrowserWindow | null,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (!updateInfo.downloadUrl || !updateInfo.checksumUrl) {
    throw new Error('No download URL available');
  }

  const tempDir = path.join(app.getPath('temp'), 'maplume-update');
  const zipPath = path.join(tempDir, RENDERER_BUNDLE_NAME);
  const checksumPath = path.join(tempDir, CHECKSUM_FILE_NAME);

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('[Updater] Downloading checksum...');
    const checksumContent = await httpsGet(updateInfo.checksumUrl);
    const expectedChecksum = checksumContent.trim().split(/\s+/)[0].toLowerCase();
    console.log(`[Updater] Expected checksum: ${expectedChecksum}`);

    console.log('[Updater] Downloading renderer bundle...');
    await httpsDownload(updateInfo.downloadUrl, zipPath, onProgress);

    console.log('[Updater] Verifying checksum...');
    const actualChecksum = await calculateSHA256(zipPath);
    console.log(`[Updater] Actual checksum: ${actualChecksum}`);

    if (actualChecksum !== expectedChecksum) {
      throw new Error(`Checksum mismatch! Expected ${expectedChecksum}, got ${actualChecksum}`);
    }

    console.log('[Updater] Checksum verified, extracting...');
    const rendererPath = getRendererPath();
    await extractZip(zipPath, rendererPath);

    // Save version info
    setInstalledRendererVersion(updateInfo.latestVersion);

    console.log('[Updater] Update installed successfully!');

    // Clean up
    fs.rmSync(tempDir, { recursive: true });

    return true;
  } catch (error) {
    console.error('[Updater] Error installing update:', error);

    // Clean up on error
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

export function getRendererLoadPath(): string {
  const userRendererPath = getRendererPath();
  const userIndexPath = path.join(userRendererPath, 'index.html');

  // Check if we have a user-installed renderer
  if (fs.existsSync(userIndexPath)) {
    console.log('[Updater] Loading renderer from user folder:', userRendererPath);
    return userIndexPath;
  }

  // Fall back to bundled renderer
  const bundledPath = path.join(__dirname, '../renderer/index.html');
  console.log('[Updater] Loading bundled renderer:', bundledPath);
  return bundledPath;
}

export function hasUserRenderer(): boolean {
  const userIndexPath = path.join(getRendererPath(), 'index.html');
  return fs.existsSync(userIndexPath);
}

export function getUserRendererVersion(): string | null {
  return getInstalledRendererVersion();
}
