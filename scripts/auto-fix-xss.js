#!/usr/bin/env node

/**
 * Automatic XSS Fix Script
 * Automatically replaces unsafe innerHTML with safe alternatives
 * 
 * ⚠️ WARNING: This makes automatic changes. Review all changes before committing!
 * 
 * Run: node scripts/auto-fix-xss.js
 */

const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'js');
const BACKUP_DIR = path.join(__dirname, '..', 'backups', `xss-autofix-${Date.now()}`);

let stats = {
    filesProcessed: 0,
    filesModified: 0,
    replacementsMade: 0
};

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function fixFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = content;
    let changesMade = 0;

    // Backup original file
    const fileName = path.basename(filePath);
    const backupPath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(backupPath, content);

    // Pattern 1: Simple innerHTML with string literals (safe to convert to textContent)
    // element.innerHTML = 'text' -> element.textContent = 'text'
    const simpleStringPattern = /(\w+)\.innerHTML\s*=\s*(['"`])([^<>'"`]*)\2/g;
    modified = modified.replace(simpleStringPattern, (match, element, quote, text) => {
        if (!text.includes('<')) {
            changesMade++;
            return `${element}.textContent = ${quote}${text}${quote}`;
        }
        return match;
    });

    // Pattern 2: innerHTML with template literals containing user data
    // element.innerHTML = `<div>${data}</div>` -> element.innerHTML = `<div>${sanitize(data)}</div>`
    const templatePattern = /\.innerHTML\s*=\s*`([^`]*\$\{[^}]+\}[^`]*)`/g;
    modified = modified.replace(templatePattern, (match, content) => {
        //Only wrap variables that aren't already wrapped
        const wrapped = content.replace(/\$\{(?!sanitize\(|XSSProtection\.escapeHtml\()([^}]+)\}/g, '${sanitize($1)}');
        if (wrapped !== content) {
            changesMade++;
            return `.innerHTML = \`${wrapped}\``;
        }
        return match;
    });

    // Pattern 3: Direct user data assignment
    // element.innerHTML = userInput -> element.textContent = userInput
    const directPattern = /(\w+)\.innerHTML\s*=\s*(\w+(?:\.\w+)*)\s*;/g;
    modified = modified.replace(directPattern, (match, element, variable) => {
        // Skip if already sanitized or if it's a complex expression
        if (variable.includes('sanitize') || variable.includes('XSSProtection') || variable.includes('`')) {
            return match;
        }
        // Add comment suggesting review
        changesMade++;
        return `${element}.textContent = ${variable}; // XSS-FIX: Changed from innerHTML - Review if HTML is needed`;
    });

    // Pattern 4: Add sanitize() to concatenated strings
    const concatPattern = /\.innerHTML\s*=\s*([^;]+)\s*\+\s*(\w+(?:\.\w+)*)/g;
    modified = modified.replace(concatPattern, (match, before, variable) => {
        if (!match.includes('sanitize') && !match.includes('XSSProtection')) {
            changesMade++;
            return match.replace(variable, `sanitize(${variable})`);
        }
        return match;
    });

    if (changesMade > 0) {
        // Add XSSProtection import at the top if not present
        if (!modified.includes('XSSProtection') && !modified.includes('sanitize')) {
            const importComment = `// XSS Protection: Using sanitize() helper from xss-protection.js\n// Make sure xss-protection.js is loaded in your HTML file\n\n`;
            modified = importComment + modified;
        }

        fs.writeFileSync(filePath, modified);
        stats.filesModified++;
        stats.replacementsMade += changesMade;
        console.log(`✓ Fixed: ${fileName} (${changesMade} changes)`);
    } else {
        console.log(`- Skipped: ${fileName} (no fixable patterns found)`);
    }

    stats.filesProcessed++;
}

function main() {
    console.log('🔧 Starting automatic XSS fixes...\n');
    console.log(`Backups will be saved to: ${BACKUP_DIR}\n`);

    const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));

    files.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        try {
            fixFile(filePath);
        } catch (error) {
            console.error(`✗ Error processing ${file}:`, error.message);
        }
    });

    console.log('\n' + '='.repeat(70));
    console.log('AUTO-FIX SUMMARY');
    console.log('='.repeat(70));
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Files modified: ${stats.filesModified}`);
    console.log(`Total replacements: ${stats.replacementsMade}`);
    console.log(`\nBackups saved to: ${BACKUP_DIR}`);
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. Review all changes in your version control');
    console.log('2. Test all modified functionality');
    console.log('3. Manually fix complex innerHTML cases using SECURITY_XSS_MITIGATION_GUIDE.md');
    console.log('4. Run: node scripts/fix-xss-vulnerabilities.js to check remaining issues');
    console.log('='.repeat(70));
}

if (require.main === module) {
    main();
}

module.exports = { fixFile };
