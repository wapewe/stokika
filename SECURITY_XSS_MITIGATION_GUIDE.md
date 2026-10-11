# XSS Vulnerability Mitigation Guide

## ⚠️ CRITICAL: XSS Vulnerabilities Found

This project contains multiple Cross-Site Scripting (XSS) vulnerabilities due to unsafe `innerHTML` usage. This document provides guidance on fixing these issues.

## Security Library

We've created `js/xss-protection.js` which provides safe alternatives to dangerous operations.

### Include in ALL HTML pages

```html
<script src="js/xss-protection.js"></script>
```

## Common Vulnerabilities and Fixes

### 1. Direct innerHTML Assignment (DANGEROUS ❌)

**Vulnerable Code:**
```javascript
// DANGEROUS - User input can inject scripts
element.innerHTML = `<div>${userInput}</div>`;
container.innerHTML = `<h3>${product.name}</h3>`;
```

**Secure Fix:**
```javascript
// Option 1: Use textContent for plain text (SAFEST)
element.textContent = userInput;

// Option 2: Use XSSProtection for HTML with user data
element.innerHTML = `<div>${XSSProtection.escapeHtml(userInput)}</div>`;

// Option 3: Use the convenience function
element.innerHTML = `<div>${sanitize(userInput)}</div>`;

// Option 4: Use safe template
element.innerHTML = XSSProtection.safeTemplate`<div>${userInput}</div>`;
```

### 2. Rendering Lists (DANGEROUS ❌)

**Vulnerable Code:**
```javascript
container.innerHTML = products.map(p => `
    <div class="product-card">
        <h3>${p.product_name}</h3>
        <p>${p.description}</p>
        <span>${p.price}</span>
    </div>
`).join('');
```

**Secure Fix:**
```javascript
// Option 1: Escape all user data
container.innerHTML = products.map(p => `
    <div class="product-card">
        <h3>${sanitize(p.product_name)}</h3>
        <p>${sanitize(p.description)}</p>
        <span>${sanitize(p.price)}</span>
    </div>
`).join('');

// Option 2: Use DOM methods (SAFEST)
products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const title = document.createElement('h3');
    title.textContent = p.product_name; // Safe - uses textContent
    
    const desc = document.createElement('p');
    desc.textContent = p.description;
    
    const price = document.createElement('span');
    price.textContent = p.price;
    
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(price);
    container.appendChild(card);
});

// Option 3: Use helper function
XSSProtection.renderList(container, products, (product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <h3>${sanitize(product.product_name)}</h3>
        <p>${sanitize(product.description)}</p>
        <span>${sanitize(product.price)}</span>
    `;
    return card;
});
```

### 3. Image URLs (DANGEROUS ❌)

**Vulnerable Code:**
```javascript
img.src = userProvidedUrl; // Could be javascript:alert('XSS')
element.innerHTML = `<img src="${product.image_url}">`;
```

**Secure Fix:**
```javascript
// Sanitize URLs first
img.src = XSSProtection.sanitizeUrl(userProvidedUrl);

// Or in template
element.innerHTML = `<img src="${sanitizeUrl(product.image_url)}">`;
```

### 4. Modal Dialogs (DANGEROUS ❌)

**Vulnerable Code:**
```javascript
modal.innerHTML = `
    <div class="modal-content">
        <h2>${title}</h2>
        <p>${message}</p>
    </div>
`;
```

**Secure Fix:**
```javascript
// Use safe modal creator
const modal = XSSProtection.createSafeModal(title, message, {
    className: 'modal-overlay'
});
document.body.appendChild(modal);

// Or escape values
modal.innerHTML = `
    <div class="modal-content">
        <h2>${sanitize(title)}</h2>
        <p>${sanitize(message)}</p>
    </div>
`;
```

### 5. Form Values and Attributes (DANGEROUS ❌)

**Vulnerable Code:**
```javascript
input.value = userInput; // Safe for value
input.setAttribute('data-id', userId); // Could be exploited
element.innerHTML = `<input value="${userInput}">`; // VERY DANGEROUS
```

**Secure Fix:**
```javascript
// Setting value property is generally safe
input.value = userInput; // OK

// Use escapeAttr for attributes in HTML strings
element.innerHTML = `<input value="${XSSProtection.escapeAttr(userInput)}">`;

// Or use DOM methods (SAFEST)
const input = document.createElement('input');
input.value = userInput;
input.setAttribute('data-id', userId);
```

## Files Requiring Updates

### High Priority (User-Generated Content)

1. **js/supplier.js** - Orders, inventory, payments display
2. **js/suppliers.js** - Supplier listing
3. **js/vendor-product-management.js** - Product listings
4. **js/vendor-shop-branding.js** - Shop profile and branding
5. **js/vendor-public-shop.js** - Public-facing shop (HIGH RISK)
6. **js/agent.js** - Agent dashboard
7. **js/inventory.js** - Inventory management
8. **js/orders.js** - Order management

### Medium Priority (Admin/Internal)

9. **js/analytics.js** - Analytics dashboards
10. **js/supervisor.js** - Supervisor dashboard
11. **js/field-agent.js** - Field agent interface
12. **js/kit-payment.js** - Payment processing
13. **js/onboarding-manager.js** - Onboarding system

### Lower Priority (Configuration/Internal)

14. **js/audit-logger.js** - Audit logs
15. **js/token-based-onboarding.js** - Token onboarding
16. **js/user-settings.js** - User settings

## Migration Checklist

For each JavaScript file:

- [ ] Add `<script src="js/xss-protection.js"></script>` to HTML pages that load the JS file
- [ ] Search for `.innerHTML =` patterns
- [ ] Determine if content contains user data or database values
- [ ] Replace with safe alternatives:
  - `textContent` for plain text
  - `XSSProtection.escapeHtml()` or `sanitize()` for HTML with user data
  - `XSSProtection.sanitizeUrl()` for URLs
  - `XSSProtection.escapeAttr()` for HTML attributes
- [ ] Test functionality after changes
- [ ] Look for `insertAdjacentHTML` (also vulnerable)
- [ ] Check for `document.write` (also vulnerable)

## Testing for XSS

### Test Payloads

Try these test strings in user inputs to verify protection:

```javascript
// Basic XSS
<script>alert('XSS')</script>

// IMG tag XSS
<img src=x onerror=alert('XSS')>

// Event handler XSS
<div onmouseover="alert('XSS')">Hover me</div>

// JavaScript protocol
<a href="javascript:alert('XSS')">Click</a>

// Data URL
<img src="data:text/html,<script>alert('XSS')</script>">
```

### Manual Testing

1. Enter test payloads in forms
2. Check if scripts execute
3. Inspect rendered HTML for unsafe tags
4. Verify URLs are sanitized
5. Check browser console for XSS warnings

### Automated Testing

```javascript
// Add to your test suite
function testXSSProtection() {
    const dangerous = `<script>alert('XSS')</script>`;
    const safe = XSSProtection.escapeHtml(dangerous);
    
    console.assert(
        !safe.includes('<script>'),
        'XSS protection failed'
    );
    
    console.log('✓ XSS protection working');
}
```

## Content Security Policy (CSP)

Add to your HTML pages or web server headers:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net https://cdn.supabase.co;
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    img-src 'self' data: https:;
    font-src 'self' https://cdn.jsdelivr.net;
    connect-src 'self' https://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
">
```

## Quick Reference Card

```javascript
// ❌ NEVER DO THIS
element.innerHTML = userInput;
element.innerHTML = `<div>${databaseValue}</div>`;
element.insertAdjacentHTML('beforeend', userContent);

// ✅ ALWAYS DO THIS
element.textContent = userInput;
element.innerHTML = `<div>${sanitize(databaseValue)}</div>`;
XSSProtection.appendHTML(element, userContent);
```

## Resources

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: innerHTML Security](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Support

For questions about XSS mitigation, consult with your security team or a web security specialist.

---

**Last Updated:** 2026-08-28  
**Status:** 🚨 CRITICAL - Immediate action required
