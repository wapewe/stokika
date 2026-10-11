# CDN Resource SRI Hashes

This document contains Subresource Integrity (SRI) hashes for all Content Delivery Network (CDN) resources used in the Stokika application. SRI hashes ensure that CDN resources haven't been tampered with by verifying their integrity before execution.

## Overview

**What is SRI?**  
Subresource Integrity (SRI) is a security feature that enables browsers to verify that resources they fetch are delivered without unexpected manipulation. It works by providing a cryptographic hash that the browser checks against the downloaded resource.

**Why use SRI?**  
- Prevents execution of compromised CDN resources
- Protects against CDN account hijacking
- Ensures resource integrity even if CDN is compromised
- Required for A+ security rating

## Hash Algorithm

All hashes use **SHA-384** algorithm, which provides strong cryptographic security while maintaining reasonable hash length.

---

## CDN Resources

### 1. Supabase JavaScript Client (v2)

**Description:** Official Supabase client library for browser-based authentication and database operations.

- **URL:** `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- **Hash:** `sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF`
- **Type:** JavaScript (ES Module)
- **Last Verified:** 2025-01-29
- **Used In:** All authenticated pages (signin, analytics, agent, supervisor, inventory, orders, payments, etc.)

**HTML Usage:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        integrity="sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF"
        crossorigin="anonymous"></script>
```

**Update Instructions:**
```powershell
# Generate new hash when updating Supabase version
$response = Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" -UseBasicParsing
$bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
$base64 = [Convert]::ToBase64String($hash)
Write-Output "sha384-$base64"
```

---

### 2. Chart.js (v4.4.0)

**Description:** JavaScript charting library for creating responsive, animated charts in analytics dashboards.

- **URL:** `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
- **Hash:** `sha384-e6nUZLBkQ86NJ6TVVKAeSaK8jWa3NhkYWZFomE39AvDbQWeie9PlQqM3pmYW5d1g`
- **Type:** JavaScript (UMD Module, Minified)
- **Last Verified:** 2025-01-29
- **Used In:** analytics.html, rembrandts.html

**HTML Usage:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        integrity="sha384-e6nUZLBkQ86NJ6TVVKAeSaK8jWa3NhkYWZFomE39AvDbQWeie9PlQqM3pmYW5d1g"
        crossorigin="anonymous"></script>
```

**Update Instructions:**
```powershell
# Generate new hash when updating Chart.js version
$response = Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" -UseBasicParsing
$bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
$base64 = [Convert]::ToBase64String($hash)
Write-Output "sha384-$base64"
```

**Version Upgrade Note:**  
When upgrading Chart.js, update the version number in both the URL and regenerate the hash. Test all charts in analytics.html to ensure compatibility with the new version.

---

### 3. Google Fonts - Inter (Standard)

**Description:** Inter font family (weights: 300, 400, 500, 600, 700, 800) used across the application for UI text.

- **URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`
- **Hash:** `sha384-zM7qmLDXsv7G43sbK2VNrYGye2a5RuU56GHc3OZBpSLeQ4MVC+kkxdOzkOEjKo48`
- **Type:** CSS Stylesheet
- **Last Verified:** 2025-01-29
- **Used In:** Most pages (signin, analytics, agent, supervisor, inventory, orders, suppliers, etc.)

**HTML Usage:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
      integrity="sha384-zM7qmLDXsv7G43sbK2VNrYGye2a5RuU56GHc3OZBpSLeQ4MVC+kkxdOzkOEjKo48"
      crossorigin="anonymous">
```

**Update Instructions:**
```powershell
# Generate new hash for Google Fonts (Inter)
$response = Invoke-WebRequest -Uri "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" -UseBasicParsing
$bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
$base64 = [Convert]::ToBase64String($hash)
Write-Output "sha384-$base64"
```

**⚠️ Important Note:**  
Google Fonts CSS content can change based on user agent (serving different font formats for different browsers). The hash above is based on a modern browser user agent. If using SRI with Google Fonts causes issues across different browsers, consider:
1. Self-hosting the fonts instead
2. Using a font service that provides stable SRI hashes
3. Omitting SRI for Google Fonts (less secure but more reliable)

