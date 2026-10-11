// User Settings - Password & Email Management
class UserSettings {
    constructor() {
        this.supabase = null;
    }

    async init() {
        this.supabase = initSupabase();
        return !!this.supabase;
    }

    async sendPasswordReset(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async resetPassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: signInError } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });
            if (signInError) throw new Error('Current password is incorrect');

            const { error } = await this.supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async changeEmail(newEmail) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            const { error } = await this.supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            
            await this.supabase.from('users').update({ email: newEmail }).eq('id', user.id);
            return { success: true, message: 'Verification email sent to new address' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

function openSettingsModal() {
    let modal = document.getElementById('settingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';
        modal.innerHTML = XSSProtection.sanitize(`
            <div class="modal-content">
                <div class="modal-header">
  ...               <h2>Account Settings</h2>
                    <button class="close" onclick="document.getElementById('settingsModal').classList.remove('show')">&times;</button>
                </div>
                <div class="detail-section">
                    <h3>Change Email</h3>
                    <div class="form-group">
                        <input type="email" id="newEmail" placeholder="New email address">
                    </div>
                    <button class="btn-submit" onclick="handleEmailChange()">Update Email</button>
                </div>
                <div class="detail-section">
                    <h3>Change Password</h3>
                    <div class="form-group">
                        <input type="password" id="currentPwd" placeholder="Current password" minlength="8">
                    </div>
                    <div class="form-group">
                        <input type="password" id="newPwd" placeholder="New password" minlength="8">
                    </div>
                    <div class="form-group">
                        <input type="password" id="confirmPwd" placeholder="Confirm password" minlength="8">
                    </div>
                    <button class="btn-submit" onclick="handlePasswordChange()">Change Password</button>
                </div>
            </div>
        `);
        document.body.appendChild(modal);
    }
    modal.classList.add('show');
}

async function handleEmailChange() {
    const newEmail = document.getElementById('newEmail').value.trim();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        alert('Please enter a valid email');
        return;
    }
    const settings = new UserSettings();
    await settings.init();
    const result = await settings.changeEmail(newEmail);
    alert(result.success ? result.message : 'Error: ' + result.message);
    if (result.success) document.getElementById('newEmail').value = '';
}

async function handlePasswordChange() {
    const current = document.getElementById('currentPwd').value;
    const newPwd = document.getElementById('newPwd').value;
    const confirm = document.getElementById('confirmPwd').value;
    
    if (!current || !newPwd || !confirm) {
        alert('Please fill all fields');
        return;
    }
    if (newPwd.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }
    if (newPwd !== confirm) {
        alert('Passwords do not match');
        return;
    }
    
    const settings = new UserSettings();
    await settings.init();
    const result = await settings.changePassword(current, newPwd);
    alert(result.success ? 'Password changed successfully' : 'Error: ' + result.message);
    if (result.success) {
        document.getElementById('currentPwd').value = '';
        document.getElementById('newPwd').value = '';
        document.getElementById('confirmPwd').value = '';
    }
}
