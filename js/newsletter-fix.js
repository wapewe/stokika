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
                alert('Please enter your name.');
                return;
            }
            
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email address.');
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            try {
                // Use same Supabase client as contact form
                const { data, error } = await supabase
                    .from('newsletter_subscribers')
                    .insert([{
                        name: name.trim(),
                        email: email,
                        created_at: new Date().toISOString()
                    }]);
                
                if (error) {
                    if (error.code === '23505') {
                        alert('This email is already subscribed to our newsletter.');
                    } else {
                        throw error;
                    }
                } else {
                    alert('Successfully subscribed to newsletter!');
                    this.reset();
                }
            } catch (error) {
                console.error('Newsletter error:', error);
                alert('Something went wrong. Please try again.');
            }
            
            // Always reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }
});