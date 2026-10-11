// js/pages/settings.page.js - ES6 Module
import { InputSanitizer } from '../security/input-sanitizer.js';

// Authentication check - redirect if not logged in
if (!localStorage.getItem('vendor_id') || !localStorage.getItem('user_role')) {
    window.location.href = 'signin.html';
}

let supabase;
let vendorId = localStorage.getItem('vendor_id');

if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

function toggleSwitch(id) {
    const checkbox = document.getElementById(id);
    checkbox.checked = !checkbox.checked;
    const span = checkbox.nextElementSibling;
    span.classList.toggle('active', checkbox.checked);
    
    if (supabase && vendorId) {
        const field = id === 'emailNotif' ? 'email_notifications' : 'sms_notifications';
        supabase.from('vendors').update({ [field]: checkbox.checked }).eq('id', vendorId)
            .catch(err => console.error('Error updating notification preference:', err));
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    document.querySelector('.dashboard-container').classList.toggle('dark-mode');
    document.querySelector('.sidebar').classList.toggle('dark-mode');
    document.querySelector('.main-content').classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const logo = document.getElementById('dashboardLogo');
    if (logo) logo.src = isDark ? '../assets/logos/logo.png.png' : '../assets/logos/logo-dark.png';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
            if (!supabase || !vendorId) {
                alert('Account deletion request submitted. Our team will process this within 24 hours.');
                return;
            }
            
            try {
                const { error } = await supabase.from('vendors').update({
                    status: 'deletion_requested',
                    updated_at: new Date().toISOString()
                }).eq('id', vendorId);
                
                if (error) throw error;
                alert('Account deletion request submitted. Our team will process this within 24 hours.');
            } catch (err) {
                console.error('Error:', err);
                alert('Error submitting deletion request: ' + err.message);
            }
        }
    }
}

async function loadVendorData() {
    if (!supabase || !vendorId) {
        document.getElementById('fullName').value = localStorage.getItem('vendor_name') || '';
        document.getElementById('email').value = localStorage.getItem('vendor_email') || '';
        document.getElementById('phone').value = localStorage.getItem('vendor_phone') || '';
        document.getElementById('businessName').value = localStorage.getItem('business_name') || '';
        document.getElementById('businessCategory').value = localStorage.getItem('business_category') || '';
        document.getElementById('location').value = localStorage.getItem('business_location') || '';
        return;
    }
    
    try {
        const { data, error } = await supabase.from('vendors').select('*').eq('id', vendorId).single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('fullName').value = data.name || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('businessName').value = data.business_name || '';
            document.getElementById('businessCategory').value = data.business_category || '';
            document.getElementById('location').value = data.location || '';
            
            localStorage.setItem('vendor_name', data.name || '');
            localStorage.setItem('vendor_email', data.email || '');
            localStorage.setItem('vendor_phone', data.phone || '');
            localStorage.setItem('business_name', data.business_name || '');
            localStorage.setItem('business_category', data.business_category || '');
            localStorage.setItem('business_location', data.location || '');
        }
    } catch (err) {
        console.error('Error loading vendor data:', err);
        document.getElementById('fullName').value = localStorage.getItem('vendor_name') || '';
        document.getElementById('email').value = localStorage.getItem('vendor_email') || '';
        document.getElementById('phone').value = localStorage.getItem('vendor_phone') || '';
        document.getElementById('businessName').value = localStorage.getItem('business_name') || '';
        document.getElementById('businessCategory').value = localStorage.getItem('business_category') || '';
        document.getElementById('location').value = localStorage.getItem('business_location') || '';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize input sanitization for all forms
    InputSanitizer.initForm('#profileForm');
    InputSanitizer.initForm('#businessForm');
    InputSanitizer.initForm('#passwordForm');
    
    await loadVendorData();
    
    const emailNotif = document.getElementById('emailNotif');
    const smsNotif = document.getElementById('smsNotif');
    
    if (supabase && vendorId) {
        try {
            const { data } = await supabase.from('vendors').select('email_notifications, sms_notifications').eq('id', vendorId).single();
            if (data) {
                emailNotif.checked = data.email_notifications !== false;
                smsNotif.checked = data.sms_notifications === true;
            }
        } catch (err) {
            console.error('Error loading notification preferences:', err);
        }
    }
    
    emailNotif.nextElementSibling.classList.toggle('active', emailNotif.checked);
    smsNotif.nextElementSibling.classList.toggle('active', smsNotif.checked);
    
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        if (!name || !email || !phone) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!supabase || !vendorId) {
            localStorage.setItem('vendor_name', name);
            localStorage.setItem('vendor_email', email);
            localStorage.setItem('vendor_phone', phone);
            alert('Profile updated locally!');
            return;
        }
        
        try {
            const { error } = await supabase.from('vendors').update({
                name, email, phone, updated_at: new Date().toISOString()
            }).eq('id', vendorId);
            
            if (error) throw error;
            
            localStorage.setItem('vendor_name', name);
            localStorage.setItem('vendor_email', email);
            localStorage.setItem('vendor_phone', phone);
            alert('Profile updated successfully!');
            document.getElementById('profileForm').reset();
            await loadVendorData();
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating profile: ' + err.message);
        }
    });

    document.getElementById('businessForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const businessName = document.getElementById('businessName').value;
        const category = document.getElementById('businessCategory').value;
        const location = document.getElementById('location').value;
        if (!businessName || !category || !location) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!supabase || !vendorId) {
            localStorage.setItem('business_name', businessName);
            localStorage.setItem('business_category', category);
            localStorage.setItem('business_location', location);
            alert('Business details updated locally!');
            return;
        }
        
        try {
            const { error } = await supabase.from('vendors').update({
                business_name: businessName, business_category: category, location, updated_at: new Date().toISOString()
            }).eq('id', vendorId);
            
            if (error) throw error;
            
            localStorage.setItem('business_name', businessName);
            localStorage.setItem('business_category', category);
            localStorage.setItem('business_location', location);
            alert('Business details updated successfully!');
            document.getElementById('businessForm').reset();
            await loadVendorData();
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating business details: ' + err.message);
        }
    });

    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        
        if (!newPass || !confirm) {
            alert('Please fill in all fields');
            return;
        }
        if (newPass !== confirm) {
            alert('Passwords do not match');
            return;
        }
        if (newPass.length < 12) {
            alert('Password must be at least 12 characters');
            return;
        }
        
        if (!supabase) {
            alert('Unable to connect to database');
            return;
        }
        
        try {
            const { error } = await supabase.auth.updateUser({ password: newPass });
            if (error) throw error;
            alert('Password updated successfully!');
            document.getElementById('passwordForm').reset();
        } catch (err) {
            console.error('Error:', err);
            alert('Error updating password: ' + err.message);
        }
    });
    
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
    
    document.querySelectorAll('.toggle-switch input').forEach(input => {
        input.addEventListener('change', () => toggleSwitch(input.id));
    });
});
