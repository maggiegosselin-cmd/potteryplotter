# Loss events: what can still lose a potter's records, and what a copy off the phone recovers

**Kind of hop: a survey** of how records on a phone can be lost (phone rules, install rules, the app's own update path), set against what a copy off the phone or a downloaded file would bring back. It decides nothing. The earlier [offline phone storage survey](../offline-phone-storage-survey/findings.md) covers quotas and eviction; this file takes only what that survey left unsettled, plus the app's own update path read from the repository.

## Contents

- [What the maintainer's answers settle](#what-the-maintainers-answers-settle)
- [What the app holds today](#what-the-app-holds-today)
- [The events](#the-events)
- [What a copy recovers, event by event](#what-a-copy-recovers-event-by-event)
- [Four findings that change what a copy must do](#four-findings-that-change-what-a-copy-must-do)
- [What Full export already covers](#what-full-export-already-covers)
- [Sources](#sources)

## What the maintainer's answers settle

- **Phones:** "A mix of iPhone and Android". Both columns of the table below apply; the iPhone-only events (E2 unsettled, E3, E6, no background copy) are part of the work.
- **First weeks:** "Yes, for my first weeks and my friends' first weeks" to records living only on their own phone. Events E1 to E4 and E6 to E8 are therefore accepted risks for the first weeks (my reading: the maintainer accepted the risk of loss in that period, not any particular loss); a copy off the phone is needed after them, not before the first pot.
- **Nothing to remember:** "No, it must work with nothing to remember". A copy that recovers E1 or E2 therefore cannot depend on a code or passphrase the potter keeps; recovery rests on the maintainer, a file, the old phone or the phone maker's own keychain (iCloud Keychain or Google Password Manager, each tied to the potter's Apple or Google account; see [A passkey on the potter's device](design-space.md#a-passkey-on-the-potters-device)).
- **Save-a-copy button with a reminder:** the maintainer is not sure yet. Where a table below says "a file", the file's tap is that open question.

## What the app holds today

Read from the repository (`src/lib/db.js`, `vite.config.js`, `src/lib/persist.js`, `README.md`):

- Every pot is one IndexedDB row (through Dexie) holding its history and its shrunk photo as a Blob. There are three database versions; versions 2 and 3 upgrade saved pots in place, and tests cover migrating a version 1 pot and a version 2 pot.
- The service worker is generated with `registerType: 'autoUpdate'` and `cleanupOutdatedCaches: true`. Caches hold the app shell only; records are not in them.
- `navigator.storage.persist()` is requested after a save, and a refusal is shown to the potter.
- There is **no export, import, or any copy of records off the phone** in the code at this commit (a search of `src/` finds none).
- `InstallHelp` teaches the iPhone Share-menu steps and says pots saved in Safari do not move to the home-screen app, but it does not stop a potter logging pots in a Safari tab.

## The events

Each event is marked with the platforms it hits and how well the claim is sourced. "Unverified" means a source was read but is not a platform vendor's statement for this exact case.

| # | Event | iPhone | Android | Basis |
|---|---|---|---|---|
| E1 | Phone lost, broken, stolen or wiped | Records go with it. | Records go with it. | Follows from storage being on the phone. |
| E2 | Phone replaced, old phone still working | An iCloud backup contains home-screen web apps (a blogger inspected a decrypted backup and found `WebClips` folders, some over 1 GB). Whether the restored web app gets its IndexedDB back was not found. Firtman lists "App Installation Recovery with Backup" since iOS 11.3. | Chrome's 2017 WebAPK FAQ says the app is not reinstalled on a new device ("not at this time"); the site's data lives in the Chrome profile. | [kryogenix](https://www.kryogenix.org/days/2024/09/17/on-ios-home-screen-web-apps-are-part-of-your-icloud-backup/) (search excerpt only, one person's phone, unverified), [Firtman](https://firt.dev/notes/pwa-ios/), [web.dev WebAPKs](https://web.dev/articles/webapks) (last updated 2017) |
| E3 | Home-screen icon removed | The data goes with the app (DZone article; a Japanese engineering post says the same for iOS and Android). WebKit is said not to document this for web apps (earlier survey). | Chrome keeps an installed web app's data in the browser profile, so removal of the icon probably leaves it (earlier survey, OpenPWA); not confirmed by Chrome's own page. | [DZone](https://dzone.com/articles/webkit-pwas-ios) (excerpt), [note.com post](https://note.com/clever_godwit352/n/n0dbce1ca252c?hl=en), earlier survey; unverified |
| E4 | Site data cleared by the potter | Not found whether Safari's "clear history and website data" reaches a home-screen app's separate store. | Clearing Chrome's site data or profile applies to the installed web app; the WebAPK FAQ answers "Yes" to whether clearing Chrome's cache clears an installed site's storage. | [web.dev WebAPKs](https://web.dev/articles/webapks) |
| E5 | App update | Records are not in the cache the update replaces. The risk is the database upgrade in `db.js` (a failed or blocked upgrade) and a build that ships a bug. Community reports describe an upgrade hanging when an old tab keeps the database open, and abrupt closes losing uncommitted writes. | Same. | Repository; community threads on [Dexie schema guard](https://github.com/pablo-albaladejo/kaiord/pull/1577) and [versionchange handling](https://github.com/rselbach/setsquare/issues/32) (unverified) |
| E6 | Pots logged in a Safari tab, then the app installed | Installed app starts empty; the tab's rows stay in Safari's store. | Chrome shares the store between tab and installed app, so no gap. | Earlier survey (WebKit via OpenPWA); [web.dev WebAPKs](https://web.dev/articles/webapks) |
| E7 | Safari's 7-day idle rule | Hits tab data only; installed apps are exempt. | None. | Earlier survey; DZone excerpt |
| E8 | Low-disk eviction | Applies unless persistence was granted. | Same. | Earlier survey |
| E9 | Storage write fails (quota, private browsing) | The pot was never stored; the app says so. | Same. | `src/lib/db.js` |
| E10 | The address of the app changes | New origin, empty store. | Same. | Earlier survey (per-origin model) |
| E11 | Two installs or two phones diverge | Each install is its own store. | Shared per Chrome profile. | Earlier survey |

## What a copy recovers, event by event

"Copy" means any copy that sits off the phone (a file the potter saved, or a server copy). "Phone backup" means what the phone's maker does by itself, which the app does not control.

| Event | Recovered by a copy off the phone? | Recovered by a downloaded file? | Phone backup |
|---|---|---|---|
| E1 lost, broken, wiped | Yes, up to the last copy. | Yes, if the file was saved somewhere other than the lost phone. A file left in the phone's Downloads is lost with it. | iPhone: possibly (E2). Android: not found. |
| E2 replaced phone | Yes, up to the last copy. | Yes, same condition. | Unsettled on iPhone. |
| E3 icon removed | Yes. | Yes. | Not applicable once deleted. |
| E4 data cleared | Yes. | Yes. | None. |
| E5 update goes wrong | Only if the copy was made **before** the update and is not overwritten by a later copy of an emptied database (see finding F2). | Yes if the file predates the update and the app still opens that file format. | None. |
| E6 pots left in a Safari tab | Only if the tab itself made a copy (it holds its own secret) or an export; otherwise the tab's pots stay stranded. On iOS 17.2 and later, Add to Home Screen copies the site's cookies once (WebKit), so a secret kept in a server-set cookie could reach the installed app; nothing else in the tab's store is copied. | Yes if the potter exports from the tab and imports in the installed app. | None. |
| E7, E8 eviction | Yes. | Yes. | None. |
| E9 write failed | **No.** Nothing was stored, so nothing exists to copy. | No. | No. |
| E10 address change | Yes. | Yes. | None. |
| E11 diverging installs | A copy can help or harm: a blind overwrite from the older install erases newer pots (finding F3). | Same. | None. |

## Four findings that change what a copy must do

- **F1. The gap between copies is the real loss.** On iPhone nothing copies in the background (Firtman: Background Sync, Periodic Background Sync and Background Fetch are unsupported), so every pot made since the app was last open and online is unprotected. A potter who logs pots in a signal-poor studio and does not open the app at home has an unbounded gap. A copy recovers only up to its last time.
- **F2. A mirror can copy a loss.** If a copy simply mirrors the phone, an update bug or a cleared store that is then synced overwrites the good copy with an empty one. Keeping the last good copy (for example the previous few) is what makes E5 and E4 recoverable. This is my reading of how mirroring works, not a sourced finding.
- **F3. Two stores per person is normal on iPhone.** A Safari tab and the installed app are separate stores, and a second install is a third (earlier survey). Any copy keyed by the potter must say which store it came from and must merge or ask, not overwrite.
- **F4. The way back must exist and be tried.** A copy that cannot be restored is not a recovery. No import exists today. The photos matter most for this project (finished photo and glaze, failure photo), and a copy that drops photos recovers the text and loses the thing the maintainer values.

Not found: any source that tests what an iPhone restore does to an installed web app's IndexedDB, or what Safari's clear-data setting does to one. Both would need a device.

## What Full export already covers

The repository has no Full export yet; the term is the name of a later piece of work in this project (the maintainer's plan, not seen in the repository). What a complete file the potter saves outside the phone would cover, from the table above: E1 to E4, E7, E8, E10 (up to the date of the file); E5 only with a file made before the update; E6 only with an import in the installed app. What a file does not cover: the gap since the last file (F1) is as large as the potter's habit allows, and it asks something of the potter each time. A file is also itself a private-record question: it is as private as the place it is saved (see the [design space](design-space.md)).

## Sources

WebKit's [Safari 17.2 notes](https://webkit.org/blog/14787/) (read in full) say Add to Home Screen copies cookies to the web app on iOS 17.2 and later and that no other local storage is copied.


Read in full: [web.dev WebAPKs on Android](https://web.dev/articles/webapks) (last updated 2017); [Firtman, iOS PWA compatibility](https://firt.dev/notes/pwa-ios/); [note.com post on PWA data loss](https://note.com/clever_godwit352/n/n0dbce1ca252c?hl=en) (a vendor's own account of its app). Read as search excerpts only: kryogenix.org on iCloud backup, the DZone article on iOS rooms, the Dexie and IndexedDB upgrade threads. Repository files named above.
