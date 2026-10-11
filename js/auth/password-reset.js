// Password Reset System
class PasswordReset {
    constructor() {
        this.supabase = null;
    }

    init() {
        this.supabase = initSupabase();
        if (!this.supabase) {
            console.error('Supabase not initialized');
            return false;
        }
        return true;
    }

    async sendResetLink(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;
            return { success: true, message: 'Password reset link sent to your email' };
        } catch (error) {
            console.error('Error sending reset link:', error);
            return { success: false, message: error.message };
        }
    }

    async resetPassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            console.error('Error resetting password:', error);
            return { success: false, message: error.message };
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Verify current password by attempting to sign in
            const { error: signInError } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) throw new Error('Current password is incorrect');

            // Update to new password
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            console.error('Error changing password:', error);
            return { success: false, message: error.message };
        }
    }

    async updateEmail(newEmail) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                email: newEmail
            });

            if (error) throw error;
            return { success: true, message: 'Email update initiated. Check your new email for verification link.' };
        } catch (error) {
            console.error('Error updating email:', error);
            return { success: false, message: error.message };
        }
    }
}

// Initialize on page load
let passwordResetInstance = null;

function initPasswordReset() {
    if (!passwordResetInstance) {
        passwordResetInstance = new PasswordReset();
        passwordResetInstance.init();
    }
    return passwordResetInstance;
}
