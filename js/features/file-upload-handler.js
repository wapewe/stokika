// Secure File Upload Handler using Supabase Storage
class FileUploadHandler {
    constructor() {
        this.supabase = null;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = {
            images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        };
        this.init();
    }

    async init() {
        this.supabase = initSupabase();
    }

    // Validate file before upload
    validateFile(file, allowedCategory = 'images') {
        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return { isValid: false, errors };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File size must be less than ${this.maxFileSize / 1024 / 1024}MB`);
        }

        // Check file type
        const allowed = this.allowedTypes[allowedCategory] || this.allowedTypes.images;
        if (!allowed.includes(file.type)) {
            errors.push(`File type not allowed. Allowed types: ${allowed.join(', ')}`);
        }

        // Check file name
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(file.name)) {
            errors.push('File name contains invalid characters');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Upload file to Supabase Storage
    async uploadFile(file, bucket = 'uploads', folder = '') {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('User not authenticated');
            }

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
            const fileName = `${user.id}/${folder}${timestamp}_${sanitizedName}`;

            // Upload to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return {
                success: true,
                path: data.path,
                url: urlData.publicUrl,
                fileName: sanitizedName
            };

        } catch (error) {
            console.error('Upload failed');
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete file from storage
    async deleteFile(filePath, bucket = 'uploads') {
        try {
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([filePath]);

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('Delete failed');
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get file URL
    getFileUrl(filePath, bucket = 'uploads') {
        const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return data.publicUrl;
    }

    // List user files
    async listUserFiles(folder = '', bucket = 'uploads') {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.supabase.storage
                .from(bucket)
                .list(`${user.id}/${folder}`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) throw error;

            return {
                success: true,
                files: data
            };

        } catch (error) {
            console.error('List files failed');
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create upload UI element
    createUploadButton(options = {}) {
        const {
            buttonText = 'Upload File',
            accept = 'image/*',
            onSuccess = () => {},
            onError = () => {},
            category = 'images'
        } = options;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';

        const button = document.createElement('button');
        button.textContent = buttonText;
        button.className = 'btn-upload';
        button.type = 'button';

        button.addEventListener('click', () => input.click());

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            button.disabled = true;
            button.textContent = 'Uploading...';

            const result = await this.uploadFile(file, 'uploads', '', category);

            button.disabled = false;
            button.textContent = buttonText;

            if (result.success) {
                onSuccess(result);
            } else {
                onError(result.error);
            }

            input.value = '';
        });

        const container = document.createElement('div');
        container.appendChild(button);
        container.appendChild(input);

        return container;
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    window.FileUploadHandler = new FileUploadHandler();
});
