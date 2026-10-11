/**
 * Check Admin Status Page Module
 * Verifies admin user status and permissions
 */

async function checkStatus() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '<div class="status"><h3>Checking...</h3></div>';

  try {
    const config = await window.ConfigLoader.loadConfig();
    const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

    // Check session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    let html = '';

    if (sessionError || !session) {
      html += '<div class="status error">';
      html += '<h3>❌ Not Logged In</h3>';
      html += '<p>You need to log in first</p>';
      html += '<button onclick="window.location.href=\'signin.html\'">Go to Login</button>';
      html += '</div>';
      resultsDiv.innerHTML = html;
      return;
    }

    html += '<div class="status success">';
    html += '<h3>✅ Session Active</h3>';
    html += '<p><strong>User ID:</strong> ' + session.user.id + '</p>';
    html += '<p><strong>Email:</strong> ' + session.user.email + '</p>';
    html += '</div>';

    // Check user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      html += '<div class="status error">';
      html += '<h3>❌ User Record Error</h3>';
      html += '<p>' + userError.message + '</p>';
      html += '<pre>' + JSON.stringify(userError, null, 2) + '</pre>';
      html += '</div>';
    } else if (!userData) {
      html += '<div class="status error">';
      html += '<h3>❌ User Record Not Found</h3>';
      html += '<p>No user record exists in the database</p>';
      html += '</div>';
    } else {
      const isAdmin = userData.user_type === 'admin' || userData.role === 'admin';
      
      if (isAdmin) {
        html += '<div class="status success">';
        html += '<h3>✅ Admin Access Granted</h3>';
      } else {
        html += '<div class="status warning">';
        html += '<h3>⚠️ Not an Admin</h3>';
      }
      
      html += '<p><strong>User Type:</strong> ' + (userData.user_type || 'null') + '</p>';
      html += '<p><strong>Role:</strong> ' + (userData.role || 'null') + '</p>';
      html += '<p><strong>Status:</strong> ' + (userData.status || 'null') + '</p>';
      html += '<pre>' + JSON.stringify(userData, null, 2) + '</pre>';
      
      if (!isAdmin) {
        html += '<p><strong>Fix:</strong> Run the SQL script in <code>config/setup-admin-metadata.sql</code></p>';
        html += '<button class="fix-btn" onclick="showFixInstructions()">Show Fix Instructions</button>';
      } else {
        html += '<button onclick="window.location.href=\'agent.html\'">Go to Admin Dashboard</button>';
      }
      
      html += '</div>';
    }

    resultsDiv.innerHTML = html;

  } catch (error) {
    resultsDiv.innerHTML = `
      <div class="status error">
        <h3>❌ Error</h3>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}

function showFixInstructions() {
  const instructions = `
    <div class="status warning">
      <h3>📝 How to Fix Admin Access</h3>
      <ol>
        <li>Go to your Supabase Dashboard</li>
        <li>Navigate to SQL Editor</li>
        <li>Run this SQL command (replace with your email):</li>
      </ol>
      <pre>UPDATE users 
SET user_type = 'admin', 
    role = 'admin', 
    status = 'active'
WHERE email = 'your-email@example.com';</pre>
      <button onclick="checkStatus()">Re-check Status</button>
    </div>
  `;
  document.getElementById('results').innerHTML += instructions;
}

// Make functions available globally
window.checkStatus = checkStatus;
window.showFixInstructions = showFixInstructions;

// Auto-run on load
window.addEventListener('load', () => {
  setTimeout(checkStatus, 500);
});
