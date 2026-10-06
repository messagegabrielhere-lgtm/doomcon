# App Store submission checklist

## Already handled in the code

- [x] **Consent before data goes to a third-party AI.** Required by Guideline 5.1.2(i). The consent screen names Anthropic and requires three explicit toggles. See `Views/WelcomeView.swift`.
- [x] **In-app account deletion.** Required by 5.1.1(v). See **You → Delete everything**, which deletes the data on the server too.
- [x] **Privacy manifest.** `PrivacyInfo.xcprivacy` declares user content, name, and email (linked, not used for tracking) and the UserDefaults API reason.
- [x] **Usage descriptions** for the microphone and speech recognition.
- [x] **No API keys in the app.** All AI calls go through your server.
- [x] **Data export.** **You → Export my archive** saves everything as JSON.
- [x] **A 1024×1024 app icon.** It's a placeholder, so swap in a designed one if you like.
- [x] **AI disclosure.** Recipients see a persistent banner: "An AI built from what … chose to share — not …".

## You need to do

1. **Apple Developer Program** membership ($99/year). Then:
   - In `ios/project.yml`, set `DEVELOPMENT_TEAM` to your team ID.
   - Change `PRODUCT_BUNDLE_IDENTIFIER` to something you own, like `com.yourname.afterword`.
2. **Deploy the server over HTTPS.** App Transport Security blocks plain HTTP except on the local network. Set `AfterwordServerURL` in `project.yml` to the deployed URL.
3. **Host a privacy policy.** Fill in [PRIVACY.md](PRIVACY.md), publish it, and put its URL in App Store Connect.
4. **Fill in the App Privacy section** in App Store Connect to match the manifest:
   - User Content, Name, and Email Address: collected, linked to the user, used for App Functionality, not used for tracking.
5. **Set the age rating.** Answer the questionnaire honestly. The app deals with death and grief, and it generates AI text that you don't control.
6. **Write the review notes.** Reviewers can't wait for anyone to die, so give them:
   - A short explanation of the check-in flow.
   - A **working access code** for a demo legacy. Create a test account, release it from the executor link printed in your server console, and paste one of the codes.
   - A note that the owner flow needs no login: an account is created on the first backup.
7. **Screenshots** for 6.9" and 6.5" iPhones.
8. **Test on a real device.** This project was written without access to Xcode, so expect a round of compiler fixes on first build. Then exercise these paths:
   - Voice recording (permissions, long stories)
   - Background backup when leaving the app
   - Check-in reminders (try a short interval)
   - The full release → redeem → chat flow against a local server

## Review risks worth knowing

- **Guideline 1.1 / 1.4 (objectionable or harmful content).** An app that impersonates the dead can draw scrutiny. Things that help: the consent screen, the AI disclosure banner, the honesty and crisis-handling rules in the persona prompt, and the fact that only the person themselves can create their persona.
- **Guideline 5.1.2.** Make sure your privacy policy explicitly names Anthropic as a processor, and describes what happens to the data after release and on deletion.
- **Impersonating other people.** The app only lets you preserve *yourself*. Don't add a feature that builds a persona of someone else from their messages. It's an ethical line, and it would likely fail review.
