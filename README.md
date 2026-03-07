cd /Users/vishumacm2/Desktop/oluvole-app-v2/sharporder-v2

# 1) One‑time EAS setup (interactive in your terminal)
npx eas build:configure

# 2) Cloud APK build (requires profile with buildType: "apk" in eas.json, e.g. "preview")
npx eas build --platform android --profile preview




cd /Users/vishumacm2/Desktop/oluvole-app-v2/sharporder-v2

# Build iOS app (production profile)
eas build --platform ios --profile production

# When the build finishes in the Expo dashboard, submit the latest build to TestFlight:
eas submit --platform ios --profile production --latest
# Use your Apple ID when prompted; optionally use an App-Specific Password for non-interactive use.