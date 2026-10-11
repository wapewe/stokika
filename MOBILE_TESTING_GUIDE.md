# Mobile Testing Guide for dalana.html

## Quick Test Steps

### 1. Open dalana.html on Mobile Device
- Open the file in a mobile browser (Chrome, Safari, Firefox)
- Or use Chrome DevTools Device Toolbar (F12 → Toggle device toolbar)

### 2. Test Mobile Menu
- [ ] Hamburger icon visible in top-right corner
- [ ] Click hamburger → menu slides in from right
- [ ] Menu has white background with navigation links
- [ ] Click link → menu closes automatically
- [ ] Click outside menu → menu closes
- [ ] Click hamburger again → menu closes

### 3. Test Hero Section - Slide 1 (Main)
- [ ] stokika logo icon visible and properly sized
- [ ] Title "sotika na stokika" displays completely
- [ ] Tagline "Get sorted with stokika" readable
- [ ] Description text visible and not cut off
- [ ] Both buttons (Join/Learn More) display full-width
- [ ] Stats show in 3-column grid:
  - 1000+ MSMEs Empowered
  - 47 Counties Covered
  - 24/7 Platform Support
- [ ] Stats don't overlap with content above

### 4. Test Hero Section - Slide 2 (Vendor Financing)
- [ ] Green icon badge visible
- [ ] Title "Smart Stock Financing for Vendors" displays
- [ ] All text elements appear within 1 second
- [ ] Stats visible: 5% | 47 | 24/7

### 5. Test Hero Section - Slide 3 (Suppliers)
- [ ] Yellow icon badge visible
- [ ] Title "Connect With Verified Suppliers" displays
- [ ] Stats visible: 500+ | 47 | 24/7

### 6. Test Hero Section - Slides 4-7
- [ ] All slides load text quickly (< 1 second)
- [ ] No icons appear off-screen at top
- [ ] Stats remain visible and don't overlap
- [ ] Content stays within viewport

### 7. Test Scrolling Between Slides
- [ ] Swipe up/down changes slides smoothly
- [ ] Slide indicators on right side update
- [ ] No horizontal scrolling

### 8. Test Different Screen Sizes

#### iPhone SE (375px)
- [ ] Stats display in single column OR 3 columns
- [ ] All text readable
- [ ] Buttons full-width

#### iPhone 12/13 (390px)
- [ ] Stats in 3-column grid
- [ ] Icon badges 60px size
- [ ] Title readable

#### Samsung Galaxy (412px)
- [ ] Layout similar to iPhone 12
- [ ] All elements visible

#### Tablet (768px)
- [ ] Mobile menu still appears
- [ ] Layout optimized for tablet

### 9. Test Landscape Mode
- [ ] Rotate device to landscape
- [ ] Content adjusts properly
- [ ] Stats remain visible
- [ ] Menu still functions

### 10. Test Animations
- [ ] First slide animates on load
- [ ] Icons fade in first
- [ ] Title fades in second
- [ ] Tagline fades in third
- [ ] Buttons and stats fade in last
- [ ] Animation timing feels smooth (not too slow)

## Common Issues to Check

### If icons don't appear:
1. Check console for image loading errors
2. Verify image paths are correct
3. Clear browser cache

### If stats overlap:
1. Check that mobile-optimization.css is loading
2. Verify viewport meta tag is present
3. Test in different browser

### If menu doesn't work:
1. Check JavaScript console for errors
2. Verify mobileMenuToggle ID exists
3. Test script.js is loading

### If animations are slow:
1. Animations should complete in < 1 second on mobile
2. Check mobile-optimization.css is loaded after styles.css

## Browser Testing

- [ ] Chrome Mobile (Android)
- [ ] Safari (iOS)
- [ ] Firefox Mobile
- [ ] Samsung Internet
- [ ] Edge Mobile

## Expected Results

✅ **Pass Criteria:**
- All content visible on all slides
- No overlapping elements
- Mobile menu works smoothly
- Animations complete in < 1 second
- Stats display properly in grid
- Icons stay within viewport
- Buttons are tappable and full-width

❌ **Fail Criteria:**
- Icons appear off-screen
- Stats overlap with other content
- Text takes > 2 seconds to appear
- Menu doesn't open/close
- Content cut off on any slide
- Horizontal scrolling occurs

## Performance Checks

- [ ] Page loads in < 3 seconds on 3G
- [ ] Smooth scrolling between slides (60fps)
- [ ] No layout shifts after load
- [ ] Touch interactions responsive (< 100ms)

---

**Testing Date:** _______________
**Tester Name:** _______________
**Devices Tested:** _______________