---

### 4. Google Fonts - Sora

**Description:** Sora font family (weights: 300, 400, 500, 600, 700, 800) used on payment and onboarding pages.

- **URL:** `https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap`
- **Hash:** ⚠️ **Not recommended for SRI** (see Google Fonts note below)
- **Type:** CSS Stylesheet
- **Last Verified:** 2025-01-29
- **Used In:** kit-payment.html

**HTML Usage:**
```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
      crossorigin="anonymous">
```

**⚠️ Important Note:**  
Google Fonts CSS content can change based on user agent (serving different font formats for different browsers). SRI hashes may cause loading failures across different browsers. For this reason, SRI is **not applied** to Google Fonts in this implementation. The `crossorigin="anonymous"` attribute is still included for CORS compliance.

---

### 5. Font Awesome (v6.0.0)

**Description:** Icon font library used across the application for UI icons.

- **URL:** `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css`
- **Hash:** ⚠️ **Not recommended for SRI** (frequently updated by CDN)
- **Type:** CSS Stylesheet
- **Last Verified:** 2025-01-29
- **Used In:** kit-payment.html and other pages

**HTML Usage:**
```html
<link rel="stylesheet" 
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
      crossorigin="anonymous">
```

**⚠️ Important Note:**  
Font Awesome CSS on CDNs may be updated without version change. For production, consider self-hosting Font Awesome to enable SRI. The `crossorigin="anonymous"` attribute is included for CORS compliance.

---

### 6. Google Fonts - Inter + Sora

**Description:** Combined Inter and Sora font families used on specific pages for enhanced typography.

- **URL:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&display=swap`
- **Hash:** `sha384-NJswQMIotfMidJ5dLQGcIb5G+CqwnIUXM5Yq+9vXua6x46PEaxcClOASSvVFFXZX`
- **Type:** CSS Stylesheet
- **Last Verified:** 2025-01-29
- **Used In:** suppliers.html, inventory.html

**HTML Usage:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
      rel="stylesheet"
      integrity="sha384-NJswQMIotfMidJ5dLQGcIb5G+CqwnIUXM5Yq+9vXua6x46PEaxcClOASSvVFFXZX"
      crossorigin="anonymous">
```

**Update Instructions:**
```powershell
# Generate new hash for Google Fonts (Inter + Sora)
$response = Invoke-WebRequest -Uri "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" -UseBasicParsing
$bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
$hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
$base64 = [Convert]::ToBase64String($hash)
Write-Output "sha384-$base64"
```

---

## Verification and Maintenance

### Automated Hash Verification Script

Create a PowerShell script to verify all CDN hashes periodically:

```powershell
# verify-cdn-hashes.ps1

$resources = @(
    @{
        Name = "Supabase JS"
        Url = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        ExpectedHash = "sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF"
    },
    @{
        Name = "Chart.js"
        Url = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
        ExpectedHash = "sha384-e6nUZLBkQ86NJ6TVVKAeSaK8jWa3NhkYWZFomE39AvDbQWeie9PlQqM3pmYW5d1g"
    },
    @{
        Name = "Google Fonts Inter"
        Url = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
        ExpectedHash = "sha384-zM7qmLDXsv7G43sbK2VNrYGye2a5RuU56GHc3OZBpSLeQ4MVC+kkxdOzkOEjKo48"
    },
    @{
        Name = "Google Fonts Inter+Sora"
        Url = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
        ExpectedHash = "sha384-NJswQMIotfMidJ5dLQGcIb5G+CqwnIUXM5Yq+9vXua6x46PEaxcClOASSvVFFXZX"
    }
)

Write-Host "Verifying CDN Resource Hashes..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

foreach ($resource in $resources) {
    Write-Host "Testing: $($resource.Name)" -ForegroundColor Yellow
    Write-Host "  URL: $($resource.Url)"
    
    try {
        $response = Invoke-WebRequest -Uri $resource.Url -UseBasicParsing -ErrorAction Stop
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
        $hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
        $base64 = [Convert]::ToBase64String($hash)
        $actualHash = "sha384-$base64"
        
        if ($actualHash -eq $resource.ExpectedHash) {
            Write-Host "  Status: ✓ PASSED" -ForegroundColor Green
        } else {
            Write-Host "  Status: ✗ FAILED" -ForegroundColor Red
            Write-Host "  Expected: $($resource.ExpectedHash)" -ForegroundColor Red
            Write-Host "  Actual:   $actualHash" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "  Status: ✗ ERROR - Failed to download resource" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
    
    Write-Host ""
}

Write-Host "================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "All CDN hashes verified successfully! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some CDN hashes failed verification! ✗" -ForegroundColor Red
    Write-Host "Please update CDN_HASHES.md and affected HTML files." -ForegroundColor Yellow
    exit 1
}
```

