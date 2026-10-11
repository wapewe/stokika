# 🚀 Quick Start - Database Integration

## 1️⃣ Setup Database (5 minutes)

### Run SQL Schema
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to SQL Editor
3. Copy & paste: `config/database-setup.sql`
4. Click "Run"
5. ✅ Verify all tables created

## 2️⃣ Create Test User (2 minutes)

### In Supabase SQL Editor:
```sql
INSERT INTO users (email, name, user_type, role) 
VALUES ('vendor@test.com', 'Test Vendor', 'vendor', 'vendor');
```

### Set Password:
1. Go to Authentication > Users
2. Find vendor@test.com
3. Click "..." → Reset Password
4. Set password: `Test123!`

## 3️⃣ Test Sign In (1 minute)

1. Open: `html/signin.html`
2. Select: **Vendor**
3. Email: `vendor@test.com`
4. Password: `Test123!`
5. Click "Sign In"
6. ✅ Should redirect to `inventory.html`

## 4️⃣ Protect Dashboard Pages

### Add to each dashboard HTML:
```html
<!-- In <head> section -->
<script src="../js/load-env.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/auth-middleware.js"></script>
<script src="../js/db-integration.js"></script>
```

```html
<!-- Update <body> tag -->
<body data-protected data-allowed-roles="vendor">
```

## 5️⃣ Load Data in Dashboard

### Example: Load Orders
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const vendorId = authMiddleware.getUserId();
    const { data: orders } = await dbService.getVendorOrders(vendorId);
    
    // Display orders
    orders.forEach(order => {
        console.log(order);
    });
});
```

## 📁 Files Created

- ✅ `js/db-integration.js` - Database operations
- ✅ `js/auth-middleware.js` - Authentication & protection
- ✅ `config/database-setup.sql` - Database schema
- ✅ `DATABASE_INTEGRATION.md` - Full documentation
- ✅ `DATABASE_INTEGRATION_SUMMARY.md` - Summary

## 🔄 User Flow

```
index.html 
  → "Launch Dashboard" button
  → signin.html
  → Select role + credentials
  → Role-based dashboard:
     • Vendor → inventory.html
     • Supplier → supplier.html
     • Supervisor → supervisor.html
     • Field Agent → agent.html
```

## 🔐 Security

- ✅ Row Level Security (RLS) enabled
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Automatic page protection

## 📞 Need Help?

- **Full Docs**: `DATABASE_INTEGRATION.md`
- **Summary**: `DATABASE_INTEGRATION_SUMMARY.md`
- **SQL Schema**: `config/database-setup.sql`

---

**Status**: ✅ Ready to use!
