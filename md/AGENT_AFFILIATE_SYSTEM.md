# Field Agent Affiliate System Documentation

## Overview
The Field Agent Affiliate System enables field agents to track and earn commissions from vendor and supplier registrations they facilitate. The system supports both affiliate link sharing and manual agent code entry.

## Features

### 1. Affiliate Link Generation
- **Unique Links**: Each field agent gets unique affiliate links for vendor and supplier registrations
- **Format**: `https://stokika.com/?ref=AGENT_NUMBER&type=vendor`
- **Automatic Tracking**: Links automatically track referrals when clicked

### 2. Manual Agent Code Entry
- Vendors/suppliers can manually enter agent employee number during registration
- Useful for offline referrals or when link isn't used
- Validates agent code before accepting

### 3. Referral Tracking
- **Real-time Stats**: Total referrals, active referrals, commission earned
- **Detailed List**: View all referred vendors and suppliers
- **Status Tracking**: Pending, approved, active, inactive statuses
- **Commission Tracking**: Track earnings per referral

### 4. Dashboard Integration
- Dedicated "My Referrals" page in agent dashboard
- Copy-to-clipboard functionality for affiliate links
- Visual stats cards showing performance
- Detailed referral table with business info

## Database Schema

### Tables Created
1. **agent_referrals**: Main referral tracking table
   - Links agents to vendors/suppliers
   - Tracks commission and status
   - Stores referral codes

2. **Vendor/Supplier Columns Added**:
   - `referred_by_agent`: UUID reference to field agent
   - `agent_referral_code`: Agent's employee number
   - `referral_source`: 'direct', 'agent_link', or 'agent_code'

### Functions Created
1. `generate_referral_code()`: Creates unique referral codes
2. `link_vendor_to_agent()`: Links vendor to referring agent
3. `link_supplier_to_agent()`: Links supplier to referring agent
4. `verify_agent_code()`: Validates agent employee numbers
5. `get_agent_referral_stats()`: Returns agent referral statistics

## Implementation Files

### SQL Schema
- **File**: `config/agent-affiliate-system.sql`
- **Purpose**: Database tables, functions, and policies
- **Run**: Execute in Supabase SQL Editor

### JavaScript Components
1. **agent-affiliate-system.js**
   - Core affiliate system class
   - Link generation and validation
   - Referral tracking functions

2. **vendor-supplier-registration-with-referral.js**
   - Integrates referral tracking into registration forms
   - Adds agent code input fields
   - Handles form submissions with referral data

3. **agent-referral-dashboard.js**
   - Dashboard component for agents
   - Displays stats and referral list
   - Manages affiliate link copying

### HTML Integration
- **index.html**: Vendor/supplier registration with referral tracking
- **agent.html**: Agent dashboard with referrals page

## Usage Guide

### For Field Agents

#### 1. Access Your Affiliate Links
```
1. Login to agent dashboard
2. Navigate to "My Referrals" page
3. Copy your vendor or supplier affiliate link
4. Share via WhatsApp, SMS, or social media
```

#### 2. Share Your Agent Code
```
Your agent code is your employee number (e.g., FA001)
Vendors/suppliers can enter this during registration
```

#### 3. Track Your Referrals
```
- View total referrals count
- See active vs pending referrals
- Track commission earned
- View detailed referral list with contact info
```

### For Vendors/Suppliers

#### 1. Registration via Affiliate Link
```
1. Click agent's affiliate link
2. See agent banner at top of page
3. Complete registration normally
4. Automatically linked to agent
```

#### 2. Registration with Agent Code
```
1. Visit stokika.com directly
2. Start registration process
3. Enter agent code in "Field Agent Referral Code" field
4. Complete registration
5. System validates and links to agent
```

### For Administrators

#### 1. View Agent Referrals
```sql
-- Get all referrals for an agent
SELECT * FROM agent_referrals 
WHERE agent_number = 'FA001'
ORDER BY created_at DESC;
```

#### 2. Update Commission
```sql
-- Update commission for a referral
UPDATE agent_referrals 
SET commission_earned = 500.00,
    status = 'active'
WHERE id = 'referral-uuid';
```

#### 3. Get Agent Stats
```sql
-- Get agent referral statistics
SELECT * FROM get_agent_referral_stats('agent-uuid');
```

## Referral Flow

### Scenario 1: Affiliate Link
```
1. Agent shares link: https://stokika.com/?ref=FA001&type=vendor
2. Vendor clicks link
3. System displays agent banner
4. Referral info stored in localStorage
5. Vendor completes registration
6. System links vendor to agent (referral_source: 'agent_link')
7. Referral record created in agent_referrals table
```