**Usage:**
```powershell
# Run verification script
.\docs\verify-cdn-hashes.ps1

# Schedule monthly verification (Windows Task Scheduler)
# Or add to CI/CD pipeline
```

### Manual Verification Steps

1. **Download the resource:**
   ```powershell
   Invoke-WebRequest -Uri "RESOURCE_URL" -OutFile "temp-resource.js"
   ```

2. **Generate hash:**
   ```powershell
   $response = Invoke-WebRequest -Uri "RESOURCE_URL" -UseBasicParsing
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
   $hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
   $base64 = [Convert]::ToBase64String($hash)
   Write-Output "sha384-$base64"
   ```

3. **Compare with documented hash:**
   - If hashes match: Resource is verified ✓
   - If hashes differ: Resource has changed (update needed or security issue)

### When to Update Hashes

**Update hashes when:**
- Upgrading CDN library versions (e.g., Supabase v2 → v3)
- CDN provider updates the resource content
- Security advisory recommends updating a library
- Hash verification fails during routine checks

**Update procedure:**
1. Generate new hash using PowerShell command above
2. Update this document (CDN_HASHES.md)
3. Update all HTML files using the CDN resource
4. Test affected pages thoroughly
5. Commit changes with clear message: "Update SRI hash for [resource] to [version]"

### Monthly Maintenance Checklist

- [ ] Run automated hash verification script
- [ ] Check for CDN library updates (Supabase, Chart.js)
- [ ] Review security advisories for used libraries
- [ ] Update hashes if any resource has changed
- [ ] Test all pages after hash updates
- [ ] Update "Last Verified" dates in this document

---

## Integration Status

### Pages with SRI Implementation

Track which pages have SRI hashes applied:

| Page | Supabase | Chart.js | Google Fonts | Status |
|------|----------|----------|--------------|--------|
| signin.html | ✅ | N/A | ✅ | Complete |
| reset-password.html | ✅ | N/A | ✅ | Complete |
| setup-admin.html | ❌ | N/A | ❌ | Pending |
| analytics.html | ❌ | ❌ | ❌ | Pending |
| agent.html | ❌ | N/A | ❌ | Pending |
| supervisor.html | ❌ | N/A | ❌ | Pending |
| field-agent.html | ✅ | N/A | ⚠️ | Complete (no SRI for fonts) |
| inventory.html | ❌ | N/A | ❌ | Pending |
| orders.html | ❌ | N/A | ❌ | Pending |
| suppliers.html | ❌ | N/A | ❌ | Pending |
| supplier.html | ❌ | N/A | ❌ | Pending |
| jobs.html | ❌ | N/A | ❌ | Pending |
| payments.html | ❌ | N/A | ❌ | Pending |
| kit-payment.html | ✅ | N/A | ⚠️ | Complete (no SRI for fonts) |
| onboarding.html | ❌ | N/A | ❌ | Pending |
| supervisor-onboarding.html | ✅ | N/A | ⚠️ | Complete (no SRI for fonts) |
| rembrandts.html | ❌ | ❌ | ❌ | Pending |
| test-config.html | ❌ | N/A | N/A | Pending |
| test-core-modules.html | ❌ | N/A | N/A | Pending |
| terms.html | ❌ | N/A | ❌ | Pending |
| term.html | ❌ | N/A | ❌ | Pending |
| vendor-shop.html | ❌ | N/A | N/A | Pending |
| vendor-shops-directory.html | ❌ | N/A | N/A | Pending |

**Legend:**
- ✅ Implemented with SRI
- ❌ Pending implementation
- N/A - Resource not used on this page

