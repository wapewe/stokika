# Comprehensive Onboarding System

## Overview
This comprehensive onboarding system provides a complete solution for managing field agent, supervisor, vendor, and supplier onboarding with training modules, document management, assignments, and performance tracking.

## Features

### 1. **Onboarding Steps Tracking**
- Account Creation
- Email Verification
- Profile Setup
- Document Upload
- Training Completion
- First Assignment

### 2. **Training Modules**
- Pre-configured training modules for each user type
- Progress tracking with percentage completion
- Quiz scores and completion certificates
- Video content support
- Mandatory and optional modules

### 3. **Document Management**
- Upload ID cards, certificates, KRA PIN, photos
- Document verification workflow
- Admin approval/rejection with reasons
- Secure file storage in Supabase Storage

### 4. **First Assignment Tracking**
- Create custom assignments for new users
- Track assignment status (assigned, in_progress, completed, failed)
- Rating system (1-5 stars)
- Completion notes and feedback

### 5. **Performance Metrics**
- Track KPIs during onboarding
- Set target values and monitor progress
- Visual progress indicators
- Historical metric tracking

### 6. **Notifications System**
- Welcome notifications
- Assignment notifications
- Training reminders
- Admin messages
- Read/unread status tracking

## Database Schema

### Tables Created
1. `onboarding_steps` - Track completion of onboarding steps
2. `training_modules` - Store training content
3. `training_progress` - Track user training progress
4. `onboarding_documents` - Store uploaded documents
5. `onboarding_metrics` - Performance metrics
6. `onboarding_notifications` - User notifications
7. `first_assignments` - Assignment tracking

## Installation

### Step 1: Run Database Schema
```sql
-- Run in Supabase SQL Editor
-- File: config/comprehensive-onboarding-schema.sql
```

### Step 2: Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `onboarding-documents`
3. Set bucket to **Public** or configure RLS policies

### Step 3: Include Scripts in HTML
```html
<script src="../js/comprehensive-onboarding.js"></script>
```

### Step 4: Include CSS
```html
<link rel="stylesheet" href="../css/comprehensive-onboarding.css">
```

## Usage

### For Admins

#### View Onboarding Progress
```javascript
// Click "View Steps" button in Onboarding tab
window.viewOnboardingSteps(userId);
```

#### Manage Onboarding
```javascript
// Click "Manage Onboarding" button
window.manageComprehensiveOnboarding(userId);
```

#### Create Assignment
```javascript
const onboarding = new ComprehensiveOnboarding();
await onboarding.createAssignment(
    userId,
    'first_vendor_visit',
    'Visit 5 vendors in your territory',
    adminId,
    '2025-12-31'
);
```

#### Verify Document
```javascript
const onboarding = new ComprehensiveOnboarding();
await onboarding.verifyDocument(
    documentId,
    'verified',
    adminId
);
```

### For Users

#### Get Onboarding Progress
```javascript
const onboarding = new ComprehensiveOnboarding();
const progress = await onboarding.getOnboardingProgress(userId);
// Returns: { total_steps: 6, completed_steps: 3, progress_percentage: 50 }
```

#### Upload Document
```javascript
const onboarding = new ComprehensiveOnboarding();
const file = document.getElementById('fileInput').files[0];
await onboarding.uploadDocument(userId, 'id_card', file);
```

#### Complete Training Module
```javascript
const onboarding = new ComprehensiveOnboarding();
await onboarding.completeTraining(userId, moduleId, 85); // 85 is quiz score
```

#### Complete Assignment
```javascript
const onboarding = new ComprehensiveOnboarding();
await onboarding.completeAssignment(
    assignmentId,
    'Visited 5 vendors successfully',
    5 // rating
);
```

## Default Training Modules

### Field Agent Training
1. **Introduction to Stokika** (30 min) - Company mission and values
2. **Product Knowledge** (45 min) - Products and inventory
3. **Vendor Relations** (40 min) - Working with vendors
4. **Mobile App Training** (35 min) - Using the mobile app
5. **Sales Techniques** (50 min) - Sales strategies
6. **Compliance & Ethics** (25 min) - Policies and ethics

## API Reference

