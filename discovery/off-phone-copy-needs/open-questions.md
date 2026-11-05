# Open questions: off-phone copy needs

## What the maintainer has still to say

- **Is a "save a copy" button with a reminder acceptable as one layer?** The maintainer is "not sure yet". Nothing here assumes it either way; [A button the potter taps](design-space.md#a-button-the-potter-taps) and [A reminder when the last copy is old](design-space.md#a-reminder-when-the-last-copy-is-old) stay as options. It decides whether a saved file can be a layer at all, and whether "No server copy, only files" is workable.
- **Which iPhone and Android versions do the friends have?** The cookie hand-over needs iOS 17.2 or later (WebKit). The maintainer said only "A mix of iPhone and Android". Asked of the maintainer, about each friend's phone.
- **How soon after the first weeks must a copy exist?** The maintainer accepted phone-only records for "my first weeks and my friends' first weeks" but did not say how many weeks. My reading is that a copy is needed once those weeks end; the length is not stated.
- **Would the maintainer send a link to each friend, and answer "I lost my phone" messages?** The options that rest on the maintainer (re-sent link, reset) need it. They said friends trust them, not that they will do this work.

## What was looked for and not found

- **What an iPhone restore does to an installed web app's stored data.** A blogger found Home Screen web apps in an iCloud backup; whether their IndexedDB comes back on a new phone was not found. A device test settles it.
- **What iOS "clear website data" does to a Home Screen web app.** No page found.
- **Whether removing the icon deletes a web app's data**, on iPhone or Android. Secondary sources say yes on iPhone; Chrome's page says only that clearing Chrome's data applies to the installed app.
- **Current Android behaviour.** The WebAPK page is dated 2017.
- **How well a whole database with photos exports and imports on a phone** (size, time, memory).
- **Whether the share sheet is the reliable route for saving a file from an installed iPhone app.** Only community reports found.
- **Whether a server-set cookie keeps its full life in the installed iPhone app.** Community notes only.
- **A comparison of ways to keep records private without accounts for a small circle.** None found.
- **No friend's own view** of links, reminders or files was gathered.

## Worth asking, and of whom

- A friend (via the maintainer): do they already use a cloud drive or password manager daily? (Only relevant to the cloud-drive option; a password manager is not asked of them.)
- A device test on one iPhone and one Android phone: backup and restore, clear data, delete icon, Add to Home Screen with a cookie set.

## Claims not verified

- The iCloud backup contents (E2 in [loss-events.md](loss-events.md)) rest on one blog's search excerpt (unverified).
- "The data goes with the app" on removing an iPhone icon rests on a DZone excerpt and one company's post (unverified).
- On Android, removal of the icon leaving the data in place is the earlier survey's reading of OpenPWA (unverified).
- Dexie upgrade problems with old open tabs rest on community threads (unverified).
- Server-set cookie lifetime and the Home Screen app's separate storage rest on a community GitHub note (unverified).
- Passkeys following a potter to a new phone through the phone maker's keychain is from memory (recalled).
- Mirroring a copy can copy a loss (F2) is my reading, not a sourced finding.
- Hosting: the store's backup is whatever the platform provides; no backup beyond it is proposed.