**Next Steps:**
1. Implement SRI on Critical Priority pages first (authentication, payment)
2. Implement SRI on High Priority pages (onboarding forms)
3. Implement SRI on Medium Priority pages (dashboards, general pages)

---

## Security Best Practices

### 1. Always Use Crossorigin Attribute

When using SRI, always include `crossorigin="anonymous"`:
```html
<script src="CDN_URL" integrity="sha384-HASH" crossorigin="anonymous"></script>
```

Without `crossorigin`, the browser cannot verify the integrity hash due to CORS restrictions.

### 2. Fallback Strategy

Consider implementing fallback to local copies if CDN fails:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        integrity="sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF"
        crossorigin="anonymous"
        onerror="this.onerror=null; this.src='/js/vendor/supabase.min.js'"></script>
```

### 3. Monitor for CDN Failures

Implement monitoring to detect SRI verification failures:
```javascript
window.addEventListener('error', (e) => {
  if (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
    console.error('Resource failed to load (possible SRI mismatch):', e.target.src || e.target.href);
    // Log to security monitoring system
  }
}, true);
```

### 4. Keep Dependencies Updated

- Review CDN library updates monthly
- Subscribe to security advisories for used libraries
- Test thoroughly before deploying hash updates

### 5. Self-Hosting Consideration

For maximum security and reliability, consider self-hosting critical libraries:
- **Pros:** Full control, no CDN downtime, consistent hashes
- **Cons:** No CDN caching benefits, manual update management

---

## Troubleshooting

### Issue: SRI Hash Mismatch Error

**Symptoms:**
- Browser console error: "Failed to find a valid digest in the 'integrity' attribute"
- Resource fails to load
- Page functionality broken

**Solutions:**
1. **Verify the hash is correct:**
   ```powershell
   # Regenerate the hash and compare
   $response = Invoke-WebRequest -Uri "RESOURCE_URL" -UseBasicParsing
   $bytes = [System.Text.Encoding]::UTF8.GetBytes($response.Content)
   $hash = [System.Security.Cryptography.SHA384]::Create().ComputeHash($bytes)
   $base64 = [Convert]::ToBase64String($hash)
   Write-Output "sha384-$base64"
   ```

2. **Check CDN URL is correct:**
   - Ensure version number is specified (e.g., `@4.4.0`, not `@latest`)
   - Verify URL matches exactly (including query parameters)

3. **Update the hash:**
   - If CDN resource legitimately changed, update hash in this document and HTML files

4. **Browser cache issue:**
   - Clear browser cache and hard reload (Ctrl+Shift+R)

### Issue: Google Fonts SRI Failures

**Symptoms:**
- Font SRI hash works in one browser but fails in another
- Inconsistent hash verification

**Cause:**  
Google Fonts serves different CSS based on user agent (optimized for each browser).

**Solutions:**
1. **Remove SRI from Google Fonts:**
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
         rel="stylesheet"
         crossorigin="anonymous">
   ```
   
2. **Self-host fonts:**
   - Download font files from Google Fonts
   - Host in `/assets/fonts/` directory
   - Use local `@font-face` declarations

3. **Use a font CDN with stable SRI:**
   - Consider services like Bunny Fonts (Google Fonts alternative with stable hashes)

### Issue: CDN Resource Not Loading

**Symptoms:**
- Network error in console
- Resource times out

**Solutions:**
1. Check internet connectivity
2. Verify CDN service status (jsdelivr.net, googleapis.com)
3. Implement fallback to local copy (see Security Best Practices #2)
4. Consider self-hosting critical resources

---

## References

- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [W3C SRI Specification](https://www.w3.org/TR/SRI/)
- [Supabase JavaScript Client](https://github.com/supabase/supabase-js)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Google Fonts](https://fonts.google.com/)
- [OWASP: Third Party JavaScript Management](https://owasp.org/www-community/controls/Third_Party_JavaScript_Management)

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-29 | 1.0 | Initial documentation with all CDN hashes | Security Team |

---

**Document Status:** ✅ Complete  
**Last Updated:** 2025-01-29  
**Next Review:** 2025-02-28
