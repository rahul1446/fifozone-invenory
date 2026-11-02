/**
 * verify_zero_wc.js
 * 
 * Automated Codebase Scanner to verify zero remaining WooCommerce REST API (wc/v3)
 * calls or legacy WooCommerce library dependencies across backend services, controllers,
 * scripts, and configuration.
 * 
 * Scans:
 *   - server/src/
 *   - server/scripts/
 *   - server/*.js (root server scripts)
 *   - server/package.json
 *   - server/.env
 * 
 * Flags:
 *   - /wp-json/wc/v3 or wc/v3
 *   - @woocommerce/woocommerce-rest-api
 *   - new WooCommerceRestApi
 *   - Legacy consumer key/secret (WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET)
 * 
 * Exits with:
 *   - 0: Zero occurrences found (Clean)
 *   - 1: One or more occurrences found (Offending files and lines printed)
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_RULES = [
  {
    id: 'WC_V3_ENDPOINT',
    name: 'WooCommerce REST v3 Endpoint',
    regex: /(?:\/wp-json\/)?wc\/v3/i,
    description: 'Direct legacy WooCommerce v3 REST API route reference'
  },
  {
    id: 'WC_REST_PACKAGE',
    name: 'Legacy WooCommerce REST Package',
    regex: /@woocommerce\/woocommerce-rest-api/,
    description: 'Deprecated @woocommerce/woocommerce-rest-api npm package import or dependency'
  },
  {
    id: 'WC_CLIENT_INSTANTIATION',
    name: 'WooCommerceRestApi Client Instantiation',
    regex: /new\s+WooCommerceRestApi\s*\(/,
    description: 'Instantiation of legacy WooCommerce client'
  },
  {
    id: 'WC_CONSUMER_KEY',
    name: 'Legacy WooCommerce Consumer Key',
    regex: /WOOCOMMERCE_CONSUMER_KEY/i,
    description: 'Legacy WooCommerce consumer key configuration reference'
  },
  {
    id: 'WC_CONSUMER_SECRET',
    name: 'Legacy WooCommerce Consumer Secret',
    regex: /WOOCOMMERCE_CONSUMER_SECRET/i,
    description: 'Legacy WooCommerce consumer secret configuration reference'
  }
];

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  '.agents',
  'logs',
  'uploads',
  'tests',
  'server/tests',
  'verify_zero_wc.js',
  'package-lock.json' // lockfiles contain historical package records; package.json is the authoritative manifest
];

/**
 * Recursively collect files to scan within base directory
 */
function collectFiles(dirPath, ignoreList = DEFAULT_IGNORES, fileList = []) {
  if (!fs.existsSync(dirPath)) return fileList;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const normalizedRelative = fullPath.replace(/\\/g, '/');

    // Check ignore rules
    const shouldIgnore = ignoreList.some(ignore => {
      const normIgnore = ignore.replace(/\\/g, '/');
      return normalizedRelative.includes('/' + normIgnore + '/') ||
             normalizedRelative.endsWith('/' + normIgnore) ||
             entry.name === ignore;
    });

    if (shouldIgnore) continue;

    if (entry.isDirectory()) {
      collectFiles(fullPath, ignoreList, fileList);
    } else if (entry.isFile()) {
      // Include .js, .json, .env, .ts, etc.
      const ext = path.extname(entry.name).toLowerCase();
      const isEnv = entry.name.startsWith('.env');
      if (['.js', '.json', '.mjs', '.cjs', '.ts'].includes(ext) || isEnv) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

/**
 * Scan codebase files against forbidden patterns
 */
function scanCodebase(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const ignoreList = options.ignoreList || DEFAULT_IGNORES;
  const rules = options.rules || FORBIDDEN_RULES;

  // Specific target locations per project specification
  let filesToScan = [];
  if (options.files && Array.isArray(options.files)) {
    filesToScan = options.files;
  } else {
    // 1. server/src/
    const srcDir = path.join(rootDir, 'src');
    if (fs.existsSync(srcDir)) collectFiles(srcDir, ignoreList, filesToScan);

    // 2. server/scripts/
    const scriptsDir = path.join(rootDir, 'scripts');
    if (fs.existsSync(scriptsDir)) collectFiles(scriptsDir, ignoreList, filesToScan);

    // 3. server/*.js root scripts
    try {
      const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isEnv = entry.name.startsWith('.env');
          if (ext === '.js' || isEnv || entry.name === 'package.json') {
            const fullPath = path.join(rootDir, entry.name);
            const shouldIgnore = ignoreList.some(ig => entry.name === ig || fullPath.endsWith(ig));
            if (!shouldIgnore && !filesToScan.includes(fullPath)) {
              filesToScan.push(fullPath);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Deduplicate files
  filesToScan = Array.from(new Set(filesToScan));

  const violations = [];

  for (const filePath of filesToScan) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      continue;
    }

    const lines = content.split(/\r?\n/);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    lines.forEach((line, index) => {
      // Skip commented-out doc lines in this scanner itself if caught
      if (relPath.endsWith('verify_zero_wc.js')) return;

      for (const rule of rules) {
        if (rule.regex.test(line)) {
          violations.push({
            file: relPath,
            absolutePath: filePath,
            line: index + 1,
            ruleId: rule.id,
            ruleName: rule.name,
            content: line.trim()
          });
        }
      }
    });
  }

  return {
    scannedFilesCount: filesToScan.length,
    scannedFiles: filesToScan.map(f => path.relative(rootDir, f).replace(/\\/g, '/')),
    violationsCount: violations.length,
    violations,
    isClean: violations.length === 0
  };
}

// CLI Execution entry point
if (require.main === module) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
  console.log('======================================================');
  console.log('   Fifozone Zero-WooCommerce Codebase Audit Scanner   ');
  console.log('======================================================');
  console.log(`Scanning target: ${targetDir}\n`);

  const result = scanCodebase({ rootDir: targetDir });

  console.log(`Total files scanned: ${result.scannedFilesCount}`);

  if (result.isClean) {
    console.log('\n[PASS] 100% CLEAN: Zero legacy WooCommerce references found.');
    console.log('Codebase strictly adheres to Fifozone Universal OMS API.\n');
    process.exit(0);
  } else {
    console.error(`\n[FAIL] Found ${result.violationsCount} legacy WooCommerce reference(s):\n`);
    result.violations.forEach((v, i) => {
      console.error(`  ${i + 1}. [${v.ruleName}]`);
      console.error(`     File: ${v.file}:${v.line}`);
      console.error(`     Code: "${v.content}"\n`);
    });
    console.error('All references must be replaced with Fifozone Universal OMS endpoints.');
    process.exit(1);
  }
}

module.exports = {
  scanCodebase,
  collectFiles,
  FORBIDDEN_RULES,
  DEFAULT_IGNORES
};
