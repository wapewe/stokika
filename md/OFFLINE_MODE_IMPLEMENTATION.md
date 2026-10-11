# Offline Mode Implementation for Field Agents

## Overview
Complete robust offline functionality has been implemented for field agents to work seamlessly without internet connection.

## Features Implemented

### 1. **Service Worker (PWA)**
- **File:** `/service-worker.js`
- Caches static assets (HTML, CSS, JS, images)
- Enables app to load without internet
- Background sync for queued data
- Runtime caching for dynamic content

### 2. **Offline Manager**
- **File:** `/js/offline-manager.js`
- IndexedDB storage for offline data
- Automatic sync when connection restored
- Real-time online/offline status detection
- Pending sync counter

### 3. **Data Storage (IndexedDB)**
Stores offline:
- Vendor onboarding forms
- Supplier onboarding forms
- Visit logs
- Photos (base64 encoded)
- Cached vendor/supplier lists

### 4. **Offline Form Handler**
- **File:** `/js/offline-form-handler.js`
- Intercepts vendor/supplier registration forms
- Saves form data offline when no connection
- Handles file uploads offline
- Auto-syncs when online

### 5. **PWA Manifest**
- **File:** `/manifest.json`
- Makes app installable on mobile devices
- Standalone app experience
- Custom icons and theme colors

### 6. **UI Indicators**
- **File:** `/css/offline-styles.css`
- Online/Offline status badge
- Pending sync counter
- Offline notifications
- Visual feedback for all offline actions

## How It Works

### Vendor/Supplier Onboarding Offline:
1. Field agent fills vendor/supplier form
2. Clicks submit while offline
3. Form data saved to IndexedDB
4. User sees "Saved offline" confirmation
5. When online, data auto-syncs to Supabase
6. User gets "Synced successfully" notification

### Visit Logs Offline:
1. Agent logs vendor visit
2. Data stored in IndexedDB
3. Syncs automatically when online

### Photo Capture Offline:
1. Agent takes photos
2. Photos converted to base64
3. Stored in IndexedDB
4. Uploaded when connection available

## Files Created/Modified

### New Files:
1. `/service-worker.js` - PWA service worker
2. `/js/offline-manager.js` - Core offline functionality
3. `/js/offline-form-handler.js` - Form interception
4. `/manifest.json` - PWA manifest
5. `/html/offline.html` - Offline fallback page
6. `/css/offline-styles.css` - Offline UI styles
7. `/OFFLINE_MODE_IMPLEMENTATION.md` - This documentation

### Modified Files:
1. `/html/agent.html` - Added offline scripts and status indicators
2. `/index.html` - Added offline support for vendor/supplier forms

## Usage Instructions

### For Field Agents:

1. **First Time Setup:**
   - Open agent dashboard while online
   - App will cache necessary files
   - Install app to home screen (optional)

2. **Working Offline:**
   - Open app (works without internet)
   - Fill vendor/supplier forms normally
   - Submit forms (saved offline automatically)
   - Log visits (saved offline)
   - Take photos (saved offline)

3. **Syncing:**
   - Connect to internet
   - App auto-syncs all offline data
   - Check sync badge for pending items
   - Green badge = all synced
   - Orange badge = items pending

### Status Indicators:
- 🟢 **Online** - Connected, real-time sync
- 🔴 **Offline** - No connection, saving locally
- **Badge Number** - Pending items to sync

## Technical Details

### IndexedDB Stores:
```javascript
{
  pending_submissions: {
    id, type, data, timestamp, synced
  },
  cached_vendors: {
    id, ...vendor_data
  },
  cached_suppliers: {
    id, ...supplier_data
  },
  visit_logs: {
    id, ...visit_data, synced
  },
  photos: {
    id, fieldName, fileData, timestamp, synced
  }
}
```

### Sync Strategy:
- **Automatic:** Syncs when connection detected
- **Background:** Uses Background Sync API
- **Retry:** Failed syncs retry automatically
- **Conflict Resolution:** Timestamp-based

## Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial (no background sync)
- Mobile browsers: Full support

## Storage Limits
- IndexedDB: ~50MB per origin
- Service Worker cache: ~50MB
- Total: ~100MB offline storage

## Testing Offline Mode

1. **Chrome DevTools:**
   - Open DevTools (F12)
   - Network tab → Throttling → Offline
   - Test form submissions

2. **Real Device:**
   - Enable airplane mode
   - Test all functionality
   - Disable airplane mode
   - Verify auto-sync

## Maintenance

### Clear Offline Data:
```javascript
// In browser console
indexedDB.deleteDatabase('stokika-offline');
```

### Force Sync:
```javascript
// In browser console
window.offlineManager.syncPendingData();
```

### Check Pending Items:
```javascript
// In browser console
window.offlineManager.getPendingCount();
```

## Future Enhancements

### Possible Additions:
1. Offline maps for vendor locations
2. Conflict resolution UI
3. Selective sync (choose what to sync)
4. Compression for photos
5. Offline analytics dashboard
6. Export offline data as backup

## Security Considerations

- All offline data encrypted in IndexedDB
- Service worker only caches public assets
- Sensitive data cleared on logout
- Session tokens not cached
- HTTPS required for service workers

## Troubleshooting

### Issue: Data not syncing
**Solution:** Check online status, force sync manually

### Issue: App not loading offline
**Solution:** Clear cache, reload while online first

### Issue: Forms not saving offline
**Solution:** Check IndexedDB quota, clear old data

### Issue: Photos too large
**Solution:** Compress images before upload

## Support

For issues or questions:
- Check browser console for errors
- Verify service worker registration
- Test with Chrome DevTools offline mode
- Contact admin if sync fails repeatedly
