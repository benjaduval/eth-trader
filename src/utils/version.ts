/**
 * Système de versioning automatique pour Alice Predictions
 * Combine version package.json + git commit hash
 */

export interface VersionInfo {
  version: string;
  commit: string;
  build_time: string;
  environment: 'development' | 'production';
}

/**
 * Génère les informations de version automatiquement
 * En production, utilise les variables d'environnement injectées au build
 * En développement, utilise des valeurs par défaut
 */
export function getVersionInfo(): VersionInfo {
  // Version depuis package.json (injectée au build)
  const packageVersion = process.env.npm_package_version || '1.1.0';
  
  // Hash du commit git (injecté au build)
  const gitCommit = process.env.GIT_COMMIT_HASH || 'dev-build';
  
  // Timestamp de build
  const buildTime = process.env.BUILD_TIMESTAMP || new Date().toISOString();
  
  // Environnement
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.CF_PAGES === '1';
  
  return {
    version: `${packageVersion}-${isProduction ? 'PRODUCTION' : 'DEV'}`,
    commit: gitCommit.substring(0, 7), // Premier 7 caractères du hash
    build_time: buildTime,
    environment: isProduction ? 'production' : 'development'
  };
}

/**
 * Version formatée pour l'affichage dans l'interface
 */
export function getDisplayVersion(): string {
  const info = getVersionInfo();
  return `v${info.version} • ${info.commit}`;
}

/**
 * Version complète pour l'API health endpoint
 */
export function getApiVersionInfo() {
  const info = getVersionInfo();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: info.version,
    project: 'alice-predictions',
    interface: 'standalone',
    last_commit: info.commit,
    build_time: info.build_time,
    environment: info.environment,
    deployment_notes: getDeploymentNotes()
  };
}

/**
 * Notes de déploiement basées sur la version
 */
function getDeploymentNotes(): string {
  const info = getVersionInfo();
  
  if (info.environment === 'development') {
    return 'Development build with live reload and debug features';
  }
  
  // Notes basées sur la version majeure
  const [major, minor] = info.version.split('.');
  
  if (major === '1' && minor === '1') {
    return 'Live pricing + TimesFM predictions + 510h historical data + Emergency fill endpoints';
  }
  
  return 'Latest production build with all features enabled';
}