# 👨‍💼 STOKIKA ADMIN MANUAL

## Complete Administrator Guide

---

## TABLE OF CONTENTS

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [User Management](#user-management)
3. [Role Management System](#role-management-system)
4. [Application Review Process](#application-review-process)
5. [Order Management](#order-management)
6. [Payment Verification](#payment-verification)
7. [Communication System](#communication-system)
8. [System Settings](#system-settings)
9. [Analytics & Reports](#analytics--reports)
10. [Security & Permissions](#security--permissions)
11. [Best Practices](#best-practices)

---

## ADMIN DASHBOARD OVERVIEW

### Accessing Admin Dashboard
1. Navigate to: `https://yourdomain.com`
2. Click **"Launch Dashboard"**
3. Select **"Admin"** from dropdown
4. Enter admin credentials
5. Click **"Sign In"**

### Dashboard Layout

**Sidebar Navigation**:
- 📊 **Dashboard**: Overview statistics
- 👥 **Users**: All platform users
- 📦 **Orders**: Order management
- 💰 **Payments**: Payment verification
- 🎯 **Applications**: Field agent/supervisor applications
- 📧 **Communications**: Email system
- ⚙️ **Settings**: Platform configuration
- 📈 **Analytics**: Performance metrics

**Top Bar**:
- 🔔 Notifications
- 👤 Profile menu
- 🚪 Logout button

---

## USER MANAGEMENT

### Viewing All Users

1. Click **"Users"** in sidebar
2. View user list with filters:
   - All Users
   - Vendors
   - Suppliers
   - Field Agents
   - Supervisors
   - Admins

### Creating New User

**Step-by-Step**:
1. Click **"Create User"** button
2. Fill required fields:
   ```
   - Full Name
   - Email Address
   - Phone Number
   - User Type (dropdown)
   - Initial Password
   - Location/County
   ```
3. Click **"Create User"**
4. User receives email with credentials

**User Types**:
- **Vendor**: Business owner ordering products
- **Supplier**: Product provider
- **Field Agent**: Sales representative
- **Supervisor**: Regional manager
- **Admin**: Platform administrator

### Editing User Information

1. Find user in list
2. Click **"Edit"** (pencil icon)
3. Update fields:
   - Name
   - Email
   - Phone
   - Location
   - Status
4. Click **"Save Changes"**

### Making User Admin

1. Find user in list
2. Click **"Make Admin"** button
3. Confirm action
4. User gains admin privileges

**WARNING**: Only grant admin access to trusted users.

### Deleting Users

1. Find user to delete
2. Click **"Delete"** (trash icon)
3. Confirm deletion
4. User is permanently removed

**NOTE**: Deleted users cannot be recovered. Consider deactivating instead.

### Deactivating Users

1. Edit user
2. Change status to **"Inactive"**
3. Save changes
4. User cannot login but data is preserved

---

## ROLE MANAGEMENT SYSTEM

### Supervisor Management

#### Activating Supervisors

**When to Activate**:
- Application approved
- Background check completed
- Training finished
- Ready to manage territory

**How to Activate**:
1. Go to **"Supervisors"** tab
2. Find supervisor with status **"Pending"**
3. Click **"Activate"** button
4. Supervisor status changes to **"Active"**
5. Supervisor receives activation email

**What Activation Grants**:
- ✅ Access to supervisor dashboard
- ✅ View assigned field agents
- ✅ View territory vendors
- ✅ Generate reports
- ❌ Cannot approve orders yet (needs separate permission)

#### Granting Order Approval Permission

**When to Grant**:
- Supervisor is activated
- Supervisor completed training
- Supervisor demonstrates competence
- Territory needs approval authority

**How to Grant**:
1. Find activated supervisor
2. Click **"Grant Approval Permission"**
3. Confirm action
4. Supervisor can now approve orders

**What This Grants**:
- ✅ Approve field agent orders
- ✅ Reject orders with reason
- ✅ View order details
- ✅ Track order status

#### Revoking Order Approval Permission

**When to Revoke**:
- Performance issues
- Policy violations
- Temporary suspension
- Territory restructuring

**How to Revoke**:
1. Find supervisor
2. Click **"Revoke Approval Permission"**
3. Enter reason
4. Confirm action
5. Supervisor loses approval rights

#### Deactivating Supervisors

**When to Deactivate**:
- Resignation
- Termination
- Extended leave
- Performance issues

**How to Deactivate**:
1. Find supervisor
2. Click **"Deactivate"** button
3. Enter reason
4. Confirm action
5. Supervisor loses all access

### Field Agent Management

#### Granting User Creation Permission

**What This Allows**:
- Create vendor accounts
- Create supplier accounts
- Link vendors/suppliers to themselves

**When to Grant**:
- Agent completed training
- Agent passed probation
- Agent demonstrates responsibility
- Territory expansion needed

**How to Grant**:
1. Go to **"Field Agents"** tab
2. Find agent
3. Click **"Grant Permission"**
4. Confirm action
5. Agent can now create users

#### Revoking User Creation Permission

**When to Revoke**:
- Data quality issues
- Policy violations
- Temporary suspension
- Role change

**How to Revoke**:
1. Find agent
2. Click **"Revoke Permission"**
3. Enter reason
4. Confirm action

### Promotion & Demotion

#### Promoting Agent to Supervisor

**Requirements**:
- Minimum 6 months as field agent
- Good performance record
- Leadership qualities
- Territory knowledge

**Process**:
1. Go to **"Field Agents"** tab
2. Find agent to promote
3. Click **"Promote to Supervisor"**
4. Confirm promotion
5. Agent becomes supervisor
6. Assign territory
7. Grant permissions as needed

**What Changes**:
- Role changes from Field Agent to Supervisor
- Access to supervisor dashboard
- Can manage other agents
- Needs activation for full access

#### Demoting Supervisor to Agent

**When to Demote**:
- Performance issues
- Voluntary demotion
- Territory restructuring
- Policy violations

**Process**:
1. Go to **"Supervisors"** tab
2. Find supervisor
3. Click **"Demote to Agent"**
4. Enter reason
5. Confirm demotion
6. Supervisor becomes field agent

**What Changes**:
- Loses supervisor privileges
- Loses order approval rights
- Access to field agent dashboard
- Assigned to new supervisor

---

## APPLICATION REVIEW PROCESS

### Field Agent Applications

#### Viewing Applications

1. Click **"Applications"** tab
2. Click **"Field Agent Applications"**
3. View list with statuses:
   - **Pending**: Awaiting review
   - **Under Review**: Being processed
   - **Approved**: Accepted
   - **Rejected**: Declined

#### Reviewing Application

**Step 1: Open Application**
1. Click on application to view details
2. Review all sections:
   - Personal information
   - Contact details
   - Education background
   - Work experience
   - Skills & qualifications
   - References
   - Availability

**Step 2: Verify Documents**
1. Check uploaded documents:
   - ID copy (clear and valid)
   - CV/Resume (complete)
   - Certificates (authentic)
2. Verify information accuracy

**Step 3: Check References**
1. Contact provided references
2. Verify employment history
3. Check character references

**Step 4: Make Decision**

**To Approve**:
1. Click **"Approve"** button
2. Application status changes to **"Approved"**
3. Applicant receives approval email
4. Kit payment link sent
5. Schedule interview/training

**To Reject**:
1. Click **"Reject"** button
2. Enter rejection reason:
   - Incomplete information
   - Failed background check
   - Insufficient qualifications
   - Other (specify)
3. Confirm rejection
4. Applicant receives rejection email

#### Post-Approval Process

1. **Kit Payment Verification**:
   - Monitor kit payment submission
   - Verify payment (KES 2,500)
   - Approve payment

2. **Account Creation**:
   - Create user account
   - Set initial password
   - Send credentials

3. **Training Schedule**:
   - Schedule onboarding training
   - Provide training materials
   - Assign mentor/supervisor

4. **Territory Assignment**:
   - Assign to supervisor
   - Define territory
   - Set targets

### Supervisor Applications

#### Review Process (Similar to Field Agent)

1. View application details
2. Verify documents
3. Check management experience
4. Contact references
5. Approve or reject

#### Additional Checks for Supervisors

- **Leadership Experience**: Minimum 2 years
- **Management Skills**: Proven track record
- **Territory Knowledge**: Familiar with region
- **Communication Skills**: Excellent verbal/written

#### Post-Approval for Supervisors

1. Kit payment verification (KES 5,000)
2. Account creation
3. Management training
4. Territory assignment
5. **Activation** (separate step)
6. **Grant approval permission** (when ready)

---

## ORDER MANAGEMENT

### Order Workflow

```
Field Agent Creates Order
    ↓
Pending Admin (You assign supplier)
    ↓
Pending Supplier (Supplier accepts/declines)
    ↓
Accepted (Supplier accepted)
    ↓
Processing (Supplier preparing)
    ↓
Delivered (Order completed)
```

### Assigning Suppliers to Orders

**Step 1: View Pending Orders**
1. Go to **"Orders"** tab
2. Filter by status: **"Pending Admin"**
3. View order details:
   - Vendor name
   - Product requested
   - Quantity
   - Location

**Step 2: Select Appropriate Supplier**

**Consider**:
- Supplier location (proximity to vendor)
- Product availability
- Supplier rating
- Delivery capacity
- Pricing

**Step 3: Assign Supplier**
1. Click **"Assign Supplier"** button
2. Select supplier from dropdown
3. Add notes (optional)
4. Click **"Assign"**
5. Order status changes to **"Pending Supplier"**
6. Supplier receives notification

### Approving Orders

**When Needed**:
- High-value orders (above threshold)
- First-time vendors
- Suspicious orders
- Policy exceptions

**Process**:
1. Review order details
2. Verify vendor legitimacy
3. Check supplier capacity
4. Click **"Approve"** or **"Reject"**
5. If rejecting, enter reason

### Monitoring Order Status

**Dashboard View**:
- Total orders
- Pending orders
- Completed orders
- Cancelled orders

**Filters**:
- By status
- By date range
- By vendor
- By supplier
- By amount

### Handling Order Issues

**Delayed Orders**:
1. Contact supplier
2. Get status update
3. Inform vendor
4. Set new delivery date

**Cancelled Orders**:
1. Verify cancellation reason
2. Update order status
3. Notify all parties
4. Process refund if needed

---

## PAYMENT VERIFICATION

### Vendor Payments

#### Viewing Payment Submissions

1. Go to **"Payments"** tab
2. View payments with status:
   - **Pending**: Awaiting verification
   - **Approved**: Verified and accepted
   - **Rejected**: Declined

#### Verifying M-Pesa Payments

**Step 1: Review Payment Details**
- Vendor name
- Amount paid
- M-Pesa transaction code
- Phone number
- Payment date
- Payment method (manual/auto)

**Step 2: Verify Transaction**

**For Manual Payments**:
1. Check M-Pesa statement
2. Verify transaction code exists
3. Confirm amount matches
4. Verify phone number
5. Check payment date

**For Auto Payments**:
1. Check STK push status
2. Verify payment received
3. Confirm amount

**Step 3: Approve or Reject**

**To Approve**:
1. Click **"Approve"** button
2. Payment status changes to **"Approved"**
3. Vendor receives confirmation email
4. Credit applied to vendor account

**To Reject**:
1. Click **"Reject"** button
2. Select rejection reason:
   - Invalid M-Pesa code
   - Amount mismatch
   - Duplicate payment
   - Fraudulent transaction
   - Other (specify)
3. Confirm rejection
4. Vendor receives rejection email with reason

### Kit Payments (Field Agent/Supervisor)

#### Verification Process

**Field Agent Kit**: KES 2,500
**Supervisor Kit**: KES 5,000

**Kit Contents**:
- Branded uniform
- ID badge
- Training materials
- Mobile app access
- Starter pack

**Verification Steps**:
1. Go to **"Kit Payments"** tab
2. View pending payments
3. Verify M-Pesa code
4. Confirm amount matches kit type
5. Approve or reject
6. If approved, arrange kit delivery

### Payment Reports

**Generate Reports**:
1. Click **"Reports"** in Payments section
2. Select date range
3. Choose report type:
   - All payments
   - Approved payments
   - Rejected payments
   - Pending payments
4. Export to PDF/Excel

---

## COMMUNICATION SYSTEM

### Email System

#### Sending Individual Email

**To Supervisor**:
1. Go to **"Supervisors"** tab
2. Find supervisor
3. Click **"Send Email"** button
4. Fill email form:
   - Subject
   - Message
   - Attachments (optional)
5. Click **"Send"**

**To Field Agent**:
1. Go to **"Field Agents"** tab
2. Find agent
3. Click **"Send Email"**
4. Compose message
5. Send

**To Any User**:
1. Go to user's profile
2. Click email icon
3. Compose and send

#### Sending Bulk Email

**To All Supervisors**:
1. Go to **"Supervisors"** tab
2. Click **"Bulk Email"** button
3. Select **"All Supervisors"**
4. Compose message
5. Click **"Send to All"**

**To Filtered Group**:
1. Click **"Bulk Email"**
2. Select filter:
   - All
   - Pending
   - Approved
   - Rejected
   - Active
   - Inactive
3. Compose message
4. Preview recipients
5. Send

**To Selected Users**:
1. Check boxes next to users
2. Click **"Email Selected"**
3. Compose message
4. Send

### Email Templates

**Create Template**:
1. Go to **"Settings"** → **"Email Templates"**
2. Click **"New Template"**
3. Enter:
   - Template name
   - Subject
   - Body (use variables)
4. Save template

**Variables Available**:
- `{name}`: User's name
- `{email}`: User's email
- `{role}`: User's role
- `{date}`: Current date
- `{application_code}`: Application code

**Use Template**:
1. When composing email
2. Click **"Load Template"**
3. Select template
4. Customize if needed
5. Send

### SMS Notifications (If Enabled)

1. Go to **"Communications"** → **"SMS"**
2. Select recipients
3. Compose message (160 characters max)
4. Send

---

## SYSTEM SETTINGS

### Website Settings

#### Feature Toggles

1. Go to **"Settings"** → **"Website Settings"**
2. Toggle features on/off:

**Available Toggles**:
- ✅ **Vendor Registration**: Allow new vendor signups
- ✅ **Supplier Registration**: Allow new supplier signups
- ✅ **Field Agent Applications**: Accept new applications
- ✅ **Supervisor Applications**: Accept new applications
- ✅ **Contact Form**: Enable contact form on website
- ✅ **Newsletter Signup**: Allow newsletter subscriptions

#### Maintenance Mode

**Enable Maintenance Mode**:
1. Go to **"Settings"** → **"Maintenance"**
2. Toggle **"Maintenance Mode"** ON
3. Set maintenance message
4. Save changes
5. Website shows maintenance page

**Disable Maintenance Mode**:
1. Toggle **"Maintenance Mode"** OFF
2. Save changes
3. Website becomes accessible

### User Settings

#### Default Permissions

1. Go to **"Settings"** → **"Permissions"**
2. Set default permissions for new users:
   - Field agents can create users: Yes/No
   - Supervisors can approve orders: Yes/No
   - Auto-approve vendors: Yes/No

#### Password Policy

1. Go to **"Settings"** → **"Security"**
2. Configure:
   - Minimum password length
   - Require uppercase
   - Require numbers
   - Require special characters
   - Password expiry (days)

### Notification Settings

1. Go to **"Settings"** → **"Notifications"**
2. Configure email notifications:
   - New user registration
   - New order created
   - Payment submitted
   - Application submitted
   - Order status changes

---

## ANALYTICS & REPORTS

### Dashboard Analytics

**Key Metrics**:
- Total users by type
- Active users (last 30 days)
- Total orders
- Order completion rate
- Total revenue
- Average order value
- Payment success rate

### User Analytics

1. Click **"Analytics"** → **"Users"**
2. View:
   - User growth over time
   - Users by type (pie chart)
   - Users by location (map)
   - Active vs inactive users
   - Registration trends

### Order Analytics

1. Click **"Analytics"** → **"Orders"**
2. View:
   - Orders over time (line chart)
   - Orders by status (bar chart)
   - Orders by supplier
   - Orders by location
   - Average order value
   - Order completion time

### Revenue Analytics

1. Click **"Analytics"** → **"Revenue"**
2. View:
   - Revenue over time
   - Revenue by supplier
   - Revenue by location
   - Payment methods breakdown
   - Revenue forecasting

### Performance Reports

**Generate Report**:
1. Click **"Reports"** → **"Generate Report"**
2. Select report type:
   - User report
   - Order report
   - Payment report
   - Performance report
3. Set date range
4. Choose format (PDF/Excel/CSV)
5. Click **"Generate"**
6. Download report

### Exporting Data

**Export Users**:
1. Go to **"Users"** tab
2. Click **"Export"**
3. Select format
4. Download file

**Export Orders**:
1. Go to **"Orders"** tab
2. Apply filters
3. Click **"Export"**
4. Download file

---

## SECURITY & PERMISSIONS

### Admin Permissions

**What Admins Can Do**:
- ✅ Create/edit/delete all users
- ✅ Approve/reject applications
- ✅ Verify payments
- ✅ Assign suppliers to orders
- ✅ Activate/deactivate supervisors
- ✅ Grant/revoke permissions
- ✅ Promote/demote users
- ✅ Send emails/SMS
- ✅ Configure system settings
- ✅ View all analytics
- ✅ Generate reports
- ✅ Access audit logs

### Security Best Practices

**Password Security**:
- Use strong, unique password
- Change password every 90 days
- Never share admin credentials
- Use password manager

**Account Security**:
- Enable two-factor authentication (if available)
- Log out when finished
- Don't use public computers
- Monitor login activity

**Data Security**:
- Verify user identities before granting access
- Review permissions regularly
- Audit user activities
- Report suspicious activities

### Audit Logs

**Viewing Audit Logs**:
1. Go to **"Settings"** → **"Audit Logs"**
2. View all admin actions:
   - User created/edited/deleted
   - Permissions granted/revoked
   - Payments approved/rejected
   - Settings changed
   - Emails sent

**Filtering Logs**:
- By admin user
- By action type
- By date range
- By affected user

**Exporting Logs**:
1. Apply filters
2. Click **"Export Logs"**
3. Download CSV file

---

## BEST PRACTICES

### Daily Tasks

**Morning Routine** (15 minutes):
1. Check pending applications
2. Review payment submissions
3. Monitor order status
4. Check notifications
5. Respond to urgent emails

**Throughout Day**:
1. Approve/reject applications promptly
2. Verify payments within 24 hours
3. Assign suppliers to orders quickly
4. Respond to user inquiries
5. Monitor system performance

**End of Day** (10 minutes):
1. Review day's activities
2. Check pending items
3. Plan next day priorities
4. Backup important data

### Weekly Tasks

**Every Monday**:
1. Review weekly analytics
2. Generate performance reports
3. Check user growth
4. Plan week's priorities

**Every Friday**:
1. Review week's accomplishments
2. Process pending items
3. Send weekly updates to team
4. Prepare for next week

### Monthly Tasks

1. **User Review**:
   - Review all active users
   - Deactivate inactive accounts
   - Update user permissions
   - Clean up duplicate accounts

2. **Performance Review**:
   - Analyze platform metrics
   - Review supervisor performance
   - Assess field agent productivity
   - Identify improvement areas

3. **Financial Review**:
   - Reconcile payments
   - Generate financial reports
   - Review revenue trends
   - Plan budget

4. **System Maintenance**:
   - Update system settings
   - Review security logs
   - Backup database
   - Test system features

### Application Review Guidelines

**Approval Criteria**:
- ✅ Complete application
- ✅ Valid documents
- ✅ Positive references
- ✅ Relevant experience
- ✅ Good communication skills
- ✅ Clean background check

**Rejection Reasons**:
- ❌ Incomplete information
- ❌ Invalid documents
- ❌ Negative references
- ❌ Insufficient qualifications
- ❌ Failed background check
- ❌ Poor communication

**Processing Time**:
- Review within 48 hours
- Respond within 72 hours
- Complete process within 1 week

### Payment Verification Guidelines

**Approval Criteria**:
- ✅ Valid M-Pesa code
- ✅ Correct amount
- ✅ Matching phone number
- ✅ Recent transaction
- ✅ No duplicates

**Rejection Reasons**:
- ❌ Invalid code
- ❌ Wrong amount
- ❌ Duplicate payment
- ❌ Suspicious transaction
- ❌ Expired code

**Processing Time**:
- Verify within 24 hours
- Respond immediately
- Resolve issues within 48 hours

### Communication Guidelines

**Email Etiquette**:
- Professional tone
- Clear subject lines
- Concise messages
- Proper grammar
- Timely responses

**Response Times**:
- Urgent: Within 1 hour
- High priority: Within 4 hours
- Normal: Within 24 hours
- Low priority: Within 48 hours

**Bulk Email Best Practices**:
- Personalize when possible
- Clear call-to-action
- Proofread before sending
- Test with small group first
- Track open/click rates

---

## TROUBLESHOOTING

### Common Issues

**Users Cannot Login**:
1. Verify account is active
2. Check email spelling
3. Reset password
4. Check user type matches login page

**Payments Not Showing**:
1. Refresh page
2. Check database connection
3. Verify payment was submitted
4. Check filters applied

**Orders Stuck in Status**:
1. Check supplier assignment
2. Verify supplier accepted
3. Contact supplier
4. Manually update if needed

**Emails Not Sending**:
1. Check email configuration
2. Verify recipient email
3. Check spam filters
4. Review email logs

### Getting Help

**Technical Support**:
- Email: tech@stokika.com
- Phone: +254 XXX XXX XXX

**Database Issues**:
- Contact: Supabase support
- Check: Database logs

**Emergency Contact**:
- Phone: +254 XXX XXX XXX (24/7)

---

## QUICK REFERENCE

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + S | Save changes |
| Ctrl + F | Search |
| Esc | Close modal |
| Ctrl + P | Print |

### Status Codes

| Code | Meaning |
|------|---------|
| pending | Awaiting action |
| approved | Accepted |
| rejected | Declined |
| active | Currently active |
| inactive | Deactivated |
| processing | Being worked on |
| completed | Finished |

### Important Links

- Admin Dashboard: `/html/admin.html`
- User Management: `/html/admin.html#users`
- Applications: `/html/admin.html#applications`
- Payments: `/html/admin.html#payments`
- Settings: `/html/admin.html#settings`

---

**Last Updated**: 2024  
**Version**: 1.0  
**For**: Stokika Platform Administrators
