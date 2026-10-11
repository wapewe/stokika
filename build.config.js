/**
 * esbuild Configuration for Stokika TypeScript Rebuild
 * 
 * Build system for compiling TypeScript to optimized JavaScript:
 * - TypeScript compilation
 * - Code splitting by page
 * - Tree-shaking (removing unused code)
 * - Minification for production
 * - Source maps for debugging
 * 
 * Requirements: 25.1, 25.4, 25.5, 25.6
 * 
 * Usage:
 * npm run build        # Production build (minified)
 * npm run build:dev    # Development build (readable)
 * npm run watch        # Watch mode for development
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Determine if this is a production build
const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv[2] === 'watch';

// Entry points - one per page for code splitting (Requirement 25.6)
// Each page gets its own bundle, reducing initial load time
const entryPoints = {
    // Public pages
    'main': 'src/main.ts',
    
    // Authentication pages
    'signin': 'src/pages/signin.page.ts',
    'reset-password': 'src/pages/reset-password.page.ts',
    'setup-admin': 'src/pages/setup-admin.page.ts',
    
    // Vendor pages
    'vendor-dashboard': 'src/pages/vendor-dashboard.page.ts',
    'vendor-shop': 'src/pages/vendor-shop.page.ts',
    'vendor-shops-directory': 'src/pages/vendor-shops-directory.page.ts',
    'stock-request': 'src/pages/stock-request.page.ts',
    
    // Supplier pages
    'supplier': 'src/pages/supplier.page.ts',
    'suppliers': 'src/pages/suppliers.page.ts',
    'inventory': 'src/pages/inventory.page.ts',
    
    // Field Agent pages
    'agent': 'src/pages/agent.page.ts',
    'field-agent': 'src/pages/field-agent.page.ts',
    
    // Supervisor pages
    'supervisor': 'src/pages/supervisor.page.ts',
    'supervisor-onboarding': 'src/pages/supervisor-onboarding.page.ts',
    
    // Admin pages
    'admin-dashboard': 'src/pages/admin-dashboard.page.ts',
    'analytics': 'src/pages/analytics.page.ts',
    'settings': 'src/pages/settings.page.ts',
    
    // Onboarding pages
    'onboarding': 'src/pages/onboarding.page.ts',
    
    // Vendor registration
    'vendor-registration': 'src/features/vendor-registration/index.ts',
    
    // Payment pages
    'payment': 'src/pages/payment.page.ts',
    'payments': 'src/pages/payments.page.ts',
    'kit-payment': 'src/pages/kit-payment.page.ts',
    
    // Order pages
    'orders': 'src/pages/orders.page.ts',
    
    // Job portal page
    'jobs': 'src/pages/jobs.page.ts',
    
    // Marketing pages
    'dalana': 'src/pages/dalana.page.ts',
    'rembrandts': 'src/pages/rembrandts.page.ts',
    
    // Legal pages
    'terms': 'src/pages/terms.page.ts',
    'privacy': 'src/pages/privacy.page.ts',
    'compliance': 'src/pages/compliance.page.ts',
    'cookies': 'src/pages/cookies.page.ts',
};

// Base configuration
const baseConfig = {
    entryPoints,
    
    // Output directory (Requirement 1.2)
    outdir: 'dist',
    
    // Bundle all imports into output files (Requirement 25.4)
    bundle: true,
    
    // Enable tree-shaking to remove unused code (Requirement 25.4)
    treeShaking: true,
    
    // Target ES2017 for browser compatibility (Requirement 25.7)
    target: ['es2017'],
    
    // Format for browser (IIFE - Immediately Invoked Function Expression)
    format: 'iife',
    
    // Platform
    platform: 'browser',
    
    // Resolve TypeScript path aliases from tsconfig.json
    tsconfig: './tsconfig.json',
    
    // Legal comments
    legalComments: 'none',
    
    // Charset
    charset: 'utf8',
    
    // Code splitting - extract common modules into shared chunks
    splitting: false, // Can't use with IIFE format, but tree-shaking still works
    
    // Loader configuration
    loader: {
        '.ts': 'ts',
        '.json': 'json',
    },
    
    // Define environment for dead code elimination
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
};

// Production configuration (Requirement 25.5)
const productionConfig = {
    ...baseConfig,
    minify: true,            // Minify for production (Requirement 25.5)
    sourcemap: true,         // Generate source maps (Requirement 1.7, 25.3)
    drop: ['console', 'debugger'], // Remove console.log and debugger statements
    pure: ['console.log'],   // Mark console.log as pure for elimination
};

// Development configuration
const developmentConfig = {
    ...baseConfig,
    minify: false,           // Don't minify for development (readable code)
    sourcemap: 'inline',     // Inline source maps for easier debugging
};

// Build function
async function build() {
    try {
        const config = isProduction ? productionConfig : developmentConfig;
        
        console.log(`🔨 Building Stokika TypeScript (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})...\n`);
        
        const startTime = Date.now();
        
        // Create dist directory if it doesn't exist
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist', { recursive: true });
        }
        
        // Build with esbuild
        const result = await esbuild.build({
            ...config,
            metafile: true, // Generate metadata for analysis
        });
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        // Display results
        console.log('✅ Build successful!\n');
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📦 Output: dist/\n`);
        
        // Display bundle sizes
        if (result.metafile) {
            console.log('📊 Bundle sizes:');
            const outputs = Object.entries(result.metafile.outputs)
                .filter(([file]) => file.endsWith('.js'))
                .sort((a, b) => b[1].bytes - a[1].bytes);
            
            let totalSize = 0;
            for (const [file, info] of outputs) {
                const sizeKB = (info.bytes / 1024).toFixed(2);
                totalSize += info.bytes;
                console.log(`   ${path.basename(file).padEnd(40)} ${sizeKB.padStart(8)} KB`);
            }
            
            console.log(`   ${'─'.repeat(50)}`);
            console.log(`   ${'Total'.padEnd(40)} ${(totalSize / 1024).toFixed(2).padStart(8)} KB\n`);
        }
        
        // Display build mode
        console.log(`🎯 Build mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
        console.log(`🌳 Tree-shaking: ENABLED`);
        console.log(`📦 Code splitting: Per-page bundles`);
        console.log(`🗜️  Minification: ${isProduction ? 'ENABLED' : 'DISABLED'}`);
        console.log(`🗺️  Source maps: ${isProduction ? 'EXTERNAL' : 'INLINE'}\n`);
        
        if (isProduction) {
            console.log('✨ Production build complete! Ready for deployment to cPanel.\n');
            console.log('Next steps:');
            console.log('1. Update HTML files to reference compiled JS from /dist');
            console.log('2. Upload /dist directory to cPanel');
            console.log('3. Verify environment variables are configured in cPanel\n');
        } else {
            console.log('✨ Development build complete!\n');
        }
        
    } catch (error) {
        console.error('❌ Build failed:');
        
        if (error.errors && error.errors.length > 0) {
            for (const err of error.errors) {
                console.error(`\n${err.location ? `${err.location.file}:${err.location.line}:${err.location.column}` : 'Unknown location'}`);
                console.error(`  ${err.text}`);
                if (err.detail) {
                    console.error(`  ${err.detail}`);
                }
            }
        } else {
            console.error(error);
        }
        
        process.exit(1);
    }
}

// Watch function for development (Requirement 25.10)
async function watch() {
    try {
        console.log('👀 Watching for TypeScript changes...\n');
        console.log('Configuration:');
        console.log('  - Auto-rebuild on file changes');
        console.log('  - Source maps: inline');
        console.log('  - Minification: disabled');
        console.log('  - Tree-shaking: enabled\n');
        
        const context = await esbuild.context({
            ...developmentConfig,
            logLevel: 'info',
        });
        
        await context.watch();
        
        console.log('✅ Watching enabled. Press Ctrl+C to stop.\n');
        
        // Keep process alive
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Watch failed:', error);
        process.exit(1);
    }
}

// Main execution
if (isWatch) {
    watch();
} else {
    build();
}
