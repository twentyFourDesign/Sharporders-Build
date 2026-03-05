cd /Users/vishumacm2/Desktop/oluvole-app-v2/sharporder-v2

# 1) One‑time EAS setup (interactive in your terminal)
npx eas build:configure

# 2) Cloud APK build (requires profile with buildType: "apk" in eas.json, e.g. "preview")
npx eas build --platform android --profile preview