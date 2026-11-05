# Design space: keeping each potter's copy off the phone, private and recoverable

**Kind of hop: an exploration, with a survey beside it.** The survey part (which events lose records, and what a copy recovers) is in [loss-events.md](loss-events.md). This file explores how each potter's copy could stay private to them without accounts, given that iPhones copy only while the app is open and online. It recommends, ranks and chooses nothing. "Asks of the maintainer" means ongoing work and risk for one person after the deadline, not only money.

## Contents

- [What the maintainer has settled](#what-the-maintainer-has-settled)
- [Each potter's copy is theirs alone](#each-potters-copy-is-theirs-alone)
  - [What proves a copy is the potter's](#what-proves-a-copy-is-the-potters)
    - [A random secret the app makes](#a-random-secret-the-app-makes)
    - [A link the maintainer sends each friend](#a-link-the-maintainer-sends-each-friend)
    - [A passkey on the potter's device](#a-passkey-on-the-potters-device)
    - [No server copy, only files](#no-server-copy-only-files)
  - [How the secret reaches the installed iPhone app](#how-the-secret-reaches-the-installed-iphone-app)
    - [A cookie the server sets](#a-cookie-the-server-sets)
    - [The secret is made in the installed app](#the-secret-is-made-in-the-installed-app)
    - [A file from the Safari tab](#a-file-from-the-safari-tab)
  - [How the stored copy is protected](#how-the-stored-copy-is-protected)
    - [Readable behind the secret](#readable-behind-the-secret)
    - [Encrypted at rest under a server key](#encrypted-at-rest-under-a-server-key)
  - [Where the copy is kept](#where-the-copy-is-kept)
    - [A file the potter saves](#a-file-the-potter-saves)
    - [The maintainer's server](#the-maintainers-server)
    - [The potter's own cloud drive](#the-potters-own-cloud-drive)
- [A replaced or wiped phone gets its records back](#a-replaced-or-wiped-phone-gets-its-records-back)
  - [How the records come back](#how-the-records-come-back)
    - [The maintainer sends the link again](#the-maintainer-sends-the-link-again)
    - [Open a saved file](#open-a-saved-file)
    - [Scan from the old phone](#scan-from-the-old-phone)
- [A copy is made although iPhones only copy while open](#a-copy-is-made-although-iphones-only-copy-while-open)
  - [When the copy is made](#when-the-copy-is-made)
    - [Each time the app opens online](#each-time-the-app-opens-online)
    - [After each save while online](#after-each-save-while-online)
    - [A button the potter taps](#a-button-the-potter-taps)
    - [A reminder when the last copy is old](#a-reminder-when-the-last-copy-is-old)
- [A lost or leaked secret does not end the copy's safety](#a-lost-or-leaked-secret-does-not-end-the-copys-safety)
  - [What happens when the secret is lost or leaked](#what-happens-when-the-secret-is-lost-or-leaked)
    - [Nothing can be done](#nothing-can-be-done)
    - [The maintainer can reset a friend's copy](#the-maintainer-can-reset-a-friends-copy)
    - [A secret the potter can replace](#a-secret-the-potter-can-replace)
- [A bad copy does not replace a good one](#a-bad-copy-does-not-replace-a-good-one)
  - [How earlier copies are kept](#how-earlier-copies-are-kept)
    - [Only the latest copy](#only-the-latest-copy)
    - [The last few dated copies](#the-last-few-dated-copies)
    - [Merge pot by pot](#merge-pot-by-pot)
- [Facts the options lean on](#facts-the-options-lean-on)
- [How the choices combine](#how-the-choices-combine)
- [Sources](#sources)
- [Open questions](#open-questions)

## What the maintainer has settled

These are the maintainer's answers; options that they rule out are not offered.

- **Phones:** "A mix of iPhone and Android". Every option must work on both, so the iPhone limits (no background copy, a Safari tab and the installed app as separate stores) are carried by every option.
- **First weeks:** "Yes, for my first weeks and my friends' first weeks" to records living only on their own phone. A copy off the phone is therefore not needed before the first pot is logged; it is needed once the first weeks pass.
- **Who may read:** "Yes, my friends trust me" to the maintainer being technically able to read friends' pots on a server the maintainer runs. A readable store is allowed.
- **Nothing to remember:** "No, it must work with nothing to remember" to saving a code or passphrase. A passphrase, a typed or pasted code, a recovery code, and encryption under a key only the potter holds are left out: each needs the potter to remember or keep something, and a lost phone would lose the key with the records.
- **Not settled:** whether a "save a copy" button with a reminder is acceptable as one layer. The maintainer is not sure yet, so the button and the reminder are both shown as options in [When the copy is made](#when-the-copy-is-made) and none is chosen.
- **Fixed by Project Memory, so not explored:** no accounts and no shared studio view; a web app installed on the home screen; two or three friends who "work much like me". "Each friend keeps their own private records" is Peradapt's assumption, not the maintainer's word.
- **Hosting and durability:** a server copy would sit on the platform Peradapt provides, whose own backup of a disk is daily and kept five days. No option adds a second provider or backup of the store.

## Each potter's copy is theirs alone

**Solved when:** A friend can have a copy off the phone that no other friend, and no stranger, can open or overwrite, without signing up anywhere and without remembering anything.

### What proves a copy is the potter's

**Exclusive:** yes. **Why it matters:** Without accounts, something other than a sign-in has to say whose copy this is, and each choice puts a different job on the maintainer or the potter.

What is chosen: What the app presents to the place holding a copy so that only that potter gets it back. Options: [A random secret the app makes](#a-random-secret-the-app-makes); [A link the maintainer sends each friend](#a-link-the-maintainer-sends-each-friend); [A passkey on the potter's device](#a-passkey-on-the-potters-device); [No server copy, only files](#no-server-copy-only-files).

#### A random secret the app makes

On first use the app makes a long random secret (at least 120 bits, as the W3C TAG advises for capability URLs), keeps it on the phone, and sends it with each copy; whoever holds it can read and replace that potter's copy.

```
  phone --(secret + records)--> store[secret] = records
```

**Easy:** The potter types and saves nothing; nothing for the maintainer to issue; no account table. **Costs:** The secret lives on the phone, so a lost phone loses the secret and the server copy cannot be found again unless the maintainer can tell which copy is whose (a name the potter gives, or a label); a secret shown as a link can leak through history, logs and chat apps. **Asks of the maintainer:** A small store keyed by secret, rate limiting on lookups, no third-party scripts on pages that show the secret (W3C TAG advice), and a way to match a copy to a friend after a lost phone. **Suits:** Friends who set up alone.

#### A link the maintainer sends each friend

The maintainer makes one link per friend (it carries a long random secret) and sends it in a message; the friend taps it once and the app keeps the secret, with no typing.

**Easy:** The maintainer knows whose copy is whose, so a new phone is a re-sent link; nothing for the friend to remember or type; matches a circle of two or three (the earlier design space lists this as "A code the author gives"). **Costs:** The maintainer must make, send and keep each link, which is help the project wants to avoid; the message holds the secret for as long as it stays in the chat; on iPhone the tap opens Safari, not the installed app (see [How the secret reaches the installed iPhone app](#how-the-secret-reaches-the-installed-iphone-app)). **Asks of the maintainer:** Making and keeping a list of links, by hand or with a small admin page. **Suits:** A circle that stays at two or three.

#### A passkey on the potter's device

The app registers a passkey (Web Authentication, in iOS since 14.5 per Firtman) against a random handle, and the store releases a copy only to the holder of that passkey.

**Easy:** Nothing to type or save; the phone's own unlock confirms the potter. **Costs:** The store has to verify passkey signatures, which is sign-in code in all but name; a passkey follows a potter to a new phone through the phone maker's own keychain: on iPhone it syncs across the potter's devices through iCloud Keychain, and a new device joins by being sponsored by an existing one or by iCloud Keychain recovery, which asks for the Apple Account password, an SMS code and the device passcode ([Apple Support](https://support.apple.com/en-us/102195)); on Android it syncs through Google Password Manager, and a new device needs the Google Account and the old screen lock or a Google Password Manager PIN ([Google for Developers](https://developers.google.com/identity/passkeys/supported-environments)); Google's page adds that Chrome on iOS 17 or later can be set to keep passkeys in Google Password Manager, which is a route from iPhone to Android only for passkeys made that way; neither page describes a sync from iCloud Keychain to an Android phone, and both describe signing in on one maker's phone with a passkey held on the other's by a QR code or nearby phone, which needs the old phone at hand, so a potter who changes maker and has lost the old phone has no other route in these pages; the potter's Apple or Google account and its recovery steps stand in for the code the maintainer said must not be asked of a potter ("it must work with nothing to remember"), and whether each friend has that account signed in with keychain syncing on was not established. **Asks of the maintainer:** Writing and keeping up the check on the server and testing it on both phone kinds. **Suits:** A maintainer comfortable with security code.

#### No server copy, only files

Nothing is sent to a server; every copy off the phone is a file the potter saves where they choose.

**Easy:** No store, no secret, no bill; privacy is as good as the place the file is kept. **Costs:** The potter must remember to save a file (the open question on the button applies); the gap between copies is the potter's habit; a file saved to the phone's own storage is lost with the phone. **Asks of the maintainer:** A file format that stays importable across app versions, and an import screen. No server. **Suits:** A maintainer who wants no server to keep up.

### How the secret reaches the installed iPhone app

**Exclusive:** no (a product could take several). **Why it matters:** On iPhone a Safari tab and the installed app are separate stores, so a secret made when the friend taps a link in Safari is not in the app they then install; this is the iPhone-specific work the maintainer's "mix" carries. Android shares the store between tab and installed app, so it does not arise there.

What is chosen: How a friend's secret ends up in the home-screen app on an iPhone. Options: [A cookie the server sets](#a-cookie-the-server-sets); [The secret is made in the installed app](#the-secret-is-made-in-the-installed-app); [A file from the Safari tab](#a-file-from-the-safari-tab).

#### A cookie the server sets

When the friend opens the link in Safari, the server sets a cookie holding the secret; on iOS 17.2 and later, "Add to Home Screen" copies the site's cookies into the new web app once.

```
  Safari tab: server sets cookie --Add to Home Screen--> installed app has the cookie
```

**Easy:** Nothing to type; WebKit's own blog describes the copy ("No other kind of local storage is copied over"), so the secret reaches the app with no step from the friend. **Costs:** Only on iOS 17.2 or later, and only at the moment of adding; older iPhones get nothing; the cookie is one more place the secret lives; whether a server-set cookie keeps its full lifetime in the installed app was read only in community notes (unverified). **Asks of the maintainer:** A server that sets the cookie and an app that reads it once and moves the secret into its own storage; a test on a real iPhone. **Suits:** Friends on current iPhones.

#### The secret is made in the installed app

The app makes or accepts the secret only when opened from the home screen; in a Safari tab it logs nothing and says to install first.

**Easy:** No hand-over at all; one store per friend. **Costs:** The first pot cannot be tried before installing, which cuts against the earlier "straight into a working app" option; installing on iPhone is the Share-menu steps. **Asks of the maintainer:** Detecting the installed state and a clear "install first" screen. **Suits:** Friends who will install at once.

#### A file from the Safari tab

Pots logged in a tab can be saved as a file there and opened in the installed app, after which the app has its own secret.

**Easy:** Rescues pots already in a tab; no new platform feature needed. **Costs:** Needs the file save and import screens, and a friend who understands why; a manual step for the very moment the friend knows least. **Asks of the maintainer:** The same export and import as [A file the potter saves](#a-file-the-potter-saves). **Suits:** Friends who already logged pots in a tab.

### How the stored copy is protected

**Exclusive:** yes. **Why it matters:** The maintainer said "Yes, my friends trust me", so a store the maintainer can read is allowed; the choice is about what a leak of the store alone would show.

What is chosen: Whether the stored copy is kept as it is or locked with a key the server holds. Options: [Readable behind the secret](#readable-behind-the-secret); [Encrypted at rest under a server key](#encrypted-at-rest-under-a-server-key). A key only the potter holds is not offered, as it needs something remembered.

#### Readable behind the secret

The store keeps records and photos as they are, protected only by the secret or passkey.

**Easy:** Simple; the store can check a copy, keep earlier copies and preview photos. **Costs:** Anyone who gets into the store or its disk can read every potter's pots. **Asks of the maintainer:** Running and patching the store; keeping its access logs free of secrets. **Suits:** A circle that trusts the maintainer.

#### Encrypted at rest under a server key

The server encrypts each copy with a key it keeps outside the stored data, so a leaked disk or backup shows nothing readable.

**Easy:** Protects against a lost disk or backup; the maintainer can still restore or reset; no potter-held key. **Costs:** The maintainer can still read pots, which they accepted; one more key to keep and never lose; extra code. **Asks of the maintainer:** Key handling in the server's settings and a plan for it never being lost. **Suits:** A maintainer who wants a layer against leaks but not against themselves.

### Where the copy is kept

**Exclusive:** no (a product could take several). **Why it matters:** Where a copy sits decides who can reach it and what the maintainer must keep running.

What is chosen: The place or places a copy goes besides the phone. Options: [A file the potter saves](#a-file-the-potter-saves); [The maintainer's server](#the-maintainers-server); [The potter's own cloud drive](#the-potters-own-cloud-drive).

#### A file the potter saves

A button makes one file (records and photos) and hands it to the phone's share sheet or a download, so the potter chooses where it goes (Web Share with files: Safari on iOS from 14 on Can I use, 15 per Firtman).

```
  [ Save a copy ] -> share sheet -> Files / drive / chat
```

**Easy:** No server; works with any place the potter already trusts; the file keeps for years. **Costs:** An installed iPhone app reportedly gets stuck on a plain download link, so the share sheet is the route community reports describe (unverified); a potter who picks Downloads has not left the phone; each file needs a tap, and the maintainer is not sure a button is acceptable. **Asks of the maintainer:** The file format and its versioning; an import screen that must keep working. **Suits:** Every potter, as a last line of defence.

#### The maintainer's server

The app posts a copy to a small store the maintainer runs whenever it is open and online.

**Easy:** A copy exists without the potter doing anything; the app can show how old it is. **Costs:** A store, its disk, upgrades and bill sit with one person after the deadline; the platform's backup of that disk is limited (daily, five days). **Asks of the maintainer:** Keeping the store running, plus one of the protection options above. **Suits:** A maintainer willing to run one small service.

#### The potter's own cloud drive

The app writes a copy to a drive the potter already has, after the potter allows it.

**Easy:** No store of the maintainer's own; the copy sits where the potter already looks. **Costs:** The potter signs in with the drive's provider, which is an account of that provider; that provider's terms, review rules and sign-in expiry can break it quietly (recalled; no provider page was read); no Hop has chosen the provider. **Asks of the maintainer:** Choosing, registering with and keeping up with a provider; handling expired sign-ins. **Suits:** Potters who live in one cloud drive.

## A replaced or wiped phone gets its records back

**Solved when:** A new, reset or emptied phone can reach the potter's last copy and read it back into the app, without the potter having kept a code.

### How the records come back

**Exclusive:** no (a product could take several). **Why it matters:** A copy nobody can restore is not a recovery, and with nothing for the potter to remember, the way back has to rest on the maintainer, a file or the old phone.

What is chosen: What happens on a new or emptied phone to get the pots back. Options: [The maintainer sends the link again](#the-maintainer-sends-the-link-again); [Open a saved file](#open-a-saved-file); [Scan from the old phone](#scan-from-the-old-phone).

#### The maintainer sends the link again

The friend messages the maintainer, who sends that friend's link (or issues a new one tied to the same copy); the friend taps it on the new phone.

**Easy:** Nothing for the friend to keep; fits two or three known friends; works with a lost old phone. **Costs:** Needs the maintainer to be reachable and to know whose copy is whose (easy with [a link the maintainer sends each friend](#a-link-the-maintainer-sends-each-friend), harder with an app-made secret); needs signal; on iPhone the secret must still reach the installed app. **Asks of the maintainer:** Answering each request and holding the means to match friend to copy. **Suits:** A circle the maintainer knows personally.

#### Open a saved file

The potter opens the file from the share sheet or a picker and the app imports it.

**Easy:** Works with no signal and no server; also fills an installed app from a tab's export. **Costs:** The potter has to have saved a file and kept it off the phone; large files with photos take time to read; a file from an old app version must still open. **Asks of the maintainer:** An import screen and a rule for older file versions, tested against old files. **Suits:** Every potter who saved a file.

#### Scan from the old phone

While the old phone still works, it shows a code the new phone scans to receive the records.

**Easy:** No server and no file; a quick move at a planned upgrade; nothing to remember. **Costs:** Useless once the old phone is lost; needs the camera and both phones; the transfer route still has to be built. **Asks of the maintainer:** A pairing flow and scan screen, tested on both phone kinds. **Suits:** Planned phone upgrades.

## A copy is made although iPhones only copy while open

**Solved when:** The potter can see how recent the last copy is, and new pots reach a second place the next time the app is open with signal.

### When the copy is made

**Exclusive:** no (a product could take several). **Why it matters:** iPhones cannot copy in the background, so the moments a copy happens, and how visible they are, decide how big the gap is. The maintainer is "not sure yet" whether a button with a reminder is acceptable as one layer; that is left open.

What is chosen: The moments at which the app makes a copy; all need the app open and, for a server copy, online. Options: [Each time the app opens online](#each-time-the-app-opens-online); [After each save while online](#after-each-save-while-online); [A button the potter taps](#a-button-the-potter-taps); [A reminder when the last copy is old](#a-reminder-when-the-last-copy-is-old).

#### Each time the app opens online

On launch and when the phone reports it is online again, the app copies anything new.

**Easy:** The potter does nothing; fits how iPhones work; catches up the evening after a studio day. **Costs:** A potter who never opens the app at home leaves a gap; a photo backlog over weak signal can take long. **Asks of the maintainer:** A queue of what is unsent and retry rules. **Suits:** Potters who open the app most days.

#### After each save while online

Each save of a pot, stage change or photo is sent as soon as it is stored, when a connection exists.

**Easy:** The smallest gap whenever there is signal. **Costs:** Many small sends over poor signal; more retry logic. **Asks of the maintainer:** Per-change sends and ordering rules on the server. **Suits:** Potters who often have signal.

#### A button the potter taps

A "Save a copy now" button makes a copy of everything (file or server) on demand.

**Easy:** The potter chooses the moment, for instance on home wifi; one clear action. **Costs:** Depends on the potter remembering, which with clay on the hands is the step most easily skipped; the maintainer has not said a button is acceptable. **Asks of the maintainer:** Almost nothing beyond the copy itself. **Suits:** A last layer beside others, if the maintainer wants a button.

#### A reminder when the last copy is old

The app shows when the last copy was made and a nudge once it is older than a limit the potter can see.

**Easy:** Makes the gap visible with no server; costs one glance. **Costs:** A nudge can be ignored or annoy; the limit is a guess until a potter says what suits them. **Asks of the maintainer:** A last-copy time on the phone and a rule for when to show it. **Suits:** Potters who like to be told.

## A lost or leaked secret does not end the copy's safety

**Solved when:** A potter whose phone is lost or whose secret leaks is not left with either a stranger reading their pots or no way back, and has had nothing to remember.

### What happens when the secret is lost or leaked

**Exclusive:** yes. **Why it matters:** With nothing for the potter to hold, recovery rests on the maintainer or on the platform; each choice trades the maintainer's time against the risk of loss.

What is chosen: What can be done for a potter whose phone is lost or whose secret is exposed. Options: [Nothing can be done](#nothing-can-be-done); [The maintainer can reset a friend's copy](#the-maintainer-can-reset-a-friends-copy); [A secret the potter can replace](#a-secret-the-potter-can-replace).

#### Nothing can be done

A lost secret means the copy cannot be opened; a new secret starts an empty copy.

**Easy:** No support work. **Costs:** A lost phone then loses the records the copy was there to protect, against "My pots' records are always safe"; a leaked secret cannot be shut off. **Asks of the maintainer:** The app must say plainly that this is so. **Suits:** Friends who accept the risk.

#### The maintainer can reset a friend's copy

The maintainer can hand a friend a new secret for the same copy, after checking by message who they are.

**Easy:** A lost phone is a message away; the maintainer's trusted position (their answer) allows it; nothing for the friend to keep. **Costs:** Every reset is the maintainer's time; the check of who is asking is a judgement; needs the store to be readable or re-keyable by the maintainer. **Asks of the maintainer:** Answering requests and holding the means to reset. **Suits:** A circle the maintainer knows personally.

#### A secret the potter can replace

From the app the potter can make a new secret, which moves the copy and invalidates the old one.

**Easy:** A leaked link can be shut off without help; the W3C TAG advises that capability URLs be revocable. **Costs:** Works only while the potter still has the app; other installs must be given the new secret; does nothing for a lost phone. **Asks of the maintainer:** A replace route on the server and rules for other devices on the old secret. **Suits:** Potters who share a phone or paste links in chats.

## A bad copy does not replace a good one

**Solved when:** An update bug, a cleared store or a second install cannot overwrite a good copy off the phone with an empty or older one.

### How earlier copies are kept

**Exclusive:** yes. **Why it matters:** A copy that mirrors the phone can copy a loss (see [loss-events.md](loss-events.md)), and two installs on one iPhone are normal; how copies are kept decides whether such events can be undone.

What is chosen: What the place holding the copy does when a new copy arrives. Options: [Only the latest copy](#only-the-latest-copy); [The last few dated copies](#the-last-few-dated-copies); [Merge pot by pot](#merge-pot-by-pot).

#### Only the latest copy

Each new copy replaces the one before.

**Easy:** The simplest store; least disk. **Costs:** An emptied database copied over the good one loses everything; two installs overwrite each other. **Asks of the maintainer:** Nothing extra. **Suits:** A first version.

#### The last few dated copies

The store keeps the last few copies with their dates, and the app can restore an older one.

**Easy:** An update bug or a cleared store can be undone; works with a file too (dated files). **Costs:** More disk, mostly photos; a restore screen to build; the platform's own disk backup (daily, five days) is no substitute. **Asks of the maintainer:** A keep-the-last-N rule and a restore choice. **Suits:** Potters who do not notice a loss for weeks.

#### Merge pot by pot

Each pot has its own identity and last-changed time, and a copy adds or updates pots rather than replacing the lot.

**Easy:** Two installs of one potter can both be kept; an empty copy erases nothing. **Costs:** Deleted pots and conflicting edits need rules; more code. **Asks of the maintainer:** Merge rules and tests with two phones. **Suits:** Potters with two devices or a Safari tab and an installed app.

## Facts the options lean on

- **Capability URLs.** The W3C TAG note says an unguessable URL can stand in for a login; it advises https, 120 bits or more of secure randomness, no third-party scripts or links on pages reached that way, revocable URLs and rate limiting, and warns that URLs leak through history, logs and the `Referer` header ([W3C TAG](https://w3ctag.github.io/capability-urls/)). Read in full.
- **Cookies copied at Add to Home Screen.** WebKit's Safari 17.2 notes say that on iOS 17.2, adding a web app to the Home Screen copies the site's cookies into it, that no other kind of local storage is copied, and that afterwards no other website data is shared ([WebKit blog](https://webkit.org/blog/14787/)). Read in full. A community note adds that a Home Screen app is exempt from Safari's 7-day deletion and that its storage is separate from Safari's (a GitHub issue, unverified).
- **No background copy on iPhone; Web Authentication since iOS 14.5; Web Share with files.** [Firtman's list](https://firt.dev/notes/pwa-ios/) (read in full) gives Background Sync, Periodic Background Sync and Background Fetch as unsupported, Web Authentication from 14.5, and Web Share 2.0 from 15.0. [Can I use](https://caniuse.com/mdn-api_navigator_canshare_data_files_parameter) lists `canShare` with files in Safari on iOS from 14.
- **Downloads in an installed iPhone app.** Several community pull requests say a plain download link leaves an installed iPhone app stuck on the file and hand the file to the share sheet instead ([example](https://github.com/julienfroidefond/stripstream-librarian/pull/71)); search excerpts only (unverified for the current iOS).
- **A photo-bearing export tool exists.** Dexie's export-import add-on writes a whole IndexedDB database to a file ([Dexie docs](https://dexie.org/docs/ExportImport/dexie-export-import)); its handling of Blob photos and large databases was not read (unverified).
- **What the loss events need** is in [loss-events.md](loss-events.md).

## How the choices combine

"Which proof" and "how the secret reaches the iPhone app" fix whether a friend needs help to start; "where" and "when" fix the safety; "how it comes back" and "lost secret" fix whether a friend recovers alone. Constraints, none ruling an option out: an app-made secret leaves the maintainer unable to say whose copy is whose unless a label is kept, which the re-sent link and the maintainer reset need; "No server copy, only files" leaves "when" to a button and a reminder, and the maintainer is unsure of both; a passkey leaves recovery to the phone maker's keychain (iCloud Keychain or Google Password Manager) and to the potter's Apple or Google account; a cloud-drive copy moves the proof to the drive's provider. An earlier exploration lists three ways a private space begins ([clay-hands-capture-design](../clay-hands-capture-design/design-space.md#how-a-friends-private-space-begins)); the options here are for what comes after the first pot.

## Sources

Read in full: [Apple Support, About the security of passkeys](https://support.apple.com/en-us/102195) (page dated 16 September 2024); [Google for Developers, Passkey support on Android and Chrome](https://developers.google.com/identity/passkeys/supported-environments) (updated 2025-05-19); W3C TAG capability URLs; WebKit's Safari 17.2 notes; Firtman's iOS PWA list; Can I use for `canShare` files; [web.dev WebAPKs](https://web.dev/articles/webapks). Search excerpts only: MDN, Dexie export-import, community download threads, GitHub notes on iPhone Home Screen storage. No source was found that compares the options for a small circle of potters, and no friend's own view was gathered.

## Open questions

The questions, what was looked for and not found, and the unverified claims are in [open-questions.md](open-questions.md).
