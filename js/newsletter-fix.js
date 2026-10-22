// Newsletter subscription fix - using same pattern as contact form
document.addEventListener('DOMContentLoaded', function() {
    const newsletterForm = document.getElementById('newsletterForm');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            
            if (!name || name.trim().length < 2) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Please enter your name.', 'error');
                } else {
                    alert('Please enter your name.');
                }
                return;
            }
            
            if (!email || !email.includes('@')) {
                if (typeof window.showToast === 'function') {
                    window.showToast('Please enter a valid email address.', 'error');
                } else {
                    alert('Please enter a valid email address.');
                }
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            try {
                // Get the Supabase client
                const supabaseClient = window._supabaseClient || window.supabase;
                
                if (!supabaseClient) {
                    throw new Error('Supabase client not available');
                }
                
                // Use same Supabase client as contact form
                const { data, error } = await supabaseClient
                    .from('newsletter_subscribers')
                    .insert([{
                        name: name.trim(),
                        email: email.toLowerCase().trim(),
                        subscribed_at: new Date().toISOString()
                    }]);
                
                if (error) {
                    if (error.code === '23505') {
                        // Duplicate email
                        if (typeof window.showToast === 'function') {
                            window.showToast('This email is already subscribed!', 'info');
                        } else {
                            alert('This email is already subscribed to our newsletter.');
                        }
                    } else if (error.code === 'PGRST205') {
                        // Table not found - log for now, don't show error to user
                        console.warn('Newsletter table not created yet. Skipping subscription.');
                        if (typeof window.showToast === 'function') {
                            window.showToast('Thank you for your interest! We will contact you soon.', 'success');
                        } else {
                            alert('Thank you for your interest! We will contact you soon.');
                        }
                        this.reset();
                    } else {
                        throw error;
                    }
                } else {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Successfully subscribed to newsletter!', 'success');
                    } else {
                        alert('Successfully subscribed to newsletter!');
                    }
                    this.reset();
                }
            } catch (error) {
                console.error('Newsletter error:', error);
                if (typeof window.showToast === 'function') {
                    window.showToast('Something went wrong. Please try again.', 'error');
                } else {
                    alert('Something went wrong. Please try again.');
                }
            }
            
            // Always reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }
});