#!/usr/bin/env node
/**
 * Script pour injecter les informations de version au build
 * Exécuté avant le build Vite
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

try {
  console.log('🔧 Injection des informations de version...');

  // Obtenir le hash du commit git actuel
  let gitCommit;
  try {
    gitCommit = execSync('git rev-parse HEAD', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    }).trim();
    console.log(`📝 Git commit: ${gitCommit.substring(0, 7)}`);
  } catch (error) {
    gitCommit = 'unknown-commit';
    console.log('⚠️  Git commit non disponible, utilisation de fallback');
  }

  // Lire package.json pour la version
  const packageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf8')
  );
  const version = packageJson.version;
  console.log(`📦 Package version: ${version}`);

  // Timestamp de build
  const buildTime = new Date().toISOString();
  console.log(`⏰ Build time: ${buildTime}`);

  // Créer fichier de version pour l'injection
  const versionEnv = `# Auto-generated version info - DO NOT EDIT
VITE_GIT_COMMIT_HASH=${gitCommit}
VITE_PACKAGE_VERSION=${version}
VITE_BUILD_TIMESTAMP=${buildTime}
VITE_BUILD_ENV=production
`;

  writeFileSync(join(rootDir, '.env.version'), versionEnv);
  console.log('✅ Fichier .env.version créé avec succès');

  // Mettre à jour le fichier version.ts avec les valeurs
  const versionTsPath = join(rootDir, 'src/utils/version.ts');
  let versionTs = readFileSync(versionTsPath, 'utf8');
  
  // Remplacer les valeurs par défaut par les vraies valeurs
  versionTs = versionTs
    .replace(/process\.env\.npm_package_version \|\| '1\.1\.0'/, `'${version}'`)
    .replace(/process\.env\.GIT_COMMIT_HASH \|\| 'dev-build'/, `'${gitCommit}'`)
    .replace(/process\.env\.BUILD_TIMESTAMP \|\| new Date\(\)\.toISOString\(\)/, `'${buildTime}'`);
  
  writeFileSync(versionTsPath + '.build', versionTs);
  console.log('✅ Version build file créé');

} catch (error) {
  console.error('❌ Erreur injection version:', error.message);
  process.exit(1);
}