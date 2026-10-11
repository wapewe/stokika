#!/usr/bin/env node

/**
 * Update All HTML Files with Security Scripts
 * Adds security scripts and removes deprecated load-env.js
 */

const fs = require('fs');
const path = require('path');

const SECURITY_SCRIPTS = `    <!-- Security Scripts -->
    <script src="js/config-loader.js"></script>
    <script src="js/xss-protection.js"></script>
    <script src="js/secure-session.js"></script>
    <script src="js/csrf-protection.js"></script>`;

let stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0
};

function updateHTMLFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Check if security scripts already present
        if (content.includes('js/xss-protection.js') && 
            content.includes('js/secure-session.js') && 
            content.includes('js/csrf-protection.js')) {
            console.log(`✓ Skipped (already updated): ${path.basename(filePath)}`);
            stats.skipped++;
            return;
        }

        // Remove deprecated load-env.js
        if (content.includes('js/load-env.js')) {
            content = content.replace(/<script\s+src=["']js\/load-env\.js["']><\/script>\s*/g, '');
            modified = true;
        }

        // Remove deprecated supabase-config.js references
        if (content.includes('../config/supabase-config.js') || content.includes('js/supabase-config.js')) {
            content = content.replace(/<script\s+src=["'](?:\.\.\/config\/|js\/)supabase-config\.js["']><\/script>\s*/g, '');
            modified = true;
        }

        // Add security scripts before </body> if not present
        if (content.includes('</body>')) {
            // Find the position before </body>
            const bodyCloseIndex = content.lastIndexOf('</body>');
            
            // Check if Supabase CDN is already loaded
            const hasSupabase = content.includes('@supabase/supabase-js');
            
            // Build the scripts section
            let scriptsToAdd = SECURITY_SCRIPTS;
            
            // If Supabase isn't loaded yet, add it
            if (!hasSupabase) {
                scriptsToAdd = `    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n` + scriptsToAdd;
            }
            
            // Insert before </body>
            content = content.slice(0, bodyCloseIndex) + scriptsToAdd + '\n' + content.slice(bodyCloseIndex);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${path.basename(filePath)}`);
            stats.updated++;
        } else {
            console.log(`- No changes needed: ${path.basename(filePath)}`);
            stats.skipped++;
        }

        stats.processed++;
    } catch (error) {
        console.error(`✗ Error processing ${path.basename(filePath)}:`, error.message);
        stats.errors++;
    }
}

function main() {
    console.log('🔄 Updating HTML files with security scripts...\n');

    // Read HTML files from current directory
    const htmlFiles = fs.readdirSync(process.cwd())
        .filter(f => f.endsWith('.html'))
        .map(f => path.join(process.cwd(), f));

    console.log(`Found ${htmlFiles.length} HTML files\n`);

    htmlFiles.forEach(updateHTMLFile);

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Files processed: ${stats.processed}`);
    console.log(`Files updated: ${stats.updated}`);
    console.log(`Files skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(70));
    
    if (stats.updated > 0) {
        console.log('\n✅ HTML files updated successfully!');
        console.log('\nNext steps:');
        console.log('1. Test all pages to ensure scripts load correctly');
        console.log('2. Check browser console for any errors');
        console.log('3. Verify forms still work with CSRF protection');
    }
}

if (require.main === module) {
    main();
}

module.exports = { updateHTMLFile };
