#!/usr/bin/env node

/**
 * Safe Automated XSS Fixer
 * Intelligently fixes innerHTML assignments with proper sanitization
 */

const fs = require('fs');
const path = require('path');

// Load the scan report
const reportPath = path.join(process.cwd(), 'xss-scan-report.json');
if (!fs.existsSync(reportPath)) {
    console.error('❌ xss-scan-report.json not found. Run fix-xss-vulnerabilities.js first.');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Create backup directory
const backupDir = path.join(process.cwd(), 'backups', `xss-safe-fix-${Date.now()}`);
fs.mkdirSync(backupDir, { recursive: true });

console.log('🔧 Safe XSS Auto-Fixer\n');
console.log(`📊 Found ${report.stats.issuesFound} issues in ${report.stats.filesWithIssues} files\n`);

let fixedCount = 0;
let skippedCount = 0;
const modifications = [];

for (const fileResult of report.results) {
    const filePath = path.join(process.cwd(), 'js', fileResult.file);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${fileResult.file} - file not found`);
        continue;
    }
    
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Backup original file
    const backupPath = path.join(backupDir, fileResult.file);
    fs.writeFileSync(backupPath, originalContent, 'utf8');
    
    let fileFixed = 0;
    let fileSkipped = 0;
    
    // Sort issues by index in reverse order to maintain correct positions
    const sortedIssues = fileResult.issues.sort((a, b) => b.index - a.index);
    
    for (const issue of sortedIssues) {
        const { code, index, line } = issue;
        
        // Determine if this is safe to auto-fix
        const isSafeToFix = determineSafety(code, content, index);
        
        if (!isSafeToFix) {
            fileSkipped++;
            skippedCount++;
            continue;
        }
        
        // Apply fix based on pattern
        const fixResult = applyFix(content, code, index);
        
        if (fixResult.success) {
            content = fixResult.content;
            fileFixed++;
            fixedCount++;
            modifications.push({
                file: fileResult.file,
                line,
                original: code,
                fixed: fixResult.replacement
            });
        } else {
            fileSkipped++;
            skippedCount++;
        }
    }
    
    // Write fixed content if changes were made
    if (fileFixed > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${fileResult.file}: Fixed ${fileFixed}, Skipped ${fileSkipped}`);
    } else {
        console.log(`⏭️  ${fileResult.file}: All ${fileSkipped} issues require manual review`);
    }
}

console.log('\n' + '='.repeat(70));
console.log('📈 Summary:');
console.log(`✅ Auto-fixed: ${fixedCount} issues`);
console.log(`⚠️  Needs manual review: ${skippedCount} issues`);
console.log(`💾 Backups saved to: ${backupDir}`);
console.log('='.repeat(70));

// Write modification log
const logPath = path.join(backupDir, 'modifications.json');
fs.writeFileSync(logPath, JSON.stringify(modifications, null, 2), 'utf8');
console.log(`\n📝 Detailed changes logged to: ${logPath}\n`);

/**
 * Determine if an innerHTML assignment is safe to auto-fix
 */
function determineSafety(code, fileContent, index) {
    // Pattern 1: Static error/loading messages (SAFE)
    if (code.includes('Error loading') || 
        code.includes('Loading...') ||
        code.includes('No data') ||
        code.includes('no-data') ||
        code.includes('<div class="loading">') ||
        code.includes('<div class="error">')) {
        return true;
    }
    
    // Pattern 2: Simple template literals with only sanitize() calls (SAFE)
    if (code.includes('${sanitize(') && !code.includes('${') || 
        !code.match(/\$\{(?!sanitize\()[^}]+\}/)) {
        return true;
    }
    
    // Pattern 3: Modal innerHTML with complex nested structure (NEEDS MANUAL REVIEW)
    if (code.includes('modal.innerHTML') || code.includes('<div class="modal')) {
        return false;
    }
    
    // Pattern 4: Large table structures (NEEDS MANUAL REVIEW)
    if (code.includes('<table') || code.includes('<tbody')) {
        return false;
    }
    
    // Pattern 5: Complex templates with multiple interpolations (NEEDS MANUAL REVIEW)
    const interpolations = (code.match(/\$\{/g) || []).length;
    if (interpolations > 3) {
        return false;
    }
    
    // Pattern 6: innerHTML with function calls that might return HTML (NEEDS REVIEW)
    if (code.match(/\$\{[^}]*\([^)]*\)[^}]*\}/)) {
        return false;
    }
    
    // Default: Allow simple cases
    return interpolations <= 1;
}

/**
 * Apply appropriate fix to innerHTML assignment
 */
function applyFix(content, code, index) {
    // Fix Pattern 1: Static content - use textContent
    if (!code.includes('${') && !code.includes('+')) {
        // Extract the HTML content
        const match = code.match(/innerHTML\s*=\s*['"`]([^'"`]+)['"`]/);
        if (match) {
            const htmlContent = match[1];
            // If it's simple text, use textContent
            if (!htmlContent.includes('<')) {
                const replacement = code.replace(/\.innerHTML\s*=/, '.textContent =');
                content = content.substring(0, index) + replacement + content.substring(index + code.length);
                return { success: true, content, replacement };
            }
            
            // If it has simple HTML tags, wrap with XSSProtection.sanitize()
            const replacement = code.replace(
                /\.innerHTML\s*=\s*(['"`])([^'"`]+)\1/,
                '.innerHTML = XSSProtection.sanitize($1$2$1)'
            );
            content = content.substring(0, index) + replacement + content.substring(index + code.length);
            return { success: true, content, replacement };
        }
    }
    
    // Fix Pattern 2: Template literals with sanitize already - ensure all variables are sanitized
    if (code.includes('${sanitize(')) {
        // Already using sanitize, check if complete
        const unsanitized = code.match(/\$\{(?!sanitize\()([^}]+)\}/);
        if (unsanitized) {
            // Wrap unsanitized variables
            const replacement = code.replace(
                /\$\{(?!sanitize\()([^}]+)\}/g,
                '${XSSProtection.escapeHtml($1)}'
            );
            content = content.substring(0, index) + replacement + content.substring(index + code.length);
            return { success: true, content, replacement };
        }
        return { success: false };
    }
    
    // Fix Pattern 3: Simple template with variables - wrap entire template
    if (code.includes('`') && code.includes('${')) {
        const match = code.match(/\.innerHTML\s*=\s*`([^`]+)`/s);
        if (match) {
            const template = match[1];
            // Wrap all variables with escapeHtml
            const sanitized = template.replace(
                /\$\{([^}]+)\}/g,
                '${XSSProtection.escapeHtml($1)}'
            );
            const replacement = code.replace(/`[^`]+`/s, '`' + sanitized + '`');
            content = content.substring(0, index) + replacement + content.substring(index + code.length);
            return { success: true, content, replacement };
        }
    }
    
    return { success: false };
}
