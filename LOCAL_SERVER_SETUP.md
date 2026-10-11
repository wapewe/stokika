# Local Development Server Setup

## Problem: Can't Open HTML Files Directly

You're opening files using `file://` protocol which causes:
- CORS errors (can't load API files)
- Failed fetch requests
- Security restrictions

## Solution: Use a Local Web Server

### Option 1: PHP Built-in Server (Recommended)

If you have PHP installed:

```powershell
# Navigate to your project directory
cd "C:\Users\ADMIN\Music\stokika"

# Start PHP server on port 8000
php -S localhost:8000
```

Then open: **http://localhost:8000/kit-payment.html**

### Option 2: Python HTTP Server

If you have Python installed:

```powershell
# Navigate to your project directory
cd "C:\Users\ADMIN\Music\stokika"

# For Python 3.x
python -m http.server 8000

# OR for Python 2.x
python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000/kit-payment.html**

### Option 3: Node.js http-server

If you have Node.js installed:

```powershell
# Install http-server globally (one time)
npm install -g http-server

# Navigate to your project directory
cd "C:\Users\ADMIN\Music\stokika"

# Start server
http-server -p 8000
```

Then open: **http://localhost:8000/kit-payment.html**

### Option 4: VS Code Live Server Extension

If you use Visual Studio Code:

1. Install "Live Server" extension
2. Right-click on kit-payment.html
3. Select "Open with Live Server"

## Quick Start Script (PowerShell)

Save this as `start-server.ps1` in your project root:

```powershell
# Check for PHP
if (Get-Command php -ErrorAction SilentlyContinue) {
    Write-Host "Starting PHP development server..." -ForegroundColor Green
    Write-Host "Open: http://localhost:8000/kit-payment.html" -ForegroundColor Cyan
    php -S localhost:8000
}
# Check for Python
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Starting Python HTTP server..." -ForegroundColor Green
    Write-Host "Open: http://localhost:8000/kit-payment.html" -ForegroundColor Cyan
    python -m http.server 8000
}
else {
    Write-Host "Neither PHP nor Python found!" -ForegroundColor Red
    Write-Host "Please install PHP or Python to run a local server." -ForegroundColor Yellow
}
```

Run with: `.\start-server.ps1`

## What This Fixes

✅ CORS errors resolved
✅ API file access works
✅ Fetch requests work
✅ Session management works
✅ CSRF protection works

## After Starting Server

1. Start the server (choose one option above)
2. Open browser to http://localhost:8000/kit-payment.html
3. Page should load correctly now
4. All API calls will work

## Important Notes

- Don't use `file://` protocol for testing
- Always use a local web server
- Default port is 8000 (can be changed)
- Server must stay running while testing

