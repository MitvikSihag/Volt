# Next changes (queued 4 Oct 2026)

Found while dogfooding on a real phone. Not started. Order is the suggested order.

## 1. Today is cluttered and reads like dummy data
- Label the session card as a suggestion: "Suggested · from your Hyrox plan".
- Headline is one line (the day). Do not repeat the session name in it.
- Hide the giant volume numeral and week dots until there is data.
- Session card collapses to title + one-line summary; tap to expand the lifts.
- Two equal buttons: "Start lift" and "Start run". "Record a run" stops being a faint text line.
- Move "Verify your email · Resend" from Today to Profile.
- Decide: remove the avatar on Today (Profile is a tab now).
- Note: this departs from artboard 01. Owner approved the direction; update the design file after.

## 2. Tab bar: icons instead of text-only labels
- Five tabs (Today · Plan · Feed · Rivals · Profile) get icons; keep or drop labels to be decided
  once seen on a phone. Grayscale, active = t1, inactive = t4. Update VOLT_DESIGN_SYSTEM §7.

## 3. Training goal is stuck on the phone
- The onboarding goal lives in AsyncStorage (`volt.onboarding`), is not tied to an account, and
  survives logout, account deletion, and a new registration (a goal chosen on 6 Sep reappeared
  on a new account on 4 Oct).
- Add "Change goal" to Settings.
- Clear the goal on account deletion; decide what logout does.

## 4. GPS accuracy
- First real-phone run pending (Expo Go, baseline, compared with Strava/watch).
- `src/run/geo.ts` sums every point with no accuracy filter; expect a few percent over-read.
  After the baseline: drop fixes with poor horizontal accuracy and implausible speed, re-compare.

## 5. Leftovers from auth work
- Walk the delete-account screen on a device (backend is tested; the screen was never tapped).
- Re-check that reset/verify now open full screen.
- Google OAuth client IDs (owner) → real Google sign-in. Hide the Google button in Expo Go.
- Standalone build on the phone so a run survives the app being killed away from the Mac.
- Deferred minors: duplicate `kid`s accepted; `verify.tsx` double confirm in dev; no jest
  coverage for the new screens.
