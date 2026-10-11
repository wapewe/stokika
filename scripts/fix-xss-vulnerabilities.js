#!/usr/bin/env node

/**
 * XSS Vulnerability Auto-Fix Script
 * 
 * This script helps identify and fix common XSS vulnerabilities
 * Run: node scripts/fix-xss-vulnerabilities.js
 * 
 * ⚠️ WARNING: Review all changes manually before committing
 */

const fs = require('fs');
const path = require('path');

// Configuration
const JS_DIR = path.join(__dirname, '..', 'js');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', `xss-fix-${Date.now()}`);

// Patterns to detect
const DANGEROUS_PATTERNS = [
    {
        name: 'innerHTML assignment',
        pattern: /\.innerHTML\s*=\s*([^;]+)/g,
        severity: 'HIGH',
        isSafe: (match, content) => {
            const assignment = match[1];
            // Safe if using XSSProtection methods
            if (assignment.includes('XSSProtection.sanitize(') ||
                assignment.includes('XSSProtection.safeTemplate(')) {
                return true;
            }
            // Safe if all template variables are escaped
            const hasUnsanitizedVars = assignment.match(/\$\{(?!XSSProtection\.escapeHtml\()[^}]+\}/);
            if (assignment.includes('${') && !hasUnsanitizedVars) {
                return true;
            }
            return false;
        }
    },
    {
        name: 'insertAdjacentHTML',
        pattern: /\.insertAdjacentHTML\([^)]+\)/g,
        severity: 'HIGH',
        isSafe: (match, content) => {
            const call = match[0];
            return call.includes('XSSProtection.sanitize(') || 
                   call.includes('XSSProtection.safeTemplate(');
        }
    },
    {
        name: 'document.write',
        pattern: /document\.write\([^)]+\)/g,
        severity: 'CRITICAL',
        isSafe: () => false
    },
    {
        name: 'eval() usage',
        pattern: /eval\([^)]+\)/g,
        severity: 'CRITICAL',
        isSafe: () => false
    }
];

// Statistics
let stats = {
    filesScanned: 0,
    filesWithIssues: 0,
    issuesFound: 0,
    issuesByType: {},
    issuesBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
};

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    DANGEROUS_PATTERNS.forEach(({ name, pattern, severity, isSafe }) => {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
            // Skip if pattern has a safety check and it passes
            if (isSafe && isSafe(match, content)) {
                continue;
            }
            
            issues.push({
                type: name,
                severity,
                line: content.substring(0, match.index).split('\n').length,
                code: match[0].substring(0, 100) + (match[0].length > 100 ? '...' : ''),
                index: match.index
            });

            stats.issuesFound++;
            stats.issuesByType[name] = (stats.issuesByType[name] || 0) + 1;
            stats.issuesBySeverity[severity]++;
        }
    });

    return issues;
}

function generateReport(results) {
    console.log('\n' + '='.repeat(70));
    console.log('XSS VULNERABILITY SCAN REPORT');
    console.log('='.repeat(70) + '\n');

    console.log(`📊 Summary:`);
    console.log(`   Files scanned: ${stats.filesScanned}`);
    console.log(`   Files with issues: ${stats.filesWithIssues}`);
    console.log(`   Total issues: ${stats.issuesFound}\n`);

    console.log(`🚨 Issues by Severity:`);
    console.log(`   CRITICAL: ${stats.issuesBySeverity.CRITICAL}`);
    console.log(`   HIGH: ${stats.issuesBySeverity.HIGH}`);
    console.log(`   MEDIUM: ${stats.issuesBySeverity.MEDIUM}`);
    console.log(`   LOW: ${stats.issuesBySeverity.LOW}\n`);

    console.log(`📝 Issues by Type:`);
    Object.entries(stats.issuesByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });

    console.log('\n' + '-'.repeat(70) + '\n');

    // Detailed results
    results.forEach(({ file, issues }) => {
        if (issues.length === 0) return;

        console.log(`\n📄 ${file}`);
        console.log(`   ${issues.length} issue(s) found:\n`);

        issues.forEach((issue, index) => {
            const emoji = issue.severity === 'CRITICAL' ? '🔴' : 
                         issue.severity === 'HIGH' ? '🟠' : 
                         issue.severity === 'MEDIUM' ? '🟡' : '🟢';
            
            console.log(`   ${index + 1}. ${emoji} ${issue.severity} - ${issue.type}`);
            console.log(`      Line ${issue.line}: ${issue.code}`);
        });
    });

    console.log('\n' + '='.repeat(70));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(70) + '\n');

    console.log(`1. Review SECURITY_XSS_MITIGATION_GUIDE.md for fixing instructions`);
    console.log(`2. Include js/xss-protection.js in all HTML pages`);
    console.log(`3. Replace innerHTML with textContent or sanitize() helper`);
    console.log(`4. Test all changes with XSS payloads`);
    console.log(`5. Consider implementing Content Security Policy (CSP)\n`);

    // Export to JSON
    const reportPath = path.join(__dirname, '..', 'xss-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        stats,
        results
    }, null, 2));

    console.log(`📊 Full report saved to: ${reportPath}\n`);
}

function main() {
    console.log('🔍 Scanning JavaScript files for XSS vulnerabilities...\n');

    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Scan all JS files
    const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
    const results = [];

    files.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        stats.filesScanned++;

        console.log(`Scanning: ${file}...`);

        try {
            const issues = scanFile(filePath);
            
            if (issues.length > 0) {
                stats.filesWithIssues++;
                results.push({ file, issues });

                // Create backup
                const backupPath = path.join(BACKUP_DIR, file);
                fs.copyFileSync(filePath, backupPath);
            }
        } catch (error) {
            console.error(`Error scanning ${file}:`, error.message);
        }
    });

    generateReport(results);
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { scanFile, generateReport };
