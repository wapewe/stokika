# M-Pesa Timeout Detection - Quick Reference

## Quick Commands

### Check Pending Payments
```sql
SELECT * FROM v_pending_payment_status;
```

### Run Timeout Detection Manually
```sql
SELECT * FROM detect_payment_timeouts();
```

### View Recent Timeouts
```sql
SELECT 
    application_code,
    phone_number,
    amount,
    failure_reason,
    created_at,
    updated_at
FROM stokika_kit_payments
WHERE payment_status = 'timeout'
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

### Monitor Timeout Rate (Last 24h)
```sql
SELECT 
    payment_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM stokika_kit_payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY payment_status
ORDER BY count DESC;
```

### Check At-Risk Payments
```sql
SELECT 
    application_code,
    seconds_pending,
    timeout_risk
FROM v_pending_payment_status
WHERE timeout_risk IN ('WARNING', 'SHOULD_TIMEOUT')
ORDER BY seconds_pending DESC;
```

## Timeout States

- **OK**: < 60 seconds pending
- **WARNING**: 60-90 seconds pending  
- **SHOULD_TIMEOUT**: > 90 seconds pending

## Admin Actions

When a payment times out:
1. User sees "Payment timed out" message
2. User can click "Retry Payment" button
3. System creates new payment attempt
4. Original timed-out record remains for audit

## Alerting Thresholds

- **Normal**: < 5% timeout rate
- **Warning**: 5-10% timeout rate
- **Critical**: > 10% timeout rate

## Troubleshooting

**High timeout rate?**
- Check M-Pesa service status
- Verify callback URL is reachable
- Check for network issues
- Review callback handler logs

**Payments not timing out?**
- Verify scheduled job is running
- Check pg_cron job status
- Manually run: SELECT * FROM detect_payment_timeouts();

---
Last Updated: August 26, 2026
