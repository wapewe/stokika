function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

// Wait for Supabase config to load
async function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            resolve();
        } else {
            window.addEventListener('supabase-config-loaded', () => resolve());
        }
    });
}

// Check if admin already exists
window.addEventListener('load', async () => {
    try {
        await waitForSupabase();
        const client = initSupabase();
        if (!client) {
            console.log('Supabase not initialized yet');
            return;
        }

        // Check if admin exists by querying profiles joined with user_roles
        const { data, error } = await client
            .from('profiles')
            .select('email, user_roles!inner(role_name)')
            .eq('email', 'krieta8@gmail.com')
            .eq('user_roles.role_name', 'admin')
            .maybeSingle();
        
        if (data) {
            showStatus('Admin user already exists. You can login directly.', 'success');
            document.getElementById('setupBtn').textContent = 'Admin Already Exists';
            document.getElementById('setupBtn').disabled = true;
        }
    } catch (error) {
        console.log('Admin check failed, continuing with setup:', error);
    }
});

document.getElementById('setupBtn').addEventListener('click', async () => {
    const setupBtn = document.getElementById('setupBtn');
    setupBtn.disabled = true;
    setupBtn.textContent = 'Creating...';

    try {
        const adminEmail = 'sponyomjaka@gmail.com';
        const adminPassword = '@123456789Rb!';
        const adminName = 'System Administrator';
        const adminPhone = '254700000000'; // Default placeholder

        await waitForSupabase();
        const client = initSupabase();
        if (!client) throw new Error('Supabase not initialized');

        showStatus('Creating auth user...', 'info');

        // Step 1: Create auth user
        const { data: signUpData, error: signUpError } = await client.auth.signUp({
            email: adminEmail,
            password: adminPassword,
            options: {
                data: {
                    full_name: adminName
                }
            }
        });

        if (signUpError) {
            // If user already exists, try to sign in to get user ID
            if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
                showStatus('User exists, signing in...', 'info');
                const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
                    email: adminEmail,
                    password: adminPassword
                });
                
                if (signInError) {
                    throw new Error(`Cannot sign in: ${signInError.message}`);
                }
                
                if (!signInData?.user?.id) {
                    throw new Error('Could not get user ID from sign-in');
                }

                // User signed in, now insert profile
                await insertAdminProfile(client, signInData.user.id, adminEmail, adminName, adminPhone);
            } else {
                throw signUpError;
            }
        } else {
            // New user created successfully
            if (!signUpData?.user?.id) {
                throw new Error('User created but no user ID returned');
            }

            showStatus('Creating admin profile...', 'info');
            await insertAdminProfile(client, signUpData.user.id, adminEmail, adminName, adminPhone);
        }

        showStatus('✅ Admin user created successfully! Redirecting to login...', 'success');
        
        setTimeout(() => {
            window.location.href = 'rembrandts-donji.html';
        }, 2000);

    } catch (error) {
        console.error('Setup error:', error);
        let errorMessage = error.message || 'An unknown error occurred';
        
        // Provide helpful error messages
        if (errorMessage.includes('PGRST')) {
            errorMessage = 'Database error: Please ensure the migration has been applied. Run: supabase migration up';
        } else if (errorMessage.includes('not found')) {
            errorMessage = 'Setup not ready: Please apply the admin setup migration first';
        }
        
        showStatus(`❌ Error: ${errorMessage}`, 'error');
        setupBtn.disabled = false;
        setupBtn.textContent = 'Create Admin User';
    }
});

async function insertAdminProfile(client, userId, email, fullName, phoneNumber) {
    // Use the RPC function to insert admin profile
    const { data, error } = await client.rpc('insert_admin_profile', {
        p_user_id: userId,
        p_email: email,
        p_full_name: fullName,
        p_phone_number: phoneNumber
    });

    if (error) {
        console.error('Profile insert error:', error);
        throw new Error(`Failed to create admin profile: ${error.message}`);
    }

    if (data && !data.success) {
        console.error('Profile insert failed:', data);
        throw new Error(data.error || 'Failed to create admin profile');
    }

    console.log('Admin profile created:', data);
    return data;
}
