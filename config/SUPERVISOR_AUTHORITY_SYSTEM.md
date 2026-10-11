# Supervisor Authority System

## Overview
Supervisors can manage field agents in their jurisdiction with limited permissions.

## Supervisor Capabilities

### ✅ What Supervisors CAN Do:
1. **View Field Agents** in their assigned jurisdiction/territory
2. **Help with Issues** affecting vendors/suppliers
3. **Update Agent Status** (mark as active, inactive, on leave)
4. **View Agent Performance** metrics and reports
5. **Assign Tasks** to field agents
6. **Approve/Reject Vendor Applications** submitted by their agents
7. **Monitor Agent Activity** (visits, orders created)
8. **Communicate** with agents via messaging system

### ❌ What Supervisors CANNOT Do:
1. **Delete User Accounts** - Only admin can delete
2. **Create User Accounts** - Only admin can create
3. **Access Other Jurisdictions** - Limited to their assigned territory
4. **Modify RLS Policies** - System-level access denied
5. **View Admin Dashboard** - No access to admin.html
6. **Change User Roles** - Cannot promote/demote users

## Database Structure

### Supervisors Table Fields:
```sql
- id (UUID)
- user_id (UUID) - Links to auth.users
- supervisor_number (TEXT)
- full_name (TEXT)
- email (TEXT)
- phone (TEXT)
- county (TEXT)
- assigned_region (TEXT) - Their jurisdiction
- is_active (BOOLEAN) - Admin activates/deactivates
- can_approve_orders (BOOLEAN) - Admin grants this permission
- approval_status (TEXT)
- interview_status (TEXT)
```

### Field Agents Table Fields:
```sql
- id (UUID)
- user_id (UUID)
- agent_number (TEXT)
- full_name (TEXT)
- email (TEXT)
- phone (TEXT)
- county (TEXT)
- assigned_supervisor_id (UUID) - Links to supervisors table
- approval_status (TEXT)
```

## Implementation Steps

### 1. Add Supervisor Assignment Field
```sql
ALTER TABLE field_agents 
ADD COLUMN assigned_supervisor_id UUID REFERENCES supervisors(id);
```

### 2. Create RLS Policies for Supervisors
```sql
-- Supervisors can view their assigned agents
CREATE POLICY "Supervisors can view assigned agents"
ON field_agents FOR SELECT
TO authenticated
USING (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);

-- Supervisors can update their assigned agents (limited fields)
CREATE POLICY "Supervisors can update assigned agents"
ON field_agents FOR UPDATE
TO authenticated
USING (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);
```

### 3. Supervisor Dashboard Features
- **My Agents Tab**: Shows only agents assigned to this supervisor
- **Territory Map**: Visual representation of their jurisdiction
- **Performance Metrics**: Agent performance in their region
- **Vendor Management**: Help agents with vendor/supplier issues
- **Task Assignment**: Assign tasks to specific agents

### 4. Admin Controls
Admin can:
- Assign agents to supervisors
- Change supervisor jurisdiction
- Grant/revoke order approval permission
- Activate/deactivate supervisor accounts
- View all supervisor activity logs

## Security Considerations
1. **Jurisdiction Enforcement**: RLS policies ensure supervisors only see their assigned agents
2. **No Delete Permission**: Supervisors cannot delete any records
3. **No Create Permission**: Supervisors cannot create new users
4. **Audit Logging**: All supervisor actions are logged
5. **Admin Override**: Admin can always override supervisor decisions

## Future Enhancements
1. **Multi-level Hierarchy**: Regional managers → Supervisors → Agents
2. **Performance Bonuses**: Supervisor bonuses based on team performance
3. **Training Modules**: Supervisors can assign training to agents
4. **Real-time Chat**: Direct messaging between supervisors and agents
5. **Mobile App**: Supervisor mobile app for field management
