# Phone Validation - Corrected Documentation

## ✅ IMPORTANT CORRECTION

Both Safaricom and Airtel use BOTH 07XX and 01XX prefixes.

### Kenyan Mobile Number Prefixes

**07XX Series** (Both networks):
- Safaricom: 0700-0799
- Airtel: 0700-0799

**01XX Series** (Both networks):
- Safaricom: 0100-0199
- Airtel: 0100-0199

The validation accepts BOTH 07XX and 01XX because they are valid Kenyan mobile number formats used by both major carriers.

---

## Updated Documentation

### Flexible Phone Input

Users can enter phone numbers in these formats:
- `0712345678` (Kenyan mobile - 07XX series)
- `0123456789` (Kenyan mobile - 01XX series)
- `254712345678` (International format)
- `+254712345678` (International with + prefix)

**Note**: Both 07XX and 01XX prefixes are used by Safaricom and Airtel. The validation accepts both because they are valid Kenyan mobile formats, not because they distinguish between carriers.

---

## Validation Logic

```javascript
// Accepts 10-digit numbers starting with 0
if (starts with 0 && length === 10) {
    if (second digit is 7 or 1) {
        // Valid: 07XX or 01XX (both carriers use these)
        convert to 254X format
    } else {
        // Invalid: not a Kenyan mobile number
        reject
    }
}

// Accepts 12-digit numbers starting with 254
if (starts with 254 && length === 12) {
    if (fourth digit is 7 or 1) {
        // Valid: 2547XX or 2541XX
        accept
    } else {
        // Invalid: not a Kenyan mobile number
        reject
    }
}
```

---

## Examples

| User Enters    | Network     | Converts To    | Displays As     |
|----------------|-------------|----------------|-----------------|
| 0712345678     | Either      | 254712345678   | +254712345678   |
| 0722334455     | Either      | 254722334455   | +254722334455   |
| 0123456789     | Either      | 254123456789   | +254123456789   |
| 0111223344     | Either      | 254111223344   | +254111223344   |
| 254712345678   | Either      | 254712345678   | +254712345678   |
| +254712345678  | Either      | 254712345678   | +254712345678   |

**Note**: The validation does not distinguish between Safaricom and Airtel - it accepts all valid Kenyan mobile number formats used by both carriers.

---

## Why 07XX and 01XX?

In Kenya:
- **07XX series**: Traditional mobile number prefix used by both Safaricom and Airtel
- **01XX series**: Additional mobile number prefix used by both carriers to accommodate growth

Both prefixes are equally valid for mobile numbers regardless of which network the number is registered on.

---

## Updated Quick Reference

### Accepted Formats
- ✅ 07XX (Kenyan mobile - both carriers)
- ✅ 01XX (Kenyan mobile - both carriers)
- ✅ 254X (International format)
- ✅ +254X (International with +)

### Rejected Formats
- ❌ 02XX (Not mobile)
- ❌ 03XX (Not mobile)
- ❌ 04XX (Not mobile)
- ❌ 05XX (Not mobile)
- ❌ 06XX (Not mobile)
- ❌ 08XX (Not mobile)
- ❌ 09XX (Not mobile)

Only 07XX and 01XX are valid mobile number prefixes in Kenya.

---

## Corrected Error Messages

**Current (Accurate)**:
"Invalid phone. Use 07XX, 01XX (10 digits) or 254X (12 digits)"

This is correct because it doesn't imply carrier distinction - it simply states the valid Kenyan mobile number formats.

---

## M-Pesa Compatibility

M-Pesa works with phone numbers from both Safaricom and Airtel (and other networks).

The validation accepts all valid Kenyan mobile numbers regardless of carrier:
- All 07XX numbers ✅
- All 01XX numbers ✅

---

Date: December 2024
Correction: Both Safaricom and Airtel use 07XX and 01XX prefixes
