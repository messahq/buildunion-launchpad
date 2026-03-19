# iOS Google Maps SDK — Swift Package Manager (SPM) Migration

> **Priority**: HIGH — Google is deprecating CocoaPods support for iOS SDKs in Q2 2026.  
> **Status**: Pre-migration documentation ready. Apply when iOS Capacitor build is active.

## Background

Google has announced the removal of CocoaPods support for their iOS SDKs. BuildUnion's native iOS module (via Capacitor) must transition to Swift Package Manager (SPM) to maintain stability for:
- **Map rendering** (Google Maps SDK for iOS)
- **Location tracking** (Core Location + Google Maps Markers)
- **GPS Conflict Detection** (Haversine comparison with project coordinates)

## Migration Steps

### 1. Remove CocoaPods Dependencies

```bash
# In the ios/App directory
cd ios/App
rm -f Podfile Podfile.lock
rm -rf Pods
rm -f App.xcworkspace
```

### 2. Add SPM Packages in Xcode

Open `ios/App/App.xcodeproj` in Xcode, then:

1. **File → Add Package Dependencies…**
2. Add the following packages:

| Package | URL | Version |
|---------|-----|---------|
| GoogleMaps | `https://github.com/nicklama/google-maps-ios-spm` | 9.0.0+ |
| Google Places | `https://github.com/nicklama/google-places-ios-spm` | 9.0.0+ |

> **Note**: Use community SPM wrappers until Google's official SPM release lands.

### 3. Update Capacitor Configuration

In `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'app.lovable.a8eac619062f43ad8648c450351afb3c',
  appName: 'buildunionca',
  plugins: {
    GoogleMaps: {
      // API key is fetched via the get-maps-key edge function
      // For native iOS, set in AppDelegate.swift
    }
  }
};
```

### 4. Configure API Key in AppDelegate.swift

```swift
import GoogleMaps

func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Fetch from secure config or Info.plist
    GMSServices.provideAPIKey("YOUR_GOOGLE_MAPS_API_KEY")
    return true
}
```

### 5. Location Permissions (Info.plist)

Ensure these are set in `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>BuildUnion needs your location to verify site check-ins and photo GPS data.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BuildUnion uses background location for site proximity alerts.</string>
```

### 6. Post-Migration Verification

After `npx cap sync ios`:

- [ ] Map renders correctly with markers
- [ ] Location tracking provides lat/lng for GPS Conflict Detection
- [ ] Check-in/check-out records correct coordinates
- [ ] Photo EXIF GPS extraction works on iOS camera images
- [ ] `gps-conflict-check` edge function receives valid coordinates

## Architecture Notes

### GPS Conflict Detection Flow (Native)

```
User takes photo → iOS extracts EXIF GPS → 
  App calls gps-conflict-check edge function →
    Haversine distance vs. project address (geocoded) →
      OK (< 200m) | WARNING (200-500m) | CONFLICT_DETECTED (> 500m)
```

### Operational Truth Integrity

The Materials Table remains the **single source of truth** for all financial data.
Map overlays and GPS badges are display-only — they never mutate `baseQuantity`, `unitPrice`, or `totalPrice`.

## Timeline

| Phase | Target | Status |
|-------|--------|--------|
| Documentation | 2026 Q1 | ✅ Complete |
| Edge function (gps-conflict-check) | 2026 Q1 | ✅ Deployed |
| Frontend GPS badge | 2026 Q1 | ✅ Implemented |
| iOS SPM migration | Pre Q2 2026 | 🔲 Pending iOS build |
| CocoaPods removal | Q2 2026 | 🔲 After SPM verified |
