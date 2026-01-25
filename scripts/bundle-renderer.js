#!/usr/bin/env node

/**
 * Creates a renderer bundle for JS-only updates.
 * This script:
 * 1. Builds the renderer (vite build)
 * 2. Creates a zip of dist/renderer
 * 3. Generates SHA256 checksum
 * 4. Places both in release/ folder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_RENDERER = path.join(ROOT_DIR, 'dist', 'renderer');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const BUNDLE_NAME = 'renderer-bundle.zip';
const CHECKSUM_NAME = 'renderer-bundle.sha256';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function calculateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function main() {
  console.log('📦 Building renderer bundle for JS-only updates...\n');

  // Ensure release directory exists
  ensureDir(RELEASE_DIR);

  // Check if dist/renderer exists (should be built already)
  if (!fs.existsSync(DIST_RENDERER)) {
    console.log('⚠️  dist/renderer not found, building renderer...');
    execSync('npm run build:renderer', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  // Create zip of renderer folder
  const bundlePath = path.join(RELEASE_DIR, BUNDLE_NAME);
  console.log(`📁 Creating ${BUNDLE_NAME}...`);

  // Remove old bundle if exists
  if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
  }

  // Use system zip command
  if (process.platform === 'win32') {
    // PowerShell on Windows
    execSync(
      `powershell -Command "Compress-Archive -Path '${DIST_RENDERER}/*' -DestinationPath '${bundlePath}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    // zip command on macOS/Linux
    execSync(`cd "${DIST_RENDERER}" && zip -r "${bundlePath}" .`, { stdio: 'inherit' });
  }

  // Calculate checksum
  console.log(`🔐 Calculating SHA256 checksum...`);
  const checksum = calculateSHA256(bundlePath);

  // Write checksum file
  const checksumPath = path.join(RELEASE_DIR, CHECKSUM_NAME);
  fs.writeFileSync(checksumPath, `${checksum}  ${BUNDLE_NAME}\n`);

  // Get file size
  const stats = fs.statSync(bundlePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n✅ Renderer bundle created successfully!');
  console.log(`   📦 ${BUNDLE_NAME} (${sizeMB} MB)`);
  console.log(`   🔐 ${CHECKSUM_NAME}`);
  console.log(`   SHA256: ${checksum}`);
}

main();
