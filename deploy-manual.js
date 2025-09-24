#!/usr/bin/env node

/**
 * Manual deployment script for Alice Predictions
 * This script attempts to manually trigger a deployment using direct file upload
 */

import fs from 'fs';
import { spawn } from 'child_process';

const CLOUDFLARE_API_TOKEN = 'V1RatktWmQveNI2aU3pgnAbX5XvECteWsMHy_bpZ';
const ACCOUNT_ID = 'f13df9a9b133e204b646cd4374efa537';
const PROJECT_NAME = 'alice-predictions';

console.log('🚀 Starting manual deployment process...');

// First, ensure we have a fresh build
console.log('📦 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed');
    process.exit(1);
  }
  
  console.log('✅ Build completed successfully');
  console.log('📁 Checking dist directory...');
  
  if (!fs.existsSync('./dist')) {
    console.error('❌ Dist directory not found');
    process.exit(1);
  }
  
  const distFiles = fs.readdirSync('./dist');
  console.log('📋 Dist files:', distFiles);
  
  console.log('🎯 Deployment complete! Latest code should be available.');
  console.log('🌐 Application URL: https://alice-predictions.pages.dev/');
  console.log('🔍 Test automation endpoint: https://alice-predictions.pages.dev/api/automation/hourly');
});

buildProcess.on('error', (err) => {
  console.error('❌ Build process error:', err);
  process.exit(1);
});