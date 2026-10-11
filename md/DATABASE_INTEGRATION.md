# Database Integration Documentation

## Overview
This document outlines the complete database integration for the Stokika platform using Supabase as the backend.

## Setup Instructions

### 1. Supabase Configuration
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing: `iuvlwpkehrnyxaoxznuk`
3. Navigate to SQL Editor
4. Run the SQL script: `config/database-setup.sql`
5. Verify all tables are created successfully

### 2. Authentication Setup
1. In Supabase Dashboard, go to Authentication > Settings
2. Enable Email authentication
3. Configure email templates (optional)
4. Set up password requirements

### 3. Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only view/edit their own data
- Vendors see only their orders, payments, inventory
- Suppliers see only their orders
- Public can view verified suppliers

## Database Schema

### Core Tables

#### users
- Primary authentication and role management
- Fields: id, email, name, phone, user_type, role, status, last_login
- User types: vendor, supplier, supervisor, field_agent, admin

#### vendors
- Business information for vendors
- Links to users table via user_id
- Tracks credit_limit and current_balance

#### suppliers
- Supplier information and verification status
- Links to users table via user_id
- Verified suppliers visible to all

#### orders
- Order management between vendors and suppliers
- Tracks status, delivery, and payment cycles
- Links to vendors and suppliers

#### payments
- Payment tracking for orders
- Status: pending, completed, overdue, failed

#### inventory
- Vendor inventory management
- Real-time stock tracking

## Integration Files

### 1. js/db-integration.js
Comprehensive database service class with methods for:
- Authentication (signIn, signOut, getCurrentUser)
- User management
- Vendor operations
- Supplier operations
- Order management
- Payment processing
- Inventory tracking

### 2. js/auth-middleware.js
Authentication middleware for:
- Page protection
- Role-based access control
- Session management
- Automatic logout handling

### 3. config/supabase-config.js
Supabase client initialization and API functions

### 4. js/load-env.js
Environment variables for Supabase connection

## Navigation Flow

### User Journey
1. **Landing Page** (index.html)
   - User clicks "Launch Dashboard" button
   - Redirects to signin.html

2. **Sign In** (signin.html)
   - User selects role (Vendor, Supplier, Supervisor, Field Agent)
   - Enters email and password
   - System validates credentials
   - Checks user role matches selection
   - Updates last_login timestamp
   - Redirects to appropriate dashboard

3. **Role-Based Dashboards**
   - **Vendor** → inventory.html
   - **Supplier** → supplier.html
   - **Supervisor** → supervisor.html
   - **Field Agent** → agent.html
   - **Admin** → admin.html

## Protected Pages

All dashboard pages should include:
```html
<script src="../js/load-env.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/auth-middleware.js"></script>
<script src="../js/db-integration.js"></script>
```

Add to body tag:
```html
<body data-protected data-allowed-roles="vendor">
```

## Usage Examples

### Sign In
```javascript
const { data, error } = await dbService.signIn(email, password);
if (!error) {
    const { data: userData } = await dbService.getUserByEmail(email);
    // Store user info and redirect
}
```

### Get Vendor Orders
```javascript
const vendorId = authMiddleware.getUserId();
const { data: orders } = await dbService.getVendorOrders(vendorId);
```

### Create Order
```javascript
const orderData = {
    vendor_id: vendorId,
    supplier_id: supplierId,
    order_number: 'ORD-' + Date.now(),
    total_amount: 5000,
    status: 'pending',
    cycle_type: 'weekly'
};
const { data, error } = await dbService.createOrder(orderData);
```

### Logout
```javascript
await authMiddleware.logout();
```

## Security Features

### 1. Row Level Security (RLS)
- Enabled on all sensitive tables
- Users can only access their own data
- Policies enforce data isolation

### 2. Authentication
- Supabase Auth handles password hashing
- JWT tokens for session management
- Automatic token refresh

### 3. Role-Based Access
- Middleware checks user roles
- Redirects unauthorized users
- Protects sensitive pages

### 4. Input Validation
- Client-side validation in forms
- Server-side validation via RLS
- SQL injection prevention

## Testing

### Create Test Users
Run in Supabase SQL Editor:
```sql
-- Create test vendor
INSERT INTO users (email, name, user_type, role) 
VALUES ('vendor@test.com', 'Test Vendor', 'vendor', 'vendor');

-- Create test supplier
INSERT INTO users (email, name, user_type, role) 
VALUES ('supplier@test.com', 'Test Supplier', 'supplier', 'supplier');
```

Set passwords in Supabase Auth UI.

### Test Sign In Flow
1. Go to signin.html
2. Select role: Vendor
3. Email: vendor@test.com
4. Password: (set in Supabase)
5. Should redirect to inventory.html

## Troubleshooting

### Issue: "Unable to connect to database"
- Check SUPABASE_URL and SUPABASE_ANON_KEY in load-env.js
- Verify Supabase project is active
- Check browser console for errors

### Issue: "User not found"
- Verify user exists in users table
- Check email matches exactly
- Ensure user_type is set correctly

### Issue: "Invalid role selected"
- User's user_type must match selected role
- Update user_type in users table if needed

### Issue: RLS blocking queries
- Check RLS policies are created
- Verify user is authenticated
- Check auth.uid() matches user_id

## Maintenance

### Regular Tasks
1. Monitor failed login attempts
2. Review and approve vendor registrations
3. Verify new suppliers
4. Clean up old sessions
5. Backup database weekly

### Database Backups
Supabase provides automatic backups:
- Daily backups (retained 7 days)
- Weekly backups (retained 4 weeks)
- Manual backups available

## API Reference

### DatabaseService Methods

#### Authentication
- `signIn(email, password)` - Sign in user
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get current authenticated user

#### Users
- `getUserByEmail(email)` - Get user by email
- `updateLastLogin(email)` - Update last login timestamp

#### Vendors
- `getVendorById(vendorId)` - Get vendor details
- `getVendorOrders(vendorId)` - Get vendor orders
- `getVendorPayments(vendorId)` - Get vendor payments

#### Suppliers
- `getSuppliers()` - Get all verified suppliers
- `getSupplierById(supplierId)` - Get supplier details
- `getSupplierOrders(supplierId)` - Get supplier orders

#### Orders
- `createOrder(orderData)` - Create new order
- `updateOrderStatus(orderId, status)` - Update order status

#### Payments
- `createPayment(paymentData)` - Create payment record
- `updatePaymentStatus(paymentId, status)` - Update payment status

#### Inventory
- `getInventory(vendorId)` - Get vendor inventory

### AuthMiddleware Methods
- `isAuthenticated()` - Check if user is authenticated
- `getUserRole()` - Get current user role
- `getUserId()` - Get current user ID
- `getUserName()` - Get current user name
- `protectPage(allowedRoles)` - Protect page with role check
- `logout()` - Logout and clear session

## Next Steps

1. ✅ Database schema created
2. ✅ Integration scripts created
3. ✅ Authentication middleware created
4. ✅ Navigation flow updated (index.html → signin.html)
5. ⏳ Update all dashboard pages with auth protection
6. ⏳ Implement data loading in dashboards
7. ⏳ Test complete user flow
8. ⏳ Add error handling and loading states

## Support

For issues or questions:
- Email: dev@stokika.com
- Documentation: This file
- Supabase Docs: https://supabase.com/docs
