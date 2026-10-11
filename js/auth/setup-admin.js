function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
}

// Check if admin already exists
window.addEventListener('load', async () => {
    try {
        const client = initSupabase();
        const { data, error } = await client
            .from('users')
            .select('email')
            .eq('email','stokikakenya@gmail.com')
            .eq('role', 'admin');
        
        if (data && data.length > 0) {
            showStatus('Admin user already exists. You can login directly.', 'success');
            document.getElementById('setupBtn').textContent = 'Admin Already Exists';
            document.getElementById('setupBtn').disabled = true;
        }
    } catch (error) {
        console.log('Admin check failed, continuing with setup');
    }
});

document.getElementById('setupBtn').addEventListener('click', async () => {
    const setupBtn = document.getElementById('setupBtn');
    setupBtn.disabled = true;
    setupBtn.textContent = 'Creating...';

    try {
        const adminEmail = 'stokikakenya@gmail.com';
        const adminPassword = '@123456789Rb!';

        // First create auth user
        const client = initSupabase();
        if (!client) throw new Error('Supabase not initialized');

        const { data: signUpData, error: signUpError } = await client.auth.signUp({
            email: adminEmail,
            password: adminPassword
        });

        if (signUpError && !signUpError.message.includes('already registered')) {
            throw signUpError;
        }

        // Get user ID (either from signup or existing user)
        let userId = signUpData?.user?.id;
        if (!userId) {
            const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword
            });
            if (signInError) throw signInError;
            userId = signInData.user.id;
        }

        // Insert into users table (will use the temporary policy)
        const { error: insertError } = await client
            .from('users')
            .insert([{
                id: userId,
                email: adminEmail,
                role: 'admin',
                user_type: 'admin',
                name: 'Admin User',
                status: 'active',
                created_at: new Date().toISOString()
            }]);

        if (insertError) {
            console.error('Insert error:', insertError);
            throw new Error('Failed to create admin record. Please run the admin-setup-policy.sql first.');
        }

        showStatus('Admin user created successfully! You can now login.', 'success');
        
        setTimeout(() => {
            window.location.href = 'rembrandts-donji.html';
        }, 2000);

    } catch (error) {
        console.error('Setup error:', error);
        showStatus(error.message, 'error');
        setupBtn.disabled = false;
        setupBtn.textContent = 'Create Admin User';
    }
});
