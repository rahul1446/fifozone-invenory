/**
 * verify_zero_wc.test.js
 * 
 * Test suite for the Zero-WooCommerce scanner script (server/scripts/verify_zero_wc.js).
 * Validates detection rules, boundary/exclusion behavior, clean directory passes,
 * and CLI execution.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const {
  scanCodebase,
  collectFiles,
  FORBIDDEN_RULES,
  DEFAULT_IGNORES
} = require('../scripts/verify_zero_wc');

describe('Zero-WooCommerce Scanner (verify_zero_wc.js)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-scan-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  describe('Rule Pattern Detection', () => {
    test('WC_V3_ENDPOINT detects direct and url-based wc/v3 calls', () => {
      const rule = FORBIDDEN_RULES.find(r => r.id === 'WC_V3_ENDPOINT');
      expect(rule).toBeDefined();

      expect(rule.regex.test("version: 'wc/v3'")).toBe(true);
      expect(rule.regex.test("endpoint = '/wp-json/wc/v3/products'")).toBe(true);
      expect(rule.regex.test("https://example.com/wp-json/wc/v3/orders")).toBe(true);
      expect(rule.regex.test("https://fifozone.com/wp-json/oms/v1/products")).toBe(false);
    });

    test('WC_REST_PACKAGE detects legacy npm package imports', () => {
      const rule = FORBIDDEN_RULES.find(r => r.id === 'WC_REST_PACKAGE');
      expect(rule).toBeDefined();

      expect(rule.regex.test("const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;")).toBe(true);
      expect(rule.regex.test('"@woocommerce/woocommerce-rest-api": "^1.0.2"')).toBe(true);
      expect(rule.regex.test("const FifozoneOmsService = require('./fifozoneOms.service');")).toBe(false);
    });

    test('WC_CLIENT_INSTANTIATION detects new WooCommerceRestApi calls', () => {
      const rule = FORBIDDEN_RULES.find(r => r.id === 'WC_CLIENT_INSTANTIATION');
      expect(rule).toBeDefined();

      expect(rule.regex.test("const client = new WooCommerceRestApi({ url: '...' });")).toBe(true);
      expect(rule.regex.test("return new WooCommerceRestApi({")).toBe(true);
      expect(rule.regex.test("const client = axios.create({")).toBe(false);
    });

    test('WC_CONSUMER_KEY and WC_CONSUMER_SECRET detect legacy auth keys', () => {
      const keyRule = FORBIDDEN_RULES.find(r => r.id === 'WC_CONSUMER_KEY');
      const secretRule = FORBIDDEN_RULES.find(r => r.id === 'WC_CONSUMER_SECRET');

      expect(keyRule.regex.test("WOOCOMMERCE_CONSUMER_KEY=ck_12345")).toBe(true);
      expect(keyRule.regex.test("process.env.WOOCOMMERCE_CONSUMER_KEY")).toBe(true);
      expect(keyRule.regex.test("FIFOZONE_OMS_API_KEY=oms_live_123")).toBe(false);

      expect(secretRule.regex.test("WOOCOMMERCE_CONSUMER_SECRET=cs_67890")).toBe(true);
      expect(secretRule.regex.test("process.env.WOOCOMMERCE_CONSUMER_SECRET")).toBe(true);
    });
  });

  describe('Directory & File Scanning Behavior', () => {
    test('returns clean result on directory with purely Fifozone OMS code', () => {
      const cleanFile = path.join(tempDir, 'cleanService.js');
      fs.writeFileSync(cleanFile, `
        const axios = require('axios');
        class FifozoneOmsService {
          constructor() {
            this.baseURL = 'https://fifozone.com/wp-json/oms/v1';
            this.apiKey = 'oms_live_9f8d2b7e61a4c035824e87901bcdf562';
          }
          getClient() {
            return axios.create({ baseURL: this.baseURL });
          }
        }
        module.exports = new FifozoneOmsService();
      `);

      const result = scanCodebase({ rootDir: tempDir });
      expect(result.isClean).toBe(true);
      expect(result.violationsCount).toBe(0);
      expect(result.violations).toHaveLength(0);
      expect(result.scannedFilesCount).toBe(1);
    });

    test('flags all occurrences and records precise file, line and ruleId on dirty files', () => {
      const dirtyFile = path.join(tempDir, 'legacyService.js');
      fs.writeFileSync(dirtyFile, [
        "const axios = require('axios');", // line 1
        "const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;", // line 2 (WC_REST_PACKAGE)
        "const key = process.env.WOOCOMMERCE_CONSUMER_KEY;", // line 3 (WC_CONSUMER_KEY)
        "const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET;", // line 4 (WC_CONSUMER_SECRET)
        "const client = new WooCommerceRestApi({", // line 5 (WC_CLIENT_INSTANTIATION)
        "  version: 'wc/v3'", // line 6 (WC_V3_ENDPOINT)
        "});" // line 7
      ].join('\n'));

      const result = scanCodebase({ rootDir: tempDir });
      expect(result.isClean).toBe(false);
      expect(result.violationsCount).toBe(5);

      const ruleIds = result.violations.map(v => v.ruleId);
      expect(ruleIds).toContain('WC_REST_PACKAGE');
      expect(ruleIds).toContain('WC_CONSUMER_KEY');
      expect(ruleIds).toContain('WC_CONSUMER_SECRET');
      expect(ruleIds).toContain('WC_CLIENT_INSTANTIATION');
      expect(ruleIds).toContain('WC_V3_ENDPOINT');

      const pkgViolation = result.violations.find(v => v.ruleId === 'WC_REST_PACKAGE');
      expect(pkgViolation.line).toBe(2);

      const endpointViolation = result.violations.find(v => v.ruleId === 'WC_V3_ENDPOINT');
      expect(endpointViolation.line).toBe(6);
    });

    test('ignores node_modules and .git folders', () => {
      const nodeModulesDir = path.join(tempDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.writeFileSync(path.join(nodeModulesDir, 'index.js'), "version: 'wc/v3'");

      const gitDir = path.join(tempDir, '.git', 'hooks');
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, 'hook.js'), "new WooCommerceRestApi()");

      // Also create one clean root file
      fs.writeFileSync(path.join(tempDir, 'clean.js'), "console.log('clean');");

      const result = scanCodebase({ rootDir: tempDir });
      expect(result.isClean).toBe(true);
      expect(result.violationsCount).toBe(0);
    });
  });

  describe('CLI Invocation', () => {
    const scannerScript = path.resolve(__dirname, '..', 'scripts', 'verify_zero_wc.js');

    test('CLI exits with code 0 on a clean directory', () => {
      fs.writeFileSync(path.join(tempDir, 'clean.js'), "const oms = 'https://fifozone.com/wp-json/oms/v1';");
      
      const stdout = execFileSync('node', [scannerScript, tempDir], { encoding: 'utf8' });
      expect(stdout).toContain('[PASS] 100% CLEAN');
      expect(stdout).toContain('Zero legacy WooCommerce references found');
    });

    test('CLI exits with code 1 on a directory containing legacy WC references', () => {
      fs.writeFileSync(path.join(tempDir, 'dirty.js'), "const wc = 'wc/v3';");

      expect(() => {
        execFileSync('node', [scannerScript, tempDir], { encoding: 'utf8', stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('Codebase Audit Diagnostic', () => {
    test('scans server root and returns structured diagnostic', () => {
      const serverDir = path.resolve(__dirname, '..');
      const result = scanCodebase({ rootDir: serverDir });

      expect(result).toHaveProperty('scannedFilesCount');
      expect(result.scannedFilesCount).toBeGreaterThan(0);
      expect(Array.isArray(result.violations)).toBe(true);

      // Audit information for developer visibility
      if (result.violations.length > 0) {
        console.log(`[Zero-WC Codebase Audit] Found ${result.violations.length} references pending Milestone 3 migration.`);
      }

      // If STRICT_ZERO_WC is set, enforce zero violations
      if (process.env.STRICT_ZERO_WC === 'true') {
        expect(result.violationsCount).toBe(0);
      }
    });
  });
});