### Scenario 2: Manual Code Entry
```
1. Vendor visits stokika.com directly
2. Starts registration process
3. Enters agent code "FA001" in referral field
4. System validates agent code
5. Vendor completes registration
6. System links vendor to agent (referral_source: 'agent_code')
7. Referral record created in agent_referrals table
```

### Scenario 3: Agent Direct Registration
```
1. Agent registers vendor/supplier via their dashboard
2. System automatically links to agent
3. Referral source set to 'agent_direct'
4. Commission automatically calculated
```

## Commission Structure

### Default Rates (Configurable)
- **Vendor Registration**: KES 500 per approved vendor
- **Supplier Registration**: KES 1,000 per approved supplier
- **Active Vendor (Monthly)**: KES 200 per active vendor
- **Order Commission**: 1% of order value (optional)

### Commission Status Flow
```
pending → approved → active → paid
```

## Security & Validation

### Agent Code Validation
- Checks if agent exists in database
- Verifies agent is approved and active
- Prevents invalid or inactive agent codes

### Duplicate Prevention
- One vendor/supplier can only be linked to one agent
- First valid referral wins
- Prevents referral hijacking

### Data Privacy
- Agents only see their own referrals
- RLS policies enforce data isolation
- Admin has full visibility

## API Reference

### JavaScript API

#### Initialize Affiliate System
```javascript
const affiliateSystem = new AgentAffiliateSystem();
```

#### Generate Affiliate Link
```javascript
const link = affiliateSystem.generateAffiliateLink('FA001', 'vendor');
// Returns: https://stokika.com/?ref=FA001&type=vendor
```

#### Verify Agent Code
```javascript
const agentInfo = await affiliateSystem.verifyAgentCode('FA001');
// Returns: { agent_id, agent_number, full_name, is_valid }
```

#### Link Vendor to Agent
```javascript
const success = await affiliateSystem.linkVendorToAgent(
    vendorId, 
    'FA001', 
    'agent_link'
);
```

#### Get Agent Stats
```javascript
const stats = await affiliateSystem.getAgentReferralStats(agentId);
// Returns: { total_referrals, pending_referrals, active_referrals, 
//           total_vendors, total_suppliers, total_commission }
```

#### Get Agent Referrals
```javascript
const referrals = await affiliateSystem.getAgentReferrals(agentId);
// Returns array of referral objects with vendor/supplier details
```

## Testing

### Test Affiliate Link
```
1. Create test agent with code "TEST001"
2. Generate affiliate link
3. Open link in incognito window
4. Verify agent banner appears
5. Complete registration
6. Check agent_referrals table for new record
```

### Test Manual Code Entry
```
1. Visit registration page directly
2. Enter "TEST001" in agent code field
3. Complete registration
4. Verify referral created with source 'agent_code'
```

### Test Dashboard
```
1. Login as agent
2. Navigate to "My Referrals"
3. Verify stats display correctly
4. Verify affiliate links are correct
5. Test copy-to-clipboard functionality
6. Verify referral list displays
```

## Troubleshooting

### Issue: Referral Not Tracked
**Solution**: 
- Check if agent code is valid and active
- Verify localStorage has referral info
- Check browser console for errors
- Ensure scripts are loaded in correct order

### Issue: Affiliate Link Not Working
**Solution**:
- Verify URL format is correct
- Check if agent number exists
- Clear browser cache and cookies
- Test in incognito mode

### Issue: Commission Not Calculated
**Solution**:
- Check referral status (must be 'approved' or 'active')
- Verify commission rates in database
- Run manual commission calculation
- Check admin approval status

## Future Enhancements

### Planned Features
1. **SMS Notifications**: Alert agents when referral registers
2. **Commission Automation**: Auto-calculate and pay commissions
3. **Leaderboard**: Top performing agents
4. **Referral Analytics**: Conversion rates, best channels
5. **Bulk Link Generation**: Generate multiple links at once
6. **QR Codes**: Generate QR codes for offline sharing
7. **WhatsApp Integration**: Direct share to WhatsApp
8. **Performance Bonuses**: Tiered commission structure

### Integration Opportunities
1. **M-Pesa**: Direct commission payments
2. **Email**: Automated referral notifications
3. **Analytics**: Track link clicks and conversions
4. **CRM**: Sync with customer relationship management
5. **Reporting**: Advanced referral reports

## Support

### For Agents
- Contact: support@stokika.com
- WhatsApp: +254 700 123 456
- Dashboard: Help & Support section

### For Developers
- Documentation: /docs/affiliate-system
- API Reference: /docs/api
- GitHub: stokika/affiliate-system

## Changelog

### Version 1.0.0 (2025-01-XX)
- Initial release
- Affiliate link generation
- Manual code entry
- Dashboard integration
- Commission tracking
- Real-time stats

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready
