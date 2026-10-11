# Local Web Server Setup Guide for dalana.html

## ✅ CRITICAL FIX APPLIED
Fixed JavaScript syntax error on line 201 that was breaking animations!

## Why You See Errors

You're opening dalana.html with `file://` protocol (double-clicking the file).
This causes CORS errors and prevents many features from working.

## 🚀 SOLUTION: Run a Local Web Server

### Option 1: Python (Recommended - Easiest)

**If you have Python installed:**

1. Open PowerShell in the stokika folder
2. Run ONE of these commands:

```powershell
# Python 3:
python -m http.server 8000

# Python 2:
python -m SimpleHTTPServer 8000
```

3. Open browser to: http://localhost:8000/dalana.html

### Option 2: Node.js (http-server)

**If you have Node.js installed:**

1. Install http-server globally:
```powershell
npm install -g http-server
```

2. Run in stokika folder:
```powershell
http-server -p 8000
```

3. Open browser to: http://localhost:8000/dalana.html

### Option 3: PHP (If you have PHP)

```powershell
php -S localhost:8000
```

Then: http://localhost:8000/dalana.html

### Option 4: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click dalana.html
3. Select "Open with Live Server"

## 🎯 JUST FOR TESTING ANIMATIONS

If you ONLY want to test the hero animations (ignore other errors):

### Quick Fix for File Protocol:

Open dalana.html and temporarily comment out problematic scripts:

```html
<!-- Comment these out for testing: -->
<!--
<script src="js/core/config-loader.js"></script>
<script src="js/security/csrf-protection.js"></script>
<script src="js/security/rate-limiter.js"></script>
<script src="js/features/audit-logger.js"></script>
<script src="js/auth/secure-auth.js"></script>
-->
```

Keep these (needed for animations):
```html
<script src="js/script.js"></script>
```

## ✅ After Starting Web Server

You should see in console:
```
🎬 Hero initialization - Found 7 slides
🚀 Initializing hero animations...
✨ Animating slide 0
✅ Loaded class added to slide 0
```

NO MORE syntax errors!
Animations will play smoothly!

## 🐛 Current Errors Explained

1. **CSP violations** - Security headers don't work in file:// protocol
2. **CORS errors** - Cannot fetch files with file:// protocol
3. **Missing config** - Backend PHP files need a server
4. **Syntax error in script.js** - ✅ NOW FIXED!

## 💡 Recommendation

For FULL functionality testing:
→ Use Python http.server (simplest, no installation usually needed)

For ANIMATION testing only:
→ Comment out backend-dependent scripts
→ Open file directly

---

**The syntax error is now fixed. Animations should work even in file:// mode
if you comment out the backend scripts!**

