// Comprehensive Onboarding System
class ComprehensiveOnboarding {
    constructor() {
        this.supabase = initSupabase();
    }

    // Initialize onboarding for new user
    async initializeOnboarding(userId, userType) {
        try {
            const { error } = await this.supabase.rpc('initialize_onboarding', {
                p_user_id: userId,
                p_user_type: userType
            });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error initializing onboarding:', error);
            return false;
        }
    }

    // Get onboarding progress
    async getOnboardingProgress(userId) {
        try {
            const { data, error } = await this.supabase.rpc('update_onboarding_progress', {
                p_user_id: userId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting onboarding progress:', error);
            return null;
        }
    }

    // Get onboarding steps
    async getOnboardingSteps(userId) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_steps')
                .select('*')
                .eq('user_id', userId)
                .order('step_order', { ascending: true });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting onboarding steps:', error);
            return [];
        }
    }

    // Update onboarding step
    async updateStep(userId, stepName, status, notes = null) {
        try {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };
            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }
            if (notes) {
                updateData.notes = notes;
            }

            const { error } = await this.supabase
                .from('onboarding_steps')
                .update(updateData)
                .eq('user_id', userId)
                .eq('step_name', stepName);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating step:', error);
            return false;
        }
    }

    // Get training modules
    async getTrainingModules(userType) {
        try {
            const { data, error } = await this.supabase
                .from('training_modules')
                .select('*')
                .eq('user_type', userType)
                .order('module_order', { ascending: true });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting training modules:', error);
            return [];
        }
    }

    // Get training progress
    async getTrainingProgress(userId) {
        try {
            const { data, error } = await this.supabase
                .from('training_progress')
                .select('*, training_modules(*)')
                .eq('user_id', userId);
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting training progress:', error);
            return [];
        }
    }

    // Start training module
    async startTraining(userId, moduleId) {
        try {
            const { error } = await this.supabase
                .from('training_progress')
                .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('module_id', moduleId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error starting training:', error);
            return false;
        }
    }

    // Complete training module
    async completeTraining(userId, moduleId, quizScore = null) {
        try {
            const updateData = {
                status: 'completed',
                progress_percentage: 100,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (quizScore !== null) {
                updateData.quiz_score = quizScore;
            }

            const { error } = await this.supabase
                .from('training_progress')
                .update(updateData)
                .eq('user_id', userId)
                .eq('module_id', moduleId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error completing training:', error);
            return false;
        }
    }

    // Upload document
    async uploadDocument(userId, documentType, file) {
        try {
            // Upload file to Supabase Storage
            const fileName = `${userId}/${documentType}_${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('onboarding-documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('onboarding-documents')
                .getPublicUrl(fileName);

            // Save document record
            const { error: dbError } = await this.supabase
                .from('onboarding_documents')
                .insert([{
                    user_id: userId,
                    document_type: documentType,
                    file_name: file.name,
                    file_url: urlData.publicUrl,
                    file_size: file.size,
                    mime_type: file.type,
                    verification_status: 'pending'
                }]);

            if (dbError) throw dbError;
            return true;
        } catch (error) {
            console.error('Error uploading document:', error);
            return false;
        }
    }

    // Get user documents
    async getDocuments(userId) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting documents:', error);
            return [];
        }
    }

    // Verify document (admin only)
    async verifyDocument(documentId, status, verifiedBy, rejectionReason = null) {
        try {
            const updateData = {
                verification_status: status,
                verified_by: verifiedBy,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { error } = await this.supabase
                .from('onboarding_documents')
                .update(updateData)
                .eq('id', documentId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error verifying document:', error);
            return false;
        }
    }

    // Create first assignment
    async createAssignment(userId, assignmentType, description, assignedBy, dueDate) {
        try {
            const { error } = await this.supabase
                .from('first_assignments')
                .insert([{
                    user_id: userId,
                    assignment_type: assignmentType,
                    assignment_description: description,
                    assigned_by: assignedBy,
                    due_date: dueDate,
                    status: 'assigned'
                }]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error creating assignment:', error);
            return false;
        }
    }

    // Get user assignments
    async getAssignments(userId) {
        try {
            const { data, error } = await this.supabase
                .from('first_assignments')
                .select('*')
                .eq('user_id', userId)
                .order('assigned_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting assignments:', error);
            return [];
        }
    }

    // Complete assignment
    async completeAssignment(assignmentId, completionNotes, rating = null) {
        try {
            const updateData = {
                status: 'completed',
                completed_at: new Date().toISOString(),
                completion_notes: completionNotes,
                updated_at: new Date().toISOString()
            };
            if (rating) {
                updateData.rating = rating;
            }

            const { error } = await this.supabase
                .from('first_assignments')
                .update(updateData)
                .eq('id', assignmentId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error completing assignment:', error);
            return false;
        }
    }

    // Add performance metric
    async addMetric(userId, metricName, metricValue, targetValue, notes = null) {
        try {
            const { error } = await this.supabase
                .from('onboarding_metrics')
                .insert([{
                    user_id: userId,
                    metric_name: metricName,
                    metric_value: metricValue,
                    target_value: targetValue,
                    notes: notes
                }]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error adding metric:', error);
            return false;
        }
    }

    // Get user metrics
    async getMetrics(userId) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_metrics')
                .select('*')
                .eq('user_id', userId)
                .order('metric_date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting metrics:', error);
            return [];
        }
    }

    // Send notification
    async sendNotification(userId, notificationType, title, message) {
        try {
            const { error } = await this.supabase
                .from('onboarding_notifications')
                .insert([{
                    user_id: userId,
                    notification_type: notificationType,
                    title: title,
                    message: message
                }]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    // Get user notifications
    async getNotifications(userId) {
        try {
            const { data, error } = await this.supabase
                .from('onboarding_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('sent_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    // Mark notification as read
    async markNotificationRead(notificationId) {
        try {
            const { error } = await this.supabase
                .from('onboarding_notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    // Get kit configuration (fetches from database, with updated price fallbacks)
    async getKitConfig(userType) {
        try {
            const { data, error } = await this.supabase
                .from('stokika_kit_config')
                .select('*')
                .eq('user_type', userType)
                .eq('is_active', true)
                .maybeSingle();
            if (!error && data) return data;
        } catch (error) {
            console.error('Error getting kit config from database:', error);
        }

        // Database fallback defaults: Vendor 1050, Field Agent 1550, Supervisor 3050
        const fallbacks = {
            field_agent: {
                user_type: 'field_agent',
                kit_amount: 1550.00,
                kit_items: ['Stokika Branded T-Shirt', 'ID Badge & Lanyard', 'Product Catalog', 'Order Forms', 'Branded Bag', 'Training Manual', 'Mobile App Access'],
                description: 'Complete starter kit for field agents'
            },
            supervisor: {
                user_type: 'supervisor',
                kit_amount: 3050.00,
                kit_items: ['Stokika Branded Polo Shirt', 'Supervisor ID Badge & Lanyard', 'Product Catalog', 'Order Forms', 'Branded Laptop Bag', 'Training Manual', 'Supervisor Handbook', 'Mobile App Access', 'Territory Management Tools'],
                description: 'Complete starter kit for supervisors'
            },
            vendor: {
                user_type: 'vendor',
                kit_amount: 1050.00,
                kit_items: ['Stokika Merchant Access', 'Vendor Starter Materials', 'Product Placement Guide', 'Digital Payment Setup', 'Merchant Support'],
                description: 'Vendor onboarding and platform activation fee'
            }
        };

        return fallbacks[userType] || null;
    }

    // Submit kit payment (supports both userId and applicationCode)
    async submitKitPayment(userIdOrCode, userType, kitAmount, kitItems, paymentMethod, paymentReference, mpesaCode, phoneNumber, notes) {
        try {
            const paymentData = {
                user_type: userType,
                kit_amount: kitAmount,
                kit_items: kitItems,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                mpesa_code: mpesaCode,
                phone_number: phoneNumber,
                payment_status: 'pending',
                notes: notes
            };
            
            // Check if it's a UUID (userId) or application code
            if (userIdOrCode.includes('-') && userIdOrCode.length > 20) {
                paymentData.user_id = userIdOrCode;
            } else {
                paymentData.application_code = userIdOrCode;
            }
            
            const { error } = await this.supabase
                .from('stokika_kit_payments')
                .insert([paymentData]);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error submitting kit payment:', error);
            return false;
        }
    }

    // Get kit payment (supports both userId and applicationCode)
    async getKitPayment(userIdOrCode) {
        try {
            let query = this.supabase
                .from('stokika_kit_payments')
                .select('*');
            
            // Check if it's a UUID (userId) or application code
            if (userIdOrCode.includes('-') && userIdOrCode.length > 20) {
                query = query.eq('user_id', userIdOrCode);
            } else {
                query = query.eq('application_code', userIdOrCode);
            }
            
            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting kit payment:', error);
            return null;
        }
    }

    // Verify kit payment (admin only)
    async verifyKitPayment(paymentId, verifiedBy) {
        try {
            const { error } = await this.supabase
                .from('stokika_kit_payments')
                .update({
                    payment_status: 'verified',
                    verified_by: verifiedBy,
                    verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error verifying kit payment:', error);
            return false;
        }
    }

    // Reject kit payment (admin only)
    async rejectKitPayment(paymentId, rejectionReason) {
        try {
            const { error } = await this.supabase
                .from('stokika_kit_payments')
                .update({
                    payment_status: 'rejected',
                    rejection_reason: rejectionReason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentId);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error rejecting kit payment:', error);
            return false;
        }
    }

    // Check if kit payment is verified
    async checkKitPaymentVerified(userId) {
        try {
            const { data, error } = await this.supabase.rpc('check_kit_payment_verified', {
                p_user_id: userId
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error checking kit payment:', error);
            return false;
        }
    }
}

// Export for use in other files
window.ComprehensiveOnboarding = ComprehensiveOnboarding;
