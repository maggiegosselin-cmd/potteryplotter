# Existing potter tools: survey findings

**Kind of hop: a survey** of things outside the project (pottery-tracking apps, glaze databases and calculators, notebooks, spreadsheets and templates). It writes findings, not a design space, and it makes no decisions. Scope is tools for an individual potter. Shared studio galleries and studio-management products are out of scope for this version; where a tool also has a community feed, that part is noted in one line and not surveyed.

Every page cited was read in this research unless marked otherwise. Store pages and vendor sites are the vendors' own words about themselves; the only evidence of what potters dislike is user reviews and two Ceramic Arts Daily forum threads, which are anecdotes, not a sample.

## Contents

- [Answers to the three charter questions](#answers-to-the-three-charter-questions)
- [How the project's own facts bear on this](#how-the-projects-own-facts-bear-on-this)
- [Tool-by-tool survey](#tool-by-tool-survey)
  - [Pottery-tracking apps that follow pieces](#pottery-tracking-apps-that-follow-pieces)
  - [Installable web apps (closest to this project's shape)](#installable-web-apps-closest-to-this-projects-shape)
  - [Glaze databases and calculators](#glaze-databases-and-calculators)
  - [Notebooks, spreadsheets, notes apps and templates](#notebooks-spreadsheets-notes-apps-and-templates)
- [How each pairs a finished photo with its glaze](#how-each-pairs-a-finished-photo-with-its-glaze)
- [What potters dislike](#what-potters-dislike)
- [Export formats and whether they open without the app](#export-formats-and-whether-they-open-without-the-app)
- [What this means for the hops that build on it](#what-this-means-for-the-hops-that-build-on-it)
- [Sources](#sources)
- [Open questions](#open-questions)

## Answers to the three charter questions

1. **Which tools, and what does each record?** Four families are in use. (a) Dedicated apps that follow a piece through stages: PotteryNotes, Pottery Log (two unrelated apps share the name), ClayLab, Dasti, PotteryDave, Claywell, The Potter's Mud Room, Bisque-It, Ceramispace and others. They share a core of photos, stage or status, clay body, glazes, firing details, dimensions and notes. (b) Glaze databases and calculators (Glazy, Digitalfire Insight and Insight-live), which record *recipes and tests*, not individual pots. (c) Paper notebooks, often with phone photos. (d) General tools bent to the job: OneNote, Apple Notes, Airtable, Google Sheets, Notion and Etsy printable templates. See [Tool-by-tool survey](#tool-by-tool-survey).
2. **How is a finished photo kept with its glaze combination, and what is disliked?** Mostly by putting both on one piece record. A few tools make a single image that carries both (PotteryDave's datasheet card, Glazy's recipe card, ClayLab's finished-piece image). Paper users photograph the page beside the pot. The dislikes that recur are: only one glaze per surface (so layered combinations go into free-text notes), unrecorded layer order, glaze names typed inconsistently so search misses pots, and losing photos or having no way to get records out. See [How each pairs a finished photo with its glaze](#how-each-pairs-a-finished-photo-with-its-glaze) and [What potters dislike](#what-potters-dislike).
3. **Which export formats open without the app?** Documented ones: PDF (PotteryNotes), JSON and CSV (Claywell), CSV (Potter's Mud Room sales and contacts; Glazy recipes), YAML (Glazy), XML recipe files (Insight), and images (ClayLab finished pieces, Glazy recipe card, Ceramispace recipes). Many apps say "export/backup" without naming the format (ClayLab Pro, PotteryDave, Pottery Log, Bisque-It), so whether those open without the app is not established. See [Export formats and whether they open without the app](#export-formats-and-whether-they-open-without-the-app).

## How the project's own facts bear on this

From the maintainer (Project Memory): they do not track pots today, so there is no old data to import; they want it installable on the home screen; they expect two or three friends to try it. The vision's goal is to follow each pot from lump of clay to finished piece and to let studio potters see a finished photo and the glaze behind it. The assumptions list says a pot's record holds a finished photo and the glaze or combination together, and that failed pots are kept with an end state. The survey is read against those, and against the two objectives: "My pots' records are always safe" (which makes export and photo-loss stories the most relevant evidence) and "It earns its place in my studio" (which makes the in-studio habits below relevant).

## Tool-by-tool survey

### Pottery-tracking apps that follow pieces

| Tool | What it records, and how it is organised | Platform and cost (as listed) | Source |
|---|---|---|---|
| **PotteryNotes** (Pacific Bipeds LLC) | One note per piece; photos with captions, dimensions, weight, clay body, firing information, surface decoration, glazes. The layout of fields can be added to, deleted, rearranged and renamed, and saved as the default. Value lists (such as glaze names) can be edited. A share extension adds photos from the Photos app. Records show in one searchable list. | iPhone and iPad; free; 3.5 stars from 97 ratings when read; developer reports collecting no data. | [App Store](https://apps.apple.com/us/app/potterynotes/id537451083) |
| **Pottery Log** (Jess Kenney, open source) | Per piece, photos and notes for each stage: throwing, trimming, bisquing, glazing. Searching by glaze name lists the pots it was used on. Stages are fixed. | iPhone and Android; free; 2.9 stars from 22 ratings when read. | [App Store](https://apps.apple.com/us/app/pottery-log/id1457629627) |
| **Pottery Log** (a different, newer app of the same name) | Project timelines with photos and notes; glaze recipe builder and test tracking; collections, tags, search; sharing and a community feed (not surveyed). | iOS and Android | [Google Play](https://play.google.com/store/apps/details?id=com.potterylog.potterylog&hl=en_US) |
| **ClayLab** (Well Designed Things LLC) | Pieces with stage (including an Idea stage), status (sold, gifted, traded, available, archived), location, forming method, clay body, dimensions, weight, photos, notes. Decorations are recorded as layers (glaze, underglaze, slip, oxide, stain), with surface area. Pro adds unlimited layers, coats, application method, dipping time, annotations, custom stages and bulk edits. Separate firing log (cone, type, notes). Search and filter by glaze, underglaze, clay, form, stage, slip. | iPhone; free with Pro at $4.99 a month or $49.99 a year; 4.6 stars from 369 ratings when read. | [App Store](https://apps.apple.com/us/app/claylab/id1455800155) |
| **Dasti** | Pieces (form method, clay body, weight, stage, photos, notes), firings (kiln, atmosphere, cone, soak, per-piece outcomes), clay bodies, glazes, and glaze applications (method, coats, layer order, notes). 360-degree spin video of a finished piece. Has an opt-in community feed (not surveyed). | Android listing read; listed as free with no subscriptions. | [Google Play](https://play.google.com/store/apps/details?id=io.dasti.app&hl=en_US) |
| **Bisque / Bisque-It** | Pieces through stages (wet to fired), glaze library with recipe and chemistry, firing log with cone and hold time, filters by status, glaze type and location. Two different apps appear under similar names. | iOS | [Bisque](https://apps.apple.com/us/app/pottery-glaze-log-bisque/id6759573706?uo=2), [Bisque-It](https://apps.apple.com/gb/app/bisque-it-pottery-log/id6758925671) |
| **Ceramispace** | Clay and glaze inventory, firing log with widgets, glaze recipes. | iPhone, iPad, Mac | [App Store](https://apps.apple.com/us/app/ceramispace-ceramics-studio/id1526050930) |
| **The Potter's Mud Room** | Pieces with clay body, glazes, technique, up to three photos per piece, notes; glaze library with result photos; firing logs; sales and contacts; a log of failed pieces. | Web; free to start | [Site](https://thepottersmudroom.com/) |
| **Others seen, not read in depth** | Pottery Tracker (stages with timestamps and photos, glaze and clay tags), ClayNote (annotate surface treatments on photos), Glaze Lab (glazes and test tiles), Poterie Studio (photo tracking of test tiles), OnceClay (notebooks with iCloud backup on a paid tier). | | [Pottery Tracker](https://apps.apple.com/ml/app/pottery-tracker/id6758213839), [ClayNote](https://apps.apple.com/py/app/claynote/id6745529835?l=en-GB), [Glaze Lab](https://apps.apple.com/us/app/glaze-lab-pottery-kiln/id6767673848), [Poterie Studio](https://www.poteriestudio.com/en/), [OnceClay](https://apps.apple.com/app/clayday/id6758364416) |

Patterns across the apps:

- **The piece is the unit.** All of them hang everything off a piece record; stages run roughly formed, trimmed, dried, bisque, glazed, fired, finished. Stage lists are fixed in most; ClayLab lets only Pro users add, rename, reorder and delete stages, and PotteryNotes lets users rename fields rather than stages.
- **Glazes come as a shelf plus a per-piece pick.** The user keeps a list of their glazes (some preloaded with commercial names) and picks from it per piece. One ClayLab reviewer asked to be able to delete the preloaded names, which suggests unwanted preset lists can get in the way.
- **End states.** ClayLab has status values and an archive that its developer describes as a way to keep unsuccessful pieces without deleting the record; the Mud Room has a log of pieces lost. PotteryNotes users asked for an archive so finished pieces leave the in-progress list.
- **Hand-building is under-served by throwing-shaped stage lists.** A 2019 Pottery Log reviewer says it suits potters who throw and asks for a hand-built option; ClayLab renamed "Thrown" to "Formed" in 2023.

### Installable web apps (closest to this project's shape)

- **PotteryDave** is a web app that installs to the home screen. Free plan: unlimited pieces, each stage dated with a cone for firings, predicted and measured shrinkage, one photo per piece within 500 MB, a shelf of clays, underglazes and glazes with every coat recorded per pot, and an Instagram datasheet card. Pieces are private until shared. It also offers a public gallery, comments and selling (not surveyed). It needs an account. [Site](https://potterydave.com/)
- **Claywell** describes itself as offline-first with local photo storage, a photo-first gallery found by stage, location, clay, glaze or collection, and JSON and CSV export. Only its landing page was read; no hands-on or reviewer evidence. [Site](https://claywell.app/)

### Glaze databases and calculators

- **Glazy** is a free online recipe database and community. A recipe is materials in proportions plus structured metadata (picked from fixed categories, not free tags), photos, chemistry analysis and similarity search. It records recipes, not pots. Its own help says recipes export as a Recipe Card image that includes the recipe photograph, and as text files for Insight and GlazeChem; its changelog lists CSV export (2019) and YAML export (2023, expanded 2025). A community wishlist asks for PDF download of a recipe because the card is a JPEG. [Recipes guide](https://help.glazy.org/guide/recipes), [changelog](https://help.glazy.org/about/changelog), [wishlist](https://wiki.glazy.org/t/glazy-v2-wishlist/189.html)
- **Digitalfire Insight (desktop) and Insight-live** are glaze-chemistry tools. Insight-live is a cloud-hosted lab notebook for ceramics, keeping recipes, materials, firing schedules, projects, testing records and pictures under personal or group accounts. Pictures attach to recipes or test records, either uploaded or linked from an outside photo site. Desktop Insight keeps its recipes as XML files as an automatic backup, so its database can be rebuilt from them. Insight-live's import page lists CSV and XML sources. [Insight-live glossary](https://digitalfire.com/glossary/digitalfire+insight-live), [external image video notes](https://digitalfire.com/video/110), [desktop help](https://insight-live.com/insight/help/Desktop+Insight-344.html), [import and export help](https://insight-live.com/insight/help/Import+and+Export-332.html)
- **Pottery Tech's Glaze Log Book** is a small web tool: recipes with percentages, composition graphs, save, load, print and a Backup button that the page tells users to store in a cloud folder. File format not stated. [Page](https://potterytech.net/glaze-log-book/)

Nothing read in the databases ties a recipe to a photographed finished *pot*, or records a layered combination of two recipes as one thing. (Searched: Glazy help pages; no mention found. Not exhaustive.)

### Notebooks, spreadsheets, notes apps and templates

The Ceramic Arts Daily threads show how working potters actually keep records ([2021 thread on tracking pieces](https://community.ceramicartsdaily.org/topic/23910-best-app-for-tracking-piecesnotes/), [2016 thread on glaze testing notes](https://community.ceramicartsdaily.org/topic/13757-glaze-testing-charts-note-taking-s/)):

- **Paper notebook beside phone photos.** One potter draws the pot and notes inside glaze, outside glaze, any slip or wash, layer order, application method and thickness while glazing, and separately photographs each stage. Another photographs the fired tile and the notebook page so the two can be viewed side by side, and notes that a digital photo of a tile cannot break.
- **Marked test tiles.** A numbered mark on the back of each tile corresponds to an index-card or journal entry.
- **Wet-hands and dust.** Several potters keep devices out of the studio or say their hands are too dirty to use one mid-making, and write up afterwards; one adds that entering information in arrears is the usual app weakness.
- **General tools.** OneNote, Apple Notes with photos, and Airtable (one potter set up their own fields per piece and says entry is often late but useful) are used for per-piece records.
- **Printable and spreadsheet templates** are sold widely (Etsy listings include glaze test tile logs, glaze combination organisers, Google Sheets and Notion templates). One 2016 sheet design reserved a box for a photo of the finished piece. [Etsy glaze test listings](https://www.etsy.com/market/glaze_test)
- **Advice articles** stress a bound notebook, serial numbering and recording everything. [Pottery Making Illustrated](https://ceramicartsnetwork.org/pottery-making-illustrated/pottery-making-illustrated-article/Recording-Glaze-Development)

## How each pairs a finished photo with its glaze

Five patterns appear.

1. **Both on the piece record.** PotteryNotes, Pottery Log, ClayLab, Dasti, PotteryDave, the Mud Room and Claywell put photos and glaze fields on the same record, so the pairing is "this pot's photos" plus "this pot's glazes". It holds together as long as the record does. Photos and fields are separate lists inside the record, so nothing says which photo shows which glaze combination when a piece has several photos or several glazes. PotteryDave allows one photo per piece on the free plan, which makes the pairing unambiguous but thin.
2. **Search from glaze to pots.** Pottery Log's reviewer calls search by glaze their favourite feature, and ClayLab reviewers describe finding work by glaze and clay body. This is how the "which glaze was that?" question gets answered in reverse, from a glaze to its pictures.
3. **Photo on the glaze, not the pot.** Glazy and Insight-live attach pictures to recipes or test records; the Mud Room's glaze library holds result photos. Good for test tiles and recipes; it does not say which finished pot used it.
4. **One composite image.** PotteryDave makes a datasheet card (clay, glazes, cone, sizes) from a piece for posting. ClayLab (from version 2.5) saves a finished piece as an image. Glazy's Recipe Card puts the photo and recipe in one image, and Ceramispace exports glaze recipes to the photo library. These are the only pairings read that survive outside the app without extra work.
5. **Paper plus photographs of paper.** The photo of the notebook page beside the tile photo, a photo box on a printed sheet, and numbers written on the back of tiles.

Not found: any tool in the pages read that records a **combination as a named object** (for example "Celadon over Shino") with its own photo, reusable across pots. ClayLab and Dasti record ordered layers on each piece instead. ClayNote's page says surface treatments can be annotated directly on photos; how that is stored and exported was not read.

## What potters dislike

Each item is one source's account, with the number of independent sources.

- **Layered glazes squeezed into one slot (several sources).** A 2022 ClayLab reviewer abandoned the app because only one glaze could be listed inside or outside, so they created a fake "multiple – see notes" entry, which defeated the point of a glaze list; they also wanted order of application. The developer added layers shortly after, and layer order and coats are now features (the latter Pro only). Another ClayLab reviewer in 2022 wanted several glazes per surface too; a forum potter notes combinations and order are exactly what gets forgotten.
- **Losing data (several sources).** A recent PotteryNotes reviewer lost all photos after an update, with text notes surviving; the developer's site tells users that restoring a recent device backup brings photos back and that backup is the user's own responsibility. A 2021 forum poster says they had read reviews of PotteryNotes archives being erased by an update and found its cloud backup unreliable and hard to do. A forum potter in the same thread worries that proprietary apps have a backup problem and may go obsolete with no way to publish.
- **No way to get records out (one detailed source, echoed in the forum).** The same 2022 ClayLab reviewer said the missing export was the bigger flaw: if the app were discontinued or the phone changed they would lose what the journal is for, and asked for PDF or CSV. The developer replied that export, sync and backup were being looked at. Pro later added backup export and import. A 2024 reviewer still hoped for CSV, and the developer said it was on the roadmap. Whether it shipped was not checked.
- **Free-text names break search (one source).** A Pottery Log reviewer found glaze search case-sensitive, so "Celadon" and "celadon" give different results, especially for two-word names. The same reviewer wished friends at the studio could share glaze combination learnings, which is outside this version's scope.
- **Search or filter that forgets or cannot reach glaze (several sources).** A 2019 PotteryNotes reviewer could not search glaze or surface treatments; a 2023 Pottery Log reviewer lost the search when going back from a result.
- **Stage lists that do not fit the potter's way (several sources).** No stage between bisqued and glazed (Pottery Log, 2023); no hand-building option (Pottery Log, 2019); PotteryNotes users wanting sections by stage; ClayLab users wanting to drop size and weight and add price or firing schedule (a 2022 reviewer; the app later added custom stages and surface areas, partly on Pro).
- **In-progress list clutter (one source).** PotteryNotes users could not archive completed pieces to another list.
- **Cross-device sharing (one source).** A 2018 PotteryNotes reviewer had to transfer each page separately from phone to tablet.
- **Photo handling (one source).** A Pottery Log reviewer could zoom but not choose which area a photo displayed.
- **Studio conditions (forum, several posters).** Dust, wet hands and clay on electronics push potters to paper and to writing up later. Late entry is the cost.
- **Paper's weakness (forum).** A potter likes paper but says it cannot hold the photo that shows the outcome, which is what they need to reproduce or tweak a result.

## Export formats and whether they open without the app

"Opens without the app" means a person can read it with ordinary software (a PDF viewer, a spreadsheet, a text editor, a photo viewer).

| Tool | Export or backup offered (as documented) | Opens without the app? |
|---|---|---|
| PotteryNotes | Save records as PDF (added 2022, improved 2024); print via AirPrint; share records between devices by email, text and AirDrop; back up by device backup or by copying the app's files with iTunes File Sharing. | PDF: yes. Shared-record and file-sharing formats are not described on the pages read. |
| Pottery Log (Kenney) | Export and import of pieces from a file; a 2019 reviewer found only the pictures could be taken to a laptop, not the metadata. | Not established. |
| ClayLab | Pro: backup export and import of all data; finished pieces saved as images; CSV was only a roadmap item in 2024. | Images: yes. Backup format not described. |
| PotteryDave | "Download everything" from the Account page, or delete the account. | Format not described. |
| Claywell | JSON backup and CSV records; offline, local storage. | Yes in principle (JSON, CSV); landing page only. |
| The Potter's Mud Room | CSV for sales and contacts; a printable 38-page PDF journal that mirrors the app. | CSV and PDF: yes; whether piece and glaze records export was not stated. |
| Bisque-It | Export and import of project data and pictures; export of firing records. | Not described. |
| Ceramispace | Glaze recipes exported to the photo library. | Images: yes. |
| Dasti | No export mentioned in the store listing; account deletion on request. | Not found. |
| Glazy | Recipe Card image; Insight and GlazeChem text files; CSV; YAML. | Yes (image, CSV, YAML are readable anywhere). |
| Insight desktop / Insight-live | Desktop keeps XML recipe files; Insight-live imports CSV and XML. | XML is plain text; Insight-live's own export was not read. |
| Pottery Tech Glaze Log | Backup, save and load, print. | Format not stated. |
| Paper, photos of pages | Nothing to export. | Pages photographed are readable without any app. |

What the table shows: the formats that are certain to open anywhere (PDF, CSV, JSON, YAML, plain images) each appear in at least one tool, but no tool read documents a single bundle that holds the photos, the structured glaze data and a human-readable view together. Most "backups" are app-to-app restore files.

## What this means for the hops that build on it

These are findings relevant to each hop, not choices.

- **Pot records and stages.** Ideas that recur and have user demand: per-piece stages with dates; an end state (failed, gifted, sold) and an archive instead of delete; potter-editable stages (ClayLab gates this behind Pro; PotteryNotes allows field renaming); a stage between bisque and glaze; forming methods that include hand-building; separate firing records. Ideas that drew complaints: fixed stage lists, preloaded glaze names that cannot be removed, size and weight fields that cannot be hidden, and a single list mixing in-progress and finished pieces.
- **Finished photo and glaze.** The pairing that works is one record that holds the finished photo with an *ordered list* of glazes, searchable from glaze to pots. Evidence of trouble: one-glaze-per-surface, unrecorded order, free-text names that split search, and no record of which photo shows which combination when a piece has several. A composite image that carries the photo and glaze text is the only pairing that survives outside the app (PotteryDave, ClayLab, Glazy).
- **Full export.** The strongest unmet need in the reviews is getting everything out. Photo loss and app abandonment are the fears named. Formats documented as open: PDF, CSV, JSON, YAML, images. None read bundles photos with data. Claywell (JSON and CSV, offline-first) is the nearest to this project's shape.

## Sources

Read in this research: [PotteryDave](https://potterydave.com/), [Claywell](https://claywell.app/), [The Potter's Mud Room](https://thepottersmudroom.com/), [PotteryNotes on the App Store](https://apps.apple.com/us/app/potterynotes/id537451083), [PotteryNotes backup page](https://www.potterynotes.com/using-itunes-file-sharing), [PotteryNotes help](https://www.potterynotes.com/), [Pottery Log (Kenney) on the App Store](https://apps.apple.com/us/app/pottery-log/id1457629627), [Pottery Log (Kenney) Android review aggregator](https://appgrooves.com/android/com.jesskenney.pottery_log/pottery-log/jess-kenney), [Pottery Log on Google Play](https://play.google.com/store/apps/details?id=com.potterylog.potterylog&hl=en_US), [ClayLab on the App Store](https://apps.apple.com/us/app/claylab/id1455800155), [Dasti on Google Play](https://play.google.com/store/apps/details?id=io.dasti.app&hl=en_US), [Bisque-It](https://apps.apple.com/gb/app/bisque-it-pottery-log/id6758925671), [Ceramispace](https://apps.apple.com/us/app/ceramispace-ceramics-studio/id1526050930), [Glazy recipes guide](https://help.glazy.org/guide/recipes), [Glazy changelog](https://help.glazy.org/about/changelog), [Glazy wishlist](https://wiki.glazy.org/t/glazy-v2-wishlist/189.html), [Insight-live glossary](https://digitalfire.com/glossary/digitalfire+insight-live), [Insight desktop help](https://insight-live.com/insight/help/Desktop+Insight-344.html), [Insight-live import and export](https://insight-live.com/insight/help/Import+and+Export-332.html), [Pottery Tech](https://potterytech.net/glaze-log-book/), [CAD forum 2021](https://community.ceramicartsdaily.org/topic/23910-best-app-for-tracking-piecesnotes/), [CAD forum 2016](https://community.ceramicartsdaily.org/topic/13757-glaze-testing-charts-note-taking-s/), [Etsy glaze test listings](https://www.etsy.com/market/glaze_test).

Seen only as search-result excerpts (not opened): Pottery Tracker, Bisque, Glaze Lab, ClayNote, Poterie Studio, OnceClay.

## Open questions

**Looked for and not found.**
- A tool that records a glaze *combination* as its own reusable object with a photo. Looked in the app store listings above and in Glazy and Insight help pages.
- Any tool's actual export file: its structure, whether photos are inside it, and whether it opens without the app. Listings say "export" or "backup" only; no sample file was read for any app.
- Export details for Dasti, PotteryDave, Pottery Log (Kenney) and Bisque-It beyond one line each.
- Reviews or usage evidence for Claywell, PotteryDave and the Mud Room: only their own pages were read, so how well they work in a studio is unknown.
- Whether any tool works fully offline in a browser with poor signal. Claywell claims it; nothing independent was read.
- Reddit, Facebook group and Instagram discussions, where many potters talk about records. Not read.

**Claims that could not be checked.**
- ClayLab's CSV export: the developer said in 2024 it was on the roadmap; whether it shipped is unverified.
- Star ratings and counts are those shown on the pages when read and change over time (unverified).
- PotteryNotes's reported photo loss after an update is one reviewer's account plus the developer's own notice on its site; the cause is unverified.
- Airtable can export tables as CSV (recalled); not checked in this research.
- Pricing and free-tier limits for PotteryDave, the Mud Room and Bisque come from their own pages and may have changed (unverified).

**What would settle the rest, and who.**
- Maintainer, with their friends: which of the ordinary habits above they have (paper first, photos of pages, spreadsheets), and whether they glaze with layers and combinations or single glazes. This decides how much weight the layered-glaze complaints carry here.
- Maintainer: whether "everything out" must include photos in the same file as the data, and whether the record must stay readable by a non-technical person (a PDF, a folder of pictures) or only by software. The survey shows both kinds of format exist.
- Someone installing two or three of the apps for a few weeks on real pots would give first-hand evidence on entry speed and export files; this survey has none.