### ComprehensiveOnboarding Class

#### Methods

**initializeOnboarding(userId, userType)**
- Initializes onboarding for a new user
- Creates onboarding steps and training progress records

**getOnboardingProgress(userId)**
- Returns overall progress percentage

**getOnboardingSteps(userId)**
- Returns all onboarding steps for a user

**updateStep(userId, stepName, status, notes)**
- Updates a specific onboarding step

**getTrainingModules(userType)**
- Returns all training modules for a user type

**getTrainingProgress(userId)**
- Returns user's training progress

**startTraining(userId, moduleId)**
- Marks a training module as started

**completeTraining(userId, moduleId, quizScore)**
- Marks a training module as completed

**uploadDocument(userId, documentType, file)**
- Uploads a document to Supabase Storage

**getDocuments(userId)**
- Returns all documents for a user

**verifyDocument(documentId, status, verifiedBy, rejectionReason)**
- Verifies or rejects a document

**createAssignment(userId, assignmentType, description, assignedBy, dueDate)**
- Creates a new assignment

**getAssignments(userId)**
- Returns all assignments for a user

**completeAssignment(assignmentId, completionNotes, rating)**
- Marks an assignment as completed

**addMetric(userId, metricName, metricValue, targetValue, notes)**
- Adds a performance metric

**getMetrics(userId)**
- Returns all metrics for a user

**sendNotification(userId, notificationType, title, message)**
- Sends a notification to a user

**getNotifications(userId)**
- Returns all notifications for a user

**markNotificationRead(notificationId)**
- Marks a notification as read

## Customization

### Add New Training Module
```sql
INSERT INTO training_modules (title, description, content, duration_minutes, user_type, module_order, is_mandatory)
VALUES ('Custom Module', 'Description', 'Content', 60, 'field_agent', 7, false);
```

### Add New Onboarding Step
```sql
INSERT INTO onboarding_steps (user_id, user_type, step_name, step_order, status)
VALUES ('user-uuid', 'field_agent', 'custom_step', 7, 'pending');
```

### Customize Document Types
Edit the CHECK constraint in `onboarding_documents` table:
```sql
ALTER TABLE onboarding_documents DROP CONSTRAINT onboarding_documents_document_type_check;
ALTER TABLE onboarding_documents ADD CONSTRAINT onboarding_documents_document_type_check 
CHECK (document_type IN ('id_card', 'certificate', 'kra_pin', 'photo', 'contract', 'custom_type', 'other'));
```

## Security

### Row Level Security (RLS)
- Users can only view/update their own records
- Admins can view/manage all records
- All tables have RLS enabled

### File Upload Security
- Files stored in Supabase Storage
- Public URLs generated for verified documents
- File size limits enforced
- MIME type validation

## Troubleshooting

### Training completion not updating step
- Check that all mandatory modules are completed
- Verify the trigger `training_completion_trigger` is active
- Check training_progress table for status

### Documents not uploading
- Verify Storage bucket `onboarding-documents` exists
- Check bucket permissions (Public or RLS policies)
- Verify file size is within limits

### Notifications not appearing
- Check `onboarding_notifications` table
- Verify RLS policies allow user to read notifications
- Check `is_read` status

### Progress percentage not updating
- Call `update_onboarding_progress()` function
- Verify onboarding_steps records exist
- Check step statuses are correctly set

## Future Enhancements

1. **Email/SMS Integration** - Automated reminders
2. **Video Training** - Embedded video player
3. **Quiz System** - Interactive quizzes with scoring
4. **Certificates** - Auto-generated completion certificates
5. **Gamification** - Points, badges, leaderboards
6. **Mobile App** - Native mobile onboarding experience
7. **Analytics Dashboard** - Onboarding metrics and insights
8. **Bulk Operations** - Manage multiple users at once

## Support

For issues or questions:
1. Check this README
2. Review database schema comments
3. Check browser console for errors
4. Review Supabase logs
5. Contact system administrator

## Version History

- **v1.0.0** (2025-01-30) - Initial comprehensive onboarding system release
  - Onboarding steps tracking
  - Training modules
  - Document management
  - Assignment tracking
  - Performance metrics
  - Notifications system
