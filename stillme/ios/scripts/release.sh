#!/bin/bash
# One-command App Store upload of Still Me from a Mac with Xcode signed in to your Apple ID
# (Xcode > Settings > Accounts).
#
#   scripts/release.sh                        # version from project.yml, build number from the clock
#   scripts/release.sh MAP974T827 1.0.1       # explicit team and version
#   scripts/release.sh MAP974T827 1.0.1 42    # explicit build number
#
# Set SKIP_PAUSE=1 to skip the "create the app record" pause on later releases.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/_setup.sh

TEAM_ID="${1:-$(sed -n 's/^ *DEVELOPMENT_TEAM: *"\{0,1\}\([A-Z0-9]*\)"\{0,1\}.*/\1/p' project.yml | head -1)}"
PROJECT_VERSION=$(sed -n 's/^ *MARKETING_VERSION: *"\{0,1\}\([0-9.]*\)"\{0,1\}.*/\1/p' project.yml | head -1)
VERSION="${2:-$PROJECT_VERSION}"
BUILD="${3:-$(date +%Y%m%d%H%M)}"
BUNDLE_ID=$(sed -n 's/^ *PRODUCT_BUNDLE_IDENTIFIER: *\([A-Za-z0-9.-]*\).*/\1/p' project.yml | head -1)
ARCHIVE="build/StillMe.xcarchive"
mkdir -p build

[ -n "$TEAM_ID" ] || fail "Set DEVELOPMENT_TEAM in project.yml (developer.apple.com > Membership details)."
case "$BUNDLE_ID" in com.example.*) fail "Change PRODUCT_BUNDLE_IDENTIFIER in project.yml from the placeholder $BUNDLE_ID.";; esac

ensure_xcode
generate_project

say "Archiving $BUNDLE_ID version $VERSION build $BUILD (team $TEAM_ID)"
rm -rf "$ARCHIVE"
archive() {
  xcodebuild archive \
    -project StillMe.xcodeproj \
    -scheme StillMe \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE" \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    MARKETING_VERSION="$VERSION" \
    CURRENT_PROJECT_VERSION="$BUILD" \
    "$@" > build/archive.log 2>&1
}
set +e
archive -allowProvisioningUpdates -allowProvisioningDeviceRegistration CODE_SIGN_STYLE=Automatic
status=$?
if [ $status -ne 0 ] && grep -q "no devices\|No profiles" build/archive.log; then
  say "No development profile available; archiving unsigned and signing for the App Store at upload"
  rm -rf "$ARCHIVE"
  archive CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
  status=$?
fi
set -e
grep -E "\*\* ARCHIVE" build/archive.log || true
[ $status -eq 0 ] || show_errors_and_exit build/archive.log

# Apple rejects uploads (ITMS-90683) that use a protected API without its purpose string.
PLIST="$ARCHIVE/Products/Applications/StillMe.app/Info.plist"
for key in NSMicrophoneUsageDescription NSSpeechRecognitionUsageDescription; do
  /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST" >/dev/null 2>&1 || fail "Info.plist is missing $key; not uploading."
done
say "Archived $(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PLIST") ($(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$PLIST")), purpose strings present"

cat > build/ExportOptions.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST

if [ "${SKIP_PAUSE:-}" != "1" ]; then
  cat <<MSG

Before uploading, the app record must exist in App Store Connect:
  https://appstoreconnect.apple.com/apps  ->  +  ->  New App
  Platform: iOS   Name: Still Me: Your AI Legacy   Language: English (U.S.)
  Bundle ID: $BUNDLE_ID   SKU: stillme-ios-1

(If the bundle ID isn't in the list yet, register it at
 https://developer.apple.com/account/resources/identifiers/add/bundleId first.)

MSG
  read -r -p "Press Enter once the app record exists (or Ctrl-C to stop here)... " _
fi

say "Uploading to App Store Connect"
set +e
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist build/ExportOptions.plist \
  -exportPath build/export \
  -allowProvisioningUpdates \
  > build/export.log 2>&1
status=$?
set -e
grep -E "Upload succeeded|EXPORT SUCCEEDED" build/export.log || true
[ $status -eq 0 ] || show_errors_and_exit build/export.log

say "Done. Build $BUILD of $VERSION is uploaded. It appears under TestFlight in App Store Connect in 10 to 30 minutes."
