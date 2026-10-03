# Unlisted

A free iPhone and iPad app that helps a family find and remove their personal
information from the internet, and lock down their identity.

- **Scan:** ready-made searches for each family member's names, places, emails,
  phone numbers and usernames, opened in Safari. Log what you find and the app
  suggests the next step.
- **Remove:** step-by-step opt-outs for 27 people-search sites, data brokers,
  search engines and archives, with per-person status and re-check reminders
  (brokers re-list people).
- **Letters:** fills in data-broker deletion, website removal, do-not-share
  (banks and insurers), child credit freeze, Wayback Machine and license-plate
  camera letters. Opens them in Mail; the user reviews and sends.
- **Protect:** credit freezes, account security, phone-number protection, kids,
  home, scam defense and family safety net, tracked per adult, per child and
  per household.

## Privacy

- No account, no analytics, no ads, no network calls of its own. Searches and
  opt-out pages open in Safari; letters go through the user's own Mail app.
- Data lives in one JSON file in Application Support, written with
  `completeFileProtection`. Settings has Export and Delete all.
- There is no field for a Social Security number. Letters that need one print
  "[write in by hand]".
- Notifications never include names.
- `PrivacyInfo.xcprivacy` declares no tracking and no collected data, so the App
  Store privacy label is "Data Not Collected".

## Build

Requires a Mac with Xcode 16 or later and [XcodeGen](https://github.com/yonaskolb/XcodeGen).

```bash
brew install xcodegen
cd ios/Unlisted
xcodegen generate
open Unlisted.xcodeproj
```

Run the tests with Product > Test, or:

```bash
xcodebuild test -project Unlisted.xcodeproj -scheme Unlisted \
  -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO
```

CI runs the same build and tests on every change to this folder
(`.github/workflows/ios-unlisted.yml`).

## Publishing it free on the App Store

1. Join the Apple Developer Program ($99/year; it's required even for free apps).
2. In `project.yml`, set `DEVELOPMENT_TEAM` to your Team ID and change
   `PRODUCT_BUNDLE_IDENTIFIER` (`app.unlisted.ios`) to one you own, then run
   `xcodegen generate` again.
3. In App Store Connect, create the app with the same bundle ID and set the
   price to Free.
4. Privacy: choose "Data Not Collected". Add a privacy policy URL; a short page
   saying the app collects nothing and stores data only on the device is enough.
5. In Xcode, choose Product > Archive, then Distribute App > App Store Connect.
   Test it with TestFlight, then submit for review.
6. Replace the placeholder icon (`Unlisted/Resources/Assets.xcassets/AppIcon.appiconset`)
   if you want a designed one.

## Keeping the opt-out list current

Brokers change their opt-out pages often. The list is in
`Unlisted/Data/BrokerCatalog.swift` (last checked October 2026). The
protection checklist is in `Unlisted/Data/ChecklistCatalog.swift`.

The app gives general privacy guidance, not legal advice.
