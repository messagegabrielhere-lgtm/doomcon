# Submitting Still Me to the App Store

Everything to paste into App Store Connect is below. You need a Mac with Xcode, signed in to the Apple ID on team **MAP974T827** (Xcode → Settings → Accounts).

## 1. Create the app record (one time)

https://appstoreconnect.apple.com/apps → **+** → **New App**

| Field | Value |
|---|---|
| Platform | iOS |
| Name | Still Me: Your AI Legacy |
| Primary language | English (U.S.) |
| Bundle ID | com.messagegabrielhere.stillme |
| SKU | stillme-ios-1 |
| User access | Full access |

If the bundle ID isn't in the list, register it first: https://developer.apple.com/account/resources/identifiers/add/bundleId (App IDs → App → Explicit → `com.messagegabrielhere.stillme`, no extra capabilities).

## 2. Upload the build

```
git clone -b afterword-ios-app https://github.com/messagegabrielhere-lgtm/doomcon.git
cd doomcon/stillme/ios
scripts/release.sh
```

The script:
- archives version 1.0.0 with a timestamp build number,
- checks the purpose strings,
- pauses so you can confirm the app record exists,
- uploads.

The build appears under TestFlight in 10–30 minutes.

## 3. Fill in the listing

**App Information**

| Field | Value |
|---|---|
| Subtitle | An AI of you, for your family |
| Category | Lifestyle |
| Privacy Policy URL | https://github.com/messagegabrielhere-lgtm/doomcon/blob/afterword-ios-app/stillme/PRIVACY.md |
| Support URL | https://github.com/messagegabrielhere-lgtm/doomcon/issues |

**Version 1.0.0**

Promotional text:
> Record your stories, your opinions and the way you talk. After you die, the people you choose can talk with an AI of you.

Description:
> Still Me lets you leave more than photos. Record yourself now, and after you die the people you love can still talk with you, with an AI built only from what you recorded.
>
> RECORD YOURSELF
> • 149 interview questions across 16 topics, from childhood to advice to "how you talk"
> • Tell stories out loud: speech becomes text on your iPhone
> • Reply samples: answer everyday texts exactly as you would, so your AI sounds like you
> • People in your life, and a timeline of the big dates
> • An AI interviewer that finds what's missing and asks about it
>
> HEAR YOURSELF
> • Rehearse: talk with your own AI, and correct anything that doesn't sound like you
> • Preview how it would talk to each person you love
>
> LEAVE IT TO THEM
> • Seal a legacy file for each person, with only the memories meant for them
> • Send the file now; it stays locked until they have the code you leave in your will
>
> PRIVATE BY DESIGN
> • Everything stays on your iPhone. No accounts, no servers, no tracking
> • The AI runs on your iPhone with Apple Intelligence
>
> Talking with the AI requires an iPhone with Apple Intelligence (iPhone 15 Pro or newer). Recording works on any iPhone running iOS 26.

Keywords (100 characters max):
> legacy,memories,memoir,voice,family,grief,afterlife,interview,remembrance,journal,biography,story

**Screenshots:** use the 6.9" images from the `stillme-screens` branch (light versions):

| # | File | Shows |
|---|---|---|
| 1 | 1-welcome-light.png | Welcome |
| 2 | 2-record-light.png | Record |
| 3 | 4-rehearse-light.png | Rehearse |
| 4 | 9-people-light.png | People |
| 5 | 7-recipient-light.png | Recipient chat |
| 6 | 11-letter-light.png | Letter |

**App Privacy:** answer **"No, we do not collect data from this app."** That matches `PrivacyInfo.xcprivacy`: nothing leaves the device.

**Age rating:** answer the questionnaire honestly. The app deals with death and grief, and it generates AI text. Likely result: 12+, or 13+ under the newer ratings.

**Export compliance:** if asked, the app uses standard encryption (Apple CryptoKit) only to protect the user's own data, which is exempt. `ITSAppUsesNonExemptEncryption` is already set to false.

## 4. Notes for App Review

Paste into **App Review Information → Notes**:

> Still Me runs entirely on device: no account, no server, no sign-in.
>
> To try it: tap "Start recording me", accept the two statements, add your name in the You tab, and answer three interview questions in the Record tab. Then open Rehearse to talk with the AI built from those answers. The AI uses Apple's on-device Foundation Models, so please test on a device with Apple Intelligence enabled (iPhone 15 Pro or newer). On other devices the app explains this and recording still works.
>
> Legacy files: in the Legacy tab, add a person and tap Seal. The app shows an unlock code and lets you share a .stillme file. To test the recipient side on the same device, share the file to Files, open it with Still Me ("Someone left me a legacy file"), and enter the code.
>
> No login credentials are needed.

No sign-in is required, so leave the demo account fields empty.

## 5. Submit

Select the uploaded build under **Build**, then click **Add for Review** → **Submit to App Review**.

## Already handled in the app

- [x] Purpose strings for the microphone and speech recognition, checked before every upload
- [x] Privacy manifest: no data collected, no tracking
- [x] In-app delete-everything and export
- [x] Consent screen before recording starts
- [x] Recipients always see "An AI built from what … chose to share. Not …"
- [x] Clear message when Apple Intelligence is unavailable
- [x] App icon, launch screen, dark mode
- [x] Compiles in Release with Xcode 26; unit tests for sealing pass in CI

## Before you submit

- **Real-iPhone check:** the AI has only been compile-tested, because CI's simulator has no Apple Intelligence. Install a TestFlight build on an iPhone 15 Pro or newer and have one real conversation before submitting.
