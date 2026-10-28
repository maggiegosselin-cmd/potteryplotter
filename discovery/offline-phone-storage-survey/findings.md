# Findings: offline phone storage for a home-screen web app

**Kind of hop: a survey** of things outside the project (browser and phone storage rules, install rules, sync approaches, photo sizes). It writes findings, not a design space. It chooses no stack and makes no decision; where an option is described, its costs are given and the choice is left to the hops that build on this one.

Question asked: what can a home-screen web app keep safely on a phone with no signal, and what can make it lose it?

## Contents

- [Short answer](#short-answer)
- [How the sources were read](#how-the-sources-were-read)
- [1. How much a phone keeps offline, and when it can clear it](#1-how-much-a-phone-keeps-offline-and-when-it-can-clear-it)
- [2. Keeping records on the phone and copying them elsewhere](#2-keeping-records-on-the-phone-and-copying-them-elsewhere)
- [3. What home-screen install takes](#3-what-home-screen-install-takes)
- [4. Photo sizes and glaze fidelity](#4-photo-sizes-and-glaze-fidelity)
- [How this bears on the objectives and later hops](#how-this-bears-on-the-objectives-and-later-hops)
- [Sources](#sources)
- [Open questions](#open-questions)

## Short answer

- **Room is not the problem.** On current iPhones (iOS 17 and later) and on Chrome for Android, one installed app may use up to roughly 60% of the phone's total disk. A potter's text records are tiny and photos resized to a few hundred KB each stay in the tens or hundreds of MB for years (arithmetic in section 1).
- **Losing data is the problem, and the phone can do it in four ways:** the user deletes the app or clears site data; Safari's 7-day idle rule hits data kept in a Safari tab rather than an installed app; low-disk eviction hits data that was never marked persistent; and an iPhone installed app starts empty, because it does not share storage with Safari.
- **Nothing the web platform offers makes phone-only storage "always safe".** Even data marked persistent is deleted if the user chooses. Keeping the records safe means a second copy somewhere else, made whenever signal allows, plus an in-app nudge when the last copy is old.
- **iPhones cannot sync in the background.** Safari has no Background Sync, so a copy can only happen while the app is open (section 2).
- **Install is different on each platform and iPhones show no install prompt**, so the app has to teach the Share-menu steps itself (section 3).
- **Photos:** a phone photo is 1 to 10+ MB and the sources disagree on exact figures; a copy cut to about 1600 px on the long side at JPEG quality near 80 is about 400 KB by one general guide. Whether that still shows a glaze faithfully was not measured here (section 4).

## How the sources were read

Pages were fetched or read as search excerpts in this run. Primary sources are WebKit's own posts (storage policy, tracking prevention) and bug tracker, MDN, web.dev, and the vendors' own pricing and documentation pages for the sync options in section 2. Secondary sources are OpenPWA (a reference site that quotes WebKit and includes one device test on iOS 18.6.2), a compatibility list by Maximiliano Firtman, and many community issue threads. Community threads are used only as pointers and are marked (unverified) where a claim rests on them. Anything from memory carries (recalled). No iPhone or Android phone was available, so no behaviour here was tested on a device.

## 1. How much a phone keeps offline, and when it can clear it

### What a web app can write to

MDN lists cookies, Web Storage (localStorage, 5 MiB per origin), IndexedDB, the Cache API and the Origin Private File System. Everything except cookies counts against one per-origin quota, and an eviction deletes an origin's data as a whole, not part of it ([MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). So records and photos in IndexedDB and the app's cached shell in Cache Storage go together.

### Size limits

| Platform | Per-origin limit | Overall limit | Source |
|---|---|---|---|
| iPhone, iOS 17+ (Safari, and installed home-screen apps) | up to ~60% of total disk | ~80% of disk across all sites | [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) |
| iPhone, other apps embedding web content | ~15% of disk | ~20% | same |
| iPhone before iOS 17 | 1 GB start; then the write fails in installed apps, or Safari asks the user | not read | [WebKit Safari 17.0 notes](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) |
| Chrome / Edge, Android | up to 60% of total disk, best-effort or persistent | Chrome uses at most ~80% of disk | MDN, above |
| Firefox | smaller of 10% of disk or 10 GiB (best-effort); 50% if persistent | not read | MDN, above |

Limits are an upper bound, not a promise: the quota is computed from total disk, not free space, and WebKit says it may shift with usage and visit frequency to limit fingerprinting, so `QuotaExceededError` must be handled. When a write fails, nothing is stored.

Illustrative arithmetic (mine, not from a source): a 128 GB phone gives a ceiling near 77 GB per app, never reachable because the phone also holds the user's own photos and apps. A potter who makes 200 pots a year and keeps 3 photos each at ~400 KB uses about 240 MB a year. Text records add kilobytes. Free disk on the phone, not the quota, is the real ceiling.

### When the phone may delete it

MDN and WebKit name three eviction triggers: the phone is low on space (storage pressure), all stored data across sites passes the overall cap, and (Safari only) the site has gone unused. Low-space eviction removes least-recently-used origins first and skips origins marked persistent.

**iPhone and Safari.**
- **Seven-day rule (Intelligent Tracking Prevention).** After seven days of Safari use without the user interacting with a site, Safari deletes that site's script-writable storage: IndexedDB, localStorage, service worker registrations and caches. The count is days of Safari use, not calendar days. Cookies the server sets are exempt ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); [OpenPWA summary](https://openpwa.net/reference/storage/safari-seven-day-cap/)).
- **Installed apps are exempt.** WebKit's tracking-prevention page says the first-party domain of a home-screen web app is exempt from the 7-day cap, as quoted by [OpenPWA](https://openpwa.net/reference/storage/home-screen-storage-isolation/). WebKit asks developers to report it as a serious bug if an installed app's first-party data is deleted. So the same site can lose data in a tab and keep it when installed.
- **The installed app is a separate store.** Home-screen apps do not share storage with Safari; WebKit calls this by design. Since iOS 17.2 only cookies are copied at the moment of adding to the Home Screen ([OpenPWA](https://openpwa.net/reference/storage/home-screen-storage-isolation/), quoting WebKit). OpenPWA's device test on iOS 18.6.2 saw cookies arrive and localStorage and IndexedDB markers read empty. **Anything a person enters in a Safari tab before installing is not in the installed app.** Each install is also its own store (the same test saw a second install not see the first's cookie).
- **Low-disk eviction still applies** to installed apps unless persistent (WebKit). `navigator.storage.persist()` exists on iOS since 15.2, and the full Storage API since 17.0 ([Firtman](https://firt.dev/notes/pwa-ios/)). WebKit grants the request by heuristics "like whether the website is opened as a Home Screen Web App", with no prompt. It can return false.
- **Deleting the icon.** Apple's user guide says deleting an app removes its data; OpenPWA says its sources do not say how this applies to home-screen web apps. MDN as quoted by OpenPWA says removing the icon deletes the PWA. Treat deleting the icon as deleting the records (unverified).
- **EU:** from iOS 17.4 alternative browser engines may be used, and their own storage policies apply instead of WebKit's (MDN).

**Android.**
- **Chrome** treats data as best-effort by default; research by the Chrome team says Chrome rarely clears data on its own, and it is far more common for users to clear storage by hand ([web.dev](https://web.dev/articles/persistent-storage)). Under disk pressure it evicts least-recently-used best-effort origins.
- **`persist()`** is approved or denied automatically, with no prompt, from heuristics. The 2016 Chrome post said bookmarked sites would be granted and that installing to the home screen would count (Chrome team [Medium post](https://medium.com/dev-channel/persistent-storage-d5840b36475c)); the current full list of heuristics is unpublished (web.dev says so by naming only examples). If granted, the browser will not evict the data, but "users are always in charge" and can delete it ([web.dev PWA course](https://web.dev/learn/pwa/offline-data)).
- **Uninstall:** OpenPWA reports that for a Chrome WebAPK, Chrome keeps the origin's data in the browser profile and the WebAPK had no separate store. On desktop, uninstall has an opt-in "delete data" checkbox. Whether clearing data in Android's app settings, or Chrome's "clear browsing data", spares installed apps was not found (see open questions).
- **Firefox on Android** adds a shortcut rather than a WebAPK (MDN pull request, [mdn/content #45530](https://github.com/mdn/content/pull/45530)), and Firefox asks the user before granting persistent storage.

**What clears data on both:** private browsing; "clear site data" or "clear browsing data" by the user; a phone reset or loss; and a change of origin (a new domain is a new store, so the web address the app is installed from must not change) (recalled).

### Photos stored on the phone

- **Blob and File values in IndexedDB.** WebKit's bug tracker points to a private-browsing limit rather than a general iPhone one. Bug [198278](https://bugs.webkit.org/show_bug.cgi?id=198278) (2019, status resolved) began as "cannot store blobs in IndexedDB on iOS". The reporter's own tests found storing a blob worked on iOS 12.2, 12.3 and 13 beta 1 and a WebKit engineer could not reproduce the failure on 12.4 beta and confirmed the test page on iOS 13 beta 1. One failure on 12.3.1 (a "BlobURLs are not yet supported" error) was reported and not explained. The failures at an Apple store turned out to be devices set to private mode by default, and the reporter concluded that "non-private mode definitely works in 12.4". WebKit's commit of 31 January 2025 ([bug 286561](https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg225613.html)) makes IndexedDB return an error when a blob is stored in an ephemeral (private) session, in worker as well as window contexts, so private tabs refuse blobs on purpose. No WebKit page read says that blob storage fails in a normal Safari tab or an installed home-screen app on a current iPhone.
- **The "Error preparing Blob/File data to be stored" reports.** Community issue threads from 2026 quote this error from headless WebKit test builds ([example](https://github.com/saquibrashid/agentic-coffee-tracker/issues/100)) and recommend `ArrayBuffer` as a workaround; they are not WebKit documentation. That headless builds run as ephemeral sessions, which would explain the error, is my reading and was not checked (unverified). (Peradapt could not verify this: the cause of the photo error is a guess) Storing photos as `ArrayBuffer` avoids the question, and a real-iPhone test (normal tab and installed app) would settle it. Private browsing cannot keep photos, and loses all its data when closed, so an installed app is the place to record pots.
- OPFS (a private file area) is supported on iOS since 15.2 and writable streams since 26.0 ([Firtman](https://firt.dev/notes/pwa-ios/)). It counts against the same quota, so it is no safer from eviction than IndexedDB.

### What this means for "no lost records"

Ranked by how likely a hobbyist is to hit them (my judgement, not a measured rate):
1. Phone lost, broken, replaced, or the app deleted or its site data cleared by the user. No browser setting prevents this.
2. An iPhone user records pots in a Safari tab, then installs, and the installed app is empty.
3. An iPhone user does not install, or stops opening the app, and Safari's 7-day rule deletes tab data.
4. Low-disk eviction of data that was never granted persistence. A photo-heavy phone is the likeliest to be near full.
5. Hitting the quota: very unlikely at this scale.

## 2. Keeping records on the phone and copying them elsewhere

### What the phone can and cannot do

- **Local stores:** IndexedDB (records, and photos as ArrayBuffer or Blob), Cache Storage (the app shell), OPFS, localStorage (5 MiB, too small for photos). IndexedDB is the usual home for records.
- **No background copy on iPhone.** Safari and installed iPhone apps have no Background Sync, Periodic Background Sync or Background Fetch ([Firtman](https://firt.dev/notes/pwa-ios/)). Chrome has Background Sync, which defers work until the connection is stable ([Chrome blog](https://developer.chrome.com/blog/background-sync)); Safari and Firefox lack Periodic Background Sync ([web-platform-dx signal](https://github.com/web-platform-dx/developer-signals/issues/380)). So any plan must copy **while the app is open and online** (on launch, on the `online` event, on a "back up now" button), and must show the potter how old the last copy is.
- **No public file-system access on iPhone** (File System Access: not supported; Firtman). A backup file has to leave through a download or the share sheet. The Web Share API can share files; apps use it to send a backup to Files or Drive ([example issue](https://github.com/maat-apps/routines/issues/66), a project plan, not a test result) (unverified for the current iOS version).

### Ways to keep and copy, with what each asks of one maintainer

"Cost" here means ongoing work and risk for one person after the deadline, not only money. Prices and limits for ways D, E and F and for PowerSync and RxDB are from the vendors' own pricing pages as read in this run; free-tier terms change often, so they should be re-read when a choice is made. The upkeep judgements are mine.

| # | Way | What it is | Ongoing cost to one maintainer |
|---|---|---|---|
| A | **Phone only, plus manual export** | Records and photos live in IndexedDB; a button writes a file (JSON, photos zipped) and hands it to the share sheet. | No server, no account, no bill. Safety depends on each potter remembering to export; the app can nag. Restore needs an import screen that must keep working across app versions. A forgotten export means a lost phone loses everything. |
| B | **Own small server with an outbox queue** | The app writes locally first and queues each change; when online it posts the queue to the maintainer's own API and database, photos to file or object storage. | Highest: an API, a datastore, sign-in for 3 to 4 people, schema changes on both sides, a photo store, an upgrade path for the local database, retry and de-duplication rules. Most control, most upkeep. Hosting is decided elsewhere in this project. |
| C | **Sync library with a server the maintainer runs** | A browser database that replicates to a server, e.g. PouchDB with CouchDB, Automerge with its sync server, or RxDB or Replicache against a backend (details below the table). | Replication and conflict handling are done by the library, but the maintainer still runs and upgrades a server, its disk and its auth, and learns the library's model. Library abandonment is a risk (see Replicache below). |
| D | **Sync service with a hosted backend** | A client library plus a vendor-run backend. Dexie Cloud: free plan of 3 production users, 100 MB storage; production plan €3 a month per 25 seats ([Dexie pricing](https://dexie.org/pricing)). PowerSync Cloud: free plan of 500 MB hosted data, 2 GB synced a month and 50 concurrent clients; Pro from $49 a month ([PowerSync pricing](https://powersync.com/pricing)). | Little server work. **Dexie Cloud:** the free plan's 3 production seats are one short of "me plus 2 or 3 friends" when there are 4 people; further users get free evaluation accounts that sync for 30 active days, after which sync stops until the user takes a seat, and the first 25 seats cost €3 a month (same page). Free storage is split into 25 MB of record data and 75 MB of blob data (photos stored as `Blob`), with 1,000 blob writes a month; at about 400 KB a photo that is room for roughly 190 photos in total (arithmetic, mine). The free plan's sync rate limit is 50 requests per 5 minutes per user. **PowerSync Cloud:** syncs a source database that the maintainer must still have (Postgres, MongoDB, MySQL or SQL Server) and free projects are deactivated after 1 week of inactivity; its pricing page does not mention photos or files. Both depend on one vendor's terms and survival. |
| E | **Backend-as-a-service for records, with its file store for photos** | Local-first app posts to a hosted database and file bucket. Supabase free plan: 500 MB database, 1 GB file storage, 5 GB egress, 50 MB largest upload, 2 active projects; Pro from $25 a month with 100 GB file storage ([Supabase pricing](https://supabase.com/pricing)). | Low code, but the pricing page says free projects are paused after 1 week of inactivity, so on a quiet side project the first sync after a week of no use may fail until someone resumes it; paid plans are not paused. The free plan has no automatic backups (the page lists "Not included in free"; Pro keeps daily backups for 7 days), so the free tier holds the only server copy without a backup. 1 GB of photos is about 2,500 photos at 400 KB, so room is tight but real. |
| F | **Cheap object store for photos, records elsewhere** | Photos go to an object store with a free allowance. Cloudflare R2 Standard storage: 10 GB-months, 1 million write-class and 10 million read-class operations free each month, then $0.015 per GB-month; no egress charge ([Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)). | Another account and another sync path to keep consistent with the records. Useful only when photos outgrow whatever holds the records: 10 GB is about 25,000 photos at 400 KB (arithmetic, mine), far above one potter's yearly use. |
| G | **Copy into the potter's own cloud drive** | After sign-in with the potter's Google or Apple account, the app writes a backup file to their drive (recalled; no provider's documentation was read). | No server of the maintainer's own, but each provider's sign-in and API terms must be kept up, and review or token expiry can break it silently (recalled). |

Sync libraries in more detail (way C), each from the project's own pages:
- **PouchDB with CouchDB.** PouchDB's FAQ says the backend must speak the CouchDB replication protocol, so it cannot sync with an arbitrary database; documents are versioned with a `_rev` field, which is how conflicts are handled ([PouchDB FAQ](https://pouchdb.com/faq.html)). CouchDB's documentation says PouchDB implements CouchDB's replication algorithm in JavaScript ([CouchDB docs](https://docs.couchdb.org/en/stable/replication/intro.html)). Cost to one maintainer: run and upgrade a CouchDB server.
- **Automerge.** `automerge-repo` is the plumbing for an app: a `Repo` takes a storage adapter for local saving and network adapters to talk to peers ([Automerge docs](https://automerge.org/docs/reference/repositories/)). The project's sync-server example stores data in a directory set by `DATA_DIR` ([sync-server changelog](https://github.com/automerge/automerge-repo-sync-server/blob/main/CHANGELOG.md)). Cost: run a small server with a disk; the data model is a CRDT document rather than rows.
- **RxDB.** The core is free under Apache 2.0 and includes replication and the default storage; the IndexedDB and OPFS storages, encryption and similar plugins are in paid tiers from $99 a month billed annually, and premium licences are annual only ([RxDB pricing](https://rxdb.info/premium/)). RxDB has replication plugins for several backends, including Supabase and MongoDB (page titles only were read). Cost: a backend to replicate to, and a decision whether the free default storage is enough.
- **Replicache.** Rocicorp's repository describes Zero and Replicache as its two products; Zero's client uses Replicache under the hood and has its own server-side package ([rocicorp/mono](https://github.com/rocicorp/mono)). A forum post quotes the Replicache site saying it is in maintenance mode, open-sourced and free to use, with no new features and users advised to move to Zero (Peradapt could not verify this: taken from a forum, not the source) ([BaseHub forum](https://forums.basehub.com/rocicorp/mono/1)); the Replicache site itself was not read. Cost: a server the maintainer writes or hosts, and a library with no new features.

Notes that apply to all:
- Each friend keeps private records and the project assumes no shared studio view, so conflicts only arise when one potter uses two devices or two installs. An iPhone and its installed app are separate stores, and so are two installs on one phone (OpenPWA test, section 1), which makes "two stores per person" more likely than it sounds.
- A, B and the sync options can be combined: a local database, a continuous copy to a server, and a manual export as the last line of defence.
- Whatever is chosen must keep working through changes to the **local** database layout: IndexedDB versions are managed by the app and a failed upgrade is a way to lose data without any phone rule being involved (recalled).
- Nothing in this survey identified a way for an installed web app on an iPhone to copy data off the phone with no signal and no user action. Copy needs signal and an open app.

## 3. What home-screen install takes

### iPhone and iPad

- **How:** open the site in Safari, tap Share, choose Add to Home Screen ([step-by-step guide](https://www.appdrawn.com/how-to-add-a-web-app-to-your-home-screen-on-ios)). From iOS 16.4 other browsers can install if they opt in (Firtman). There is **no install prompt or `beforeinstallprompt`** on iOS (Firtman), so the app must show its own instructions, and only when it is not already running installed.
- **Open as web app:** before iOS 26 a site opened as an app only if its manifest set `display` to `standalone` or `fullscreen` (or it carried the Apple meta tag); otherwise it was saved as a bookmark that opens in the default browser. From iOS 26 every site added opens as a web app by default, unless the user turns off "Open as Web App" in the add dialog; WebKit's notes say there are zero installability requirements ([OpenPWA quoting WebKit 26.0](https://openpwa.net/reference/storage/home-screen-storage-isolation/)). A bookmark does not have the installed app's storage rules, so the app should detect and say so (detection with `navigator.standalone` or the `display-mode` query is shown on the OpenPWA page).
- **What the app should provide:** a web app manifest with `name`, `short_name`, `start_url`, `scope`, `display: standalone` and PNG icons (manifest icons are honoured since iOS 15.4; the `apple-touch-icon` link overrides them; SVG works in the manifest only, since 26.0, and `maskable` is ignored); `apple-touch-startup-image` links for a splash screen, which only work with the Apple web-app-capable meta tag; `theme-color` ([Firtman](https://firt.dev/notes/pwa-ios/)). A service worker is needed for offline use of the app shell, supported since iOS 11.3.
- **Constraints on iPhone:** HTTPS (recalled); the user picks the home-screen name; install must be done from a browser, not an in-app browser (recalled; OpenPWA has a page on this that was not read); every install is a separate empty store; sign-in cookies are copied at install since 17.2, but nothing else.

### Android

- **How:** in Chrome, the menu offers Install app (or Add to Home screen); wording varies by device and browser ([web.dev](https://web.dev/learn/pwa/installation)). On Android, only Chrome on phones with Google Mobile Services and Samsung Internet on Samsung phones install a PWA as a WebAPK, with a real entry in the app launcher; Firefox adds a shortcut ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)).
- **Chrome criteria (as listed by two third-party guides):** HTTPS; a manifest with `name` or `short_name`, `start_url`, `display`, and 192 px and 512 px icons; not already installed; a user-engagement heuristic (about 30 seconds of interaction); and a service worker with a fetch handler ([PWA workshop](https://pwa-workshop.js.org/5-pwa-install/), [instantpwa](https://instantpwa.com/answers/chrome-install-prompt-requirements)). Chrome announced experiments to simplify these criteria ([Chrome blog](https://developer.chrome.com/blog/update-install-criteria), excerpt only); whether the service-worker requirement has been dropped was not established (unverified). Keeping a manifest, both icons and a fetch-handling service worker satisfies both the old and the simplified lists.
- **Install button:** Chrome fires `beforeinstallprompt`, so the app can show its own "Install" button on Android, which iPhone cannot. A maskable icon variant is advised for Android (frontendchecklist excerpt; recalled for exact details).

### What every platform ties to the web address

Storage belongs to the origin (scheme, host, port). Installing from one address and later moving the site to another starts empty; the address should be chosen once and kept. This follows from MDN's per-origin model; no source tested a migration.

## 4. Photo sizes and glaze fidelity

### How large phone photos are

| Camera / format | Typical file size | Source |
|---|---|---|
| iPhone 12 MP, HEIC | 1 to 3 MB | [HEICify](https://www.heicify.com/guides/iphone-photo-formats-guide) |
| iPhone 12 MP, JPEG | 3 to 6 MB (2 to 5 MB per another page) | same; [dblabsapps](https://dblabsapps.com/statistics/iphone-storage-photos-statistics/) |
| iPhone 48 MP, HEIC | 3 to 5 MB per one page; 5 to 10 MB per two others | [dblabsapps](https://dblabsapps.com/statistics/iphone-storage-photos-statistics/), [minipx](https://minipx.com/blog/why-iphone-photos-so-large/), [dblabsapps blog](https://dblabsapps.com/blog/iphone-photo-resolution-explained/) |
| iPhone 48 MP ProRAW | 50 to 75 MB | HEICify, dblabsapps |
| Galaxy 12 MP default, JPEG | about 3 to 4 MB | [SamMobile](https://www.sammobile.com/news/how-much-storage-do-photos-and-videos-actually-use/) |
| Galaxy 50 MP, JPEG | about 15 MB vs about 4 MB at 12 MP | [MakeUseOf](https://www.makeuseof.com/samsungs-camera-defaults-wrong-for-people-change-these-pro-level-photos/) |
| Pixel | no reliable source read | not found |

The sources disagree because size depends on scene detail and settings. These are web articles, not manufacturer specifications (unverified). Per one 2026 page, iPhone 15 and later main cameras are 48 MP at 8064 x 6048 but shoot 24 MP binned by default, and most Android phones also bin to 12 MP by default ([TechRadar](https://www.techradar.com/phones/i-tested-the-best-iphone-and-galaxy-cameras-and-more-heres-why-200mp-is-overkill-and-which-setting-id-recommend-instead) excerpt).

### What the web app receives

- On iPhone, a plain file input picks a photo and iOS converts HEIC to JPEG for the page, even without an `accept` filter (reports on [Hacker News](https://news.ycombinator.com/item?id=23261216) and a [blog post](https://shkspr.mobi/blog/2020/12/coping-with-heic-in-the-browser/)) (unverified for current iOS). Browsers do not display HEIC. So the app should expect JPEG and must resize on the phone before storing.
- iOS Safari refuses canvases above 16,777,216 pixels ([pqina](https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/)), which is under half of a 48 MP photo (about 48.8 million pixels). A resize that draws the whole photo into a full-size canvas fails; it has to decode at reduced size or in steps (the technique is not documented in a source read).

### How small can a copy be

- A general guide says a 12 MB photo resized to 1600 px wide at quality 80 becomes about 400 KB ([fileza](https://fileza.io/articles/file-size-reduction-guide)). Another says a web image rarely needs more than 2 MP, and that WebP at quality 75 to 82 is far smaller than JPEG at similar looks ([ImageOptimizer](https://www.imageoptimizer.org/blog/how-to-reduce-image-size-without-losing-quality)). These are not glaze-specific, and no glaze photo was compressed in this run, so **the smallest size that still shows a glaze faithfully is not established**.
- Fidelity is mostly decided before compression. Ceramics guides tell photographers to set white balance from a grey card and to light glossy glaze with controlled, identical lights ([DPReview thread](https://www.dpreview.com/forums/thread/1278913), [Envato Tuts+](https://photography.tutsplus.com/tutorials/how-to-photograph-ceramics-and-3-dimensional-products-with-one-light--cms-22924)). A grey card or colour patch in the frame would let any copy be checked against the same reference.
- iPhones capture in Display P3, about 25% more colours than sRGB, while the web's lowest common denominator is sRGB ([dblabsapps](https://dblabsapps.com/blog/iphone-photo-color-space-explained/)). WebKit says the canvas converts colours when the source and canvas colour spaces differ ([WebKit blog](https://webkit.org/blog/12058/wide-gamut-2d-graphics-using-html-canvas/)). Whether a re-encoded JPEG keeps the P3 profile or is flattened to sRGB on each platform was not found, so a resized copy may look duller or shifted against the original on a wide-gamut screen (unverified).
- Cost of size: at 400 KB, 1,000 photos is about 400 MB; at 150 KB, about 150 MB (arithmetic, mine). Both fit the quotas in section 1; size matters for how long a photo takes to copy over a poor signal, and for any free storage allowance in section 2.

## How this bears on the objectives and later hops

- **"My pots' records are always safe."** The phone's own rules rarely delete an installed app's data, but the survey found no setting that makes phone-only storage safe against the user deleting the app, a lost phone, or (on iPhone) a Safari-tab start. The key result "no lost records" is therefore at risk from the phone itself only in the cases listed at the end of section 1; the larger exposure is a single copy. Any approach in Offline app foundation and Sync and private records should be judged on how soon a second copy exists after a record is written and how a potter can see that it does.
- **"Easy enough with clay on your hands."** Nothing here forces a prompt or permission on the potter: persistence is granted or denied silently on both platforms, and iPhone copies need the app to be open, so a copy cannot happen while the phone sits in a pocket. A last-copied indicator and automatic copy on launch cost the potter no effort.
- **Stack choice (next hop).** A stack must be able to produce a manifest, icons, a service worker and a local IndexedDB (or OPFS) store; must work with no background sync on iPhone; and must resize photos on the phone. No stack was weighed here.
- **Install and first pot.** The iPhone path needs the app's own instructions and a check that the app is running installed, because records made in a tab do not move to the installed app.
- **Finished photo and glaze.** Plan for photo copies of a few hundred KB, a resize that survives 48 MP originals on iPhone, and a fidelity test with real glaze photos (open questions).

## Sources

Read in full: [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) (last modified Jan 2026); [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) (Aug 2023); [Firtman: iOS PWA compatibility](https://firt.dev/notes/pwa-ios/) (a maintained list, last update given as 13 Oct 2026); OpenPWA pages on the [7-day cap](https://openpwa.net/reference/storage/safari-seven-day-cap/), [home-screen storage isolation](https://openpwa.net/reference/storage/home-screen-storage-isolation/) and [uninstalling](https://openpwa.net/reference/installation/uninstall-retention/). Vendor and project pages read in full: [Dexie pricing](https://dexie.org/pricing), [Supabase pricing](https://supabase.com/pricing), [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/), [PowerSync pricing](https://powersync.com/pricing), [RxDB pricing](https://rxdb.info/premium/), the [rocicorp/mono README](https://github.com/rocicorp/mono), and WebKit bugs [198278](https://bugs.webkit.org/show_bug.cgi?id=198278) and the [bug 286561 commit](https://www.mail-archive.com/webkit-changes@lists.webkit.org/msg225613.html). Read as search excerpts only: PouchDB, CouchDB and Automerge documentation, the BaseHub forum post, all other pages cited above, including web.dev, Chrome's blog, MDN's installability page, and photo-size articles. WebKit's tracking-prevention page and the Safari 17.2 and 26.0 posts are cited through OpenPWA's quotations of them, not read directly.

## Open questions

### What was looked for and not found

- **Which phones the friends use.** Project Memory gives the number of friends (2 to 3) but not iPhone versus Android. The iPhone-specific rules (separate installed store, no install prompt, no background sync) cost much more than the Android ones. The maintainer can answer; it decides how much of section 3 must be built first.
- **Whether Android's "clear storage" or "clear browsing data" spares an installed web app's data.** Searched the web for Chrome's behaviour with installed web apps; no page stated it. A test on a real Android phone would settle it.
- **The current Chrome install criteria.** Two third-party guides list a fetch-handling service worker; Chrome's own page announces a simplification and was read only as an excerpt (unverified).
- **Current persistence heuristics.** Neither Chrome nor WebKit publishes the full list; whether an installed app is reliably granted `persist()` on today's iOS and Chrome was not tested.
- **Whether storing photo Blobs in IndexedDB works on current iPhones in a normal tab and an installed app.** WebKit's tracker shows it worked in normal mode from iOS 12.2 and is refused in private browsing; no WebKit source read tests current iOS versions, and the 2026 community reports come from headless builds. A real-device test settles it.
- **Whether deleting a home-screen web app deletes its data on iPhone.** Apple's guide says deleting an app removes its data; no source stated it for web apps (unverified).
- **Whether iOS backup and restore bring back an installed web app's IndexedDB data.** Firtman lists "App Installation Recovery with Backup" since iOS 11.3; what it restores was not found. This decides whether an iPhone replacement loses records.
- **A Pixel photo size, and photo behaviour on current phones.** No source read for Pixel; the iPhone and Galaxy figures are web articles that disagree with each other.
- **The smallest copy size that still shows a glaze faithfully, and whether re-encoding on the phone keeps the colour profile.** No glaze photographs were available to test; a small experiment (same pot, grey card, several sizes and JPEG qualities, viewed on both platforms) would settle it. The maintainer could supply sample photos of their own glazes.
- **Cloud-drive copy (way G).** No Google or Apple developer documentation was read on sign-in, API terms, token lifetime or app review for writing a backup file to a user's drive.
- **Whether Dexie Cloud or PowerSync keep photos under their free limits as the pricing pages imply.** Dexie's page splits storage into record and blob data; PowerSync's page does not mention files. Neither service was tried.
- **Current terms.** Free-tier limits and prices of all vendors were read on one date and change often; Replicache's maintenance-mode status comes from a forum quotation of its site.

### What would be worth asking the maintainer (not asked here)

- Is a manual "export my records" button acceptable as one layer, or must every record reach a second copy without any action by the potter?
- Is it acceptable for the app to nag a potter whose last copy is old?
- How many photos per pot, and how many pots a year, does the maintainer expect? The section 1 arithmetic assumes 3 and 200.

### Claims not verified

Claims that rest on memory or on excerpts are marked "(recalled)" or "(unverified)" where they are made. In particular: iOS HEIC-to-JPEG conversion in file inputs, Web Share of files on iOS, the cause of the headless Blob error, the Chrome criteria, the "delete the icon" outcome, the HTTPS and in-app-browser install rules, and all photo-size figures rest on pages that were not checked against a device.
