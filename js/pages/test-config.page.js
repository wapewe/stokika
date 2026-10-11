/**
 * Test Configuration Page Module
 * Tests configuration loading and Supabase connectivity
 */

// Display environment info
function displayEnvironmentInfo() {
  document.getElementById('protocol').textContent = window.location.protocol;
  document.getElementById('hostname').textContent = window.location.hostname || 'N/A';
  document.getElementById('port').textContent = window.location.port || 'default';
  
  const isLocal = window.location.protocol === 'file:' || 
                 (window.location.hostname === 'localhost' && !window.location.port);
  document.getElementById('mode').textContent = isLocal ? 'Local (Fallback)' : 'Server (Edge Function)';
}

async function testConfig() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '<div class="status info"><h3>Testing...</h3></div>';

  try {
    // Test 1: Load config
    const config = await window.ConfigLoader.loadConfig();
    
    let html = '<div class="status success">';
    html += '<h3>✅ Configuration Loaded Successfully</h3>';
    html += '<pre>' + JSON.stringify(config, null, 2) + '</pre>';
    html += '</div>';

    // Test 2: Initialize Supabase
    if (window.supabase) {
      const client = window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey
      );

      html += '<div class="status success">';
      html += '<h3>✅ Supabase Client Created</h3>';
      html += '<p>Client initialized successfully</p>';
      html += '</div>';

      // Test 3: Test connection
      try {
        const { data, error } = await client.from('users').select('count').limit(1);
        
        if (error) {
          html += '<div class="status error">';
          html += '<h3>⚠️ Database Connection Test</h3>';
          html += '<p>Error: ' + error.message + '</p>';
          html += '<p><small>This is normal if RLS policies are strict</small></p>';
          html += '</div>';
        } else {
          html += '<div class="status success">';
          html += '<h3>✅ Database Connection Test</h3>';
          html += '<p>Successfully connected to database</p>';
          html += '</div>';
        }
      } catch (dbError) {
        html += '<div class="status error">';
        html += '<h3>⚠️ Database Connection Test</h3>';
        html += '<p>Error: ' + dbError.message + '</p>';
        html += '</div>';
      }
    } else {
      html += '<div class="status error">';
      html += '<h3>❌ Supabase Library Not Loaded</h3>';
      html += '<p>Include Supabase CDN script</p>';
      html += '</div>';
    }

    resultsDiv.innerHTML = html;

  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="status error">
        <h3>❌ Configuration Loading Failed</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}

// Make testConfig available globally for the button onclick
window.testConfig = testConfig;

// Auto-run test on page load
window.addEventListener('load', () => {
  displayEnvironmentInfo();
  setTimeout(testConfig, 500);
});
