# Clay-hands capture design: design space

**Kind of Hop: an exploration** of how the product could work: its capture surface, its flows and its look. It writes a design space and makes no decision: no option below is recommended, ranked or chosen. It also draws on a small amount of survey material (touch-target guidance, home-screen install, the camera input on phones), cited under [Sources](#sources). It writes no application code.

The structure is: studio moments first, then nine problems a potter has at those moments. Each problem has dimensions (questions that could be answered differently), and each dimension has options with a rough sketch where one helps and its trade-offs. The machine-readable twin of this file is `design-space.json`.

## Contents

- [What the evidence is, and its limit](#what-the-evidence-is-and-its-limit)
- [The studio moments](#the-studio-moments)
- [Facts the options lean on](#facts-the-options-lean-on)
- [Candidate stages used in the sketches](#candidate-stages-used-in-the-sketches)
- [A pot is added the moment it exists](#a-pot-is-added-the-moment-it-exists)
  - [How a new pot is started](#how-a-new-pot-is-started)
  - [How a pot is named and told apart](#how-a-pot-is-named-and-told-apart)
  - [How a batch of pots is entered](#how-a-batch-of-pots-is-entered)
- [A pot is moved to its next stage](#a-pot-is-moved-to-its-next-stage)
  - [How the move is made](#how-the-move-is-made)
  - [How a pot is found to be moved](#how-a-pot-is-found-to-be-moved)
  - [How a wrong move is put right](#how-a-wrong-move-is-put-right)
  - [What a move records by itself](#what-a-move-records-by-itself)
- [A photo is added without a clean hand](#a-photo-is-added-without-a-clean-hand)
  - [How the camera is reached](#how-the-camera-is-reached)
  - [What the photo attaches to](#what-the-photo-attaches-to)
  - [How a photo is taken without tapping](#how-a-photo-is-taken-without-tapping)
- [A failed pot is kept with its photo](#a-failed-pot-is-kept-with-its-photo)
  - [How a failure is marked](#how-a-failure-is-marked)
- [A shelf or kiln hand-in is checked](#a-shelf-or-kiln-hand-in-is-checked)
  - [What the first screen shows](#what-the-first-screen-shows)
  - [How a firing hand-in is logged](#how-a-firing-hand-in-is-logged)
- [A wet finger can drive the screen](#a-wet-finger-can-drive-the-screen)
  - [How big and where the controls are](#how-big-and-where-the-controls-are)
  - [When the entry is made](#when-the-entry-is-made)
- [An entry made with no signal is trusted](#an-entry-made-with-no-signal-is-trusted)
  - [How saving shows when offline](#how-saving-shows-when-offline)
- [A friend logs a first pot unaided](#a-friend-logs-a-first-pot-unaided)
  - [How the link opens](#how-the-link-opens)
  - [How home-screen install is taught](#how-home-screen-install-is-taught)
  - [How the first pot is led](#how-the-first-pot-is-led)
  - [How a friend's stages are set up](#how-a-friends-stages-are-set-up)
  - [How a friend's private space begins](#how-a-friends-private-space-begins)
- [The app feels like a craft object](#the-app-feels-like-a-craft-object)
  - [The look as a whole](#the-look-as-a-whole)
  - [How a stage looks at a glance](#how-a-stage-looks-at-a-glance)
  - [How an action feels](#how-an-action-feels)
- [Sources](#sources)
- [Open questions](#open-questions)

## What the evidence is, and its limit

- **Project Memory (the maintainer's words).** They do not track pots today; they want the app installable on the home screen; they expect two or three close friends to try it ("Friends work much like me"); they are "mostly a hand-builder, but sometimes I use the wheel or slip-cast"; bisque and glaze firing is "done by studio staff"; and of a failed pot, "I also want to see a photo of the failure". The brief's objective is "Easy enough with clay on your hands".
- **The earlier pot-journey findings** (`discovery/pot-journey-stages/findings.md`) give a candidate stage map, failure points and end states. It is a map from published sources, not the author's own words, so the stage names below are candidates. This Hop waits on that map: it assumes only that a pot has an ordered list of stages, that the author's potter can rename, add and reorder them, and that a pot ends as finished, failed, reclaimed or abandoned.
- **The earlier tools survey** (`discovery/existing-potter-tools-survey/findings.md`) holds the only account of how potters behave with devices in a studio, from two Ceramic Arts Daily forum threads seen as search excerpts (anecdotes, not a sample): potters keep devices out of the studio or find their hands too dirty mid-making, and write up afterwards, and late entry is the usual weakness of an app.
- **Limit.** No potter was watched or interviewed in this Hop, and the maintainer has not described their own studio moments, where the phone sits, or whether it is used at the bench at all. Every moment below is therefore the author's possible moments (my reading, from the stage map and Project Memory), not observed ones.

## The studio moments

A potter's phone is wanted in a few recurring situations. The table names each, what the potter needs to do, the state of their hands (my reading), and the problem section that explores it. The four jobs the charter names are add a pot, move it a stage, add a photo and check a shelf; failures and the first-run link are added because Project Memory and the brief name them.

| # | Moment | What they need to do | Hands (my reading) | Problem |
|---|---|---|---|---|
| M1 | At the bench, a pot has just been made (or a lump is wedged) | Add the pot; a photo | Wet or slippy, mid-task, a few seconds | [A pot is added the moment it exists](#a-pot-is-added-the-moment-it-exists) |
| M2 | Trimming, joining, decorating at leather hard | Move the pot a stage; photo; maybe a note | Wet or covered in clay | [A pot is moved to its next stage](#a-pot-is-moved-to-its-next-stage) |
| M3 | Walking the drying shelf | Check which pots are bone dry or still leather hard; move several | Dusty and dry, one hand free | [A shelf or kiln hand-in is checked](#a-shelf-or-kiln-hand-in-is-checked) |
| M4 | Handing pots in for a staff-run bisque or glaze firing | Mark a group as handed in; see what is out of hand | Dry bisque or bone-dry ware held in both arms | [A shelf or kiln hand-in is checked](#a-shelf-or-kiln-hand-in-is-checked) |
| M5 | Collecting pots from the kiln shelf | Mark them back; record the result; photo | Clean or dusty, hands full | [A pot is moved to its next stage](#a-pot-is-moved-to-its-next-stage) |
| M6 | At the glaze bench | Mark a pot glazed; a photo; the glaze (another Hop owns the glaze record) | Wet with glaze | [A photo is added without a clean hand](#a-photo-is-added-without-a-clean-hand) |
| M7 | A crack or fault is found, at any stage | Mark the pot failed; a photo of the failure; where it went wrong | Anywhere, often unexpected | [A failed pot is kept with its photo](#a-failed-pot-is-kept-with-its-photo) |
| M8 | Finished piece in good light | Finished photo; verdict; glaze | Clean | [A photo is added without a clean hand](#a-photo-is-added-without-a-clean-hand) |
| M9 | At home or at the sink, hands clean | Catch up what was missed; name, edit, correct | Clean | [A wet finger can drive the screen](#a-wet-finger-can-drive-the-screen) |
| M10 | A friend receives the link | Open it, install it, log a first pot without help | Clean, probably not in the studio | [A friend logs a first pot unaided](#a-friend-logs-a-first-pot-unaided) |

Two things cut across all ten moments. The studio often has poor signal, so every capture must work on the phone alone ([An entry made with no signal is trusted](#an-entry-made-with-no-signal-is-trusted)). And the app has to look and feel like a craft object, not a business tool ([The app feels like a craft object](#the-app-feels-like-a-craft-object)).

## Facts the options lean on

- **Touch-target sizes.** WCAG 2.2 success criterion 2.5.8 asks for pointer targets of at least 24 by 24 CSS pixels or enough spacing (digitala11y, Hong Kong OGCIO and testparty pages); Apple's guidelines suggest 44 by 44 points and Material Design 48 by 48 dp (testparty page, uxpatterns glossary). These are minimums for clean fingers. No source read gives a size for a wet or clay-covered finger; options below that go larger are choices, not measured.
- **Touchscreens and water or clay.** That a capacitive screen misreads water, slip or a clay-coated finger, and that a gloved or coated finger is less precise, is general knowledge (recalled); no page was read on it.
- **The camera input.** A web page can open the phone's camera through a file input with the `capture` attribute; MDN says the attribute "is not Baseline" because it does not work in some widely used browsers (MDN `capture` page, as shown in search). What it does on a given phone is not verified here.
- **Home-screen install.** The page and manifest have to be installable; on an iPhone the user adds the page from the share menu, and from iOS 16.4 other browsers than Safari can also add it (mobiloud page, excerpt); a native install prompt appears for Chromium-based browsers (two GitHub issues, excerpt, unverified). The first-run options depend on this split.
- **Other web features the options mention** (Screen Wake Lock, speech recognition, vibration, and the volume-button shutter of a phone's own camera app) are recalled, not read in this run, and each can differ between iPhone and Android (recalled).

## Candidate stages used in the sketches

The sketches use the pot-journey candidates so they read like a real pot: **Formed → Leather hard → Bone dry → Handed in (bisque) → Bisqued → Glazed → Handed in (glaze) → Finished**, with end states **Failed**, **Reclaimed** and **Abandoned**. Which of these are real stages, in which order, and under which names is the potter's to set; the sketches change nothing if the list changes. Nearly every stage has exactly one obvious next stage, with forks at the firings (single firing, a third firing); that is what makes a one-touch move possible, and where it breaks.

## A pot is added the moment it exists

**Solved when:** a potter can make a record for a pot that has just been made, with one wet finger, in a few seconds, without having to decide anything.

### How a new pot is started

**Exclusive:** no. **Why it matters:** the entrance is the most repeated touch in the app, and potters who only add pots when it is cheap will keep using it; several entrances could coexist.

What is chosen: what the potter touches first to make a pot, and what the app asks before the pot exists. Options: [Photo first, details later](#photo-first-details-later); [One tap makes a blank pot](#one-tap-makes-a-blank-pot); [Chips for form and method](#chips-for-form-and-method); [Copy the last pot](#copy-the-last-pot).

#### Photo first, details later

The home screen's largest control opens the camera, and the photo taken becomes a new pot at the first stage, with the date, and nothing else asked.

```
 +-------------------+      +-------------------+
 |  my pots          |      |   [ viewfinder ]  |
 |  ...              | tap  |                   |
 |                   | ---> |        ( o )      |  one more tap: pot exists
 |  [  + photo  ]    |      |                   |
 +-------------------+      +-------------------+
```

**Easy:** two touches from the home screen; the photo is the record, which matches how potters tell similar pots apart. **Costs:** a pot with no form or method until filled in later; a pot made of slip (cast) or a lump has nothing to photograph yet. **Suits:** hand-builders who photograph at the end of a session.

#### One tap makes a blank pot

A single large "new pot" control creates a pot at the first stage, dated now, with no photo; the new pot opens so a photo or note can follow.

**Easy:** one touch, no camera permission or lighting issue, works for a lump of clay that is not yet a pot. **Costs:** blank pots pile up unnamed and are hard to tell apart in a list unless photos follow. **Suits:** days of many pots made fast, to be sorted later.

#### Chips for form and method

After the new-pot tap, one screen offers large chips for form (mug, bowl, vase, plate, other) and method (hand-built, wheel, cast); one touch on each, or skip.

```
 new pot
 [ mug ][ bowl ][ vase ]      form
 [ plate ][ other ]
 [ hand ][ wheel ][ cast ]    method
 [        done        ]
```

**Easy:** the form and method are the two facts most later views would sort by, captured as touches, with no typing. **Costs:** three touches rather than one; the chip list has to be the potter's own to avoid a menu that fits no one. **Suits:** the author, who uses three methods and so cannot default one.

#### Copy the last pot

A control on a pot (or on the home screen, for the latest) makes a new pot with the same form, method, clay and intent, at the first stage.

**Easy:** a batch of similar pots is one touch each after the first. **Costs:** copies inherit mistakes; useless for one-offs; needs a recent pot to copy. **Suits:** sets of mugs, tiles and repeated forms.

### How a pot is named and told apart

**Exclusive:** no. **Why it matters:** typing is the hardest thing to do with clay on a finger, yet pots of the same form look alike on a shelf.

What is chosen: how one pot is told from another in lists and on the shelf. Options: [No name, the photo is the name](#no-name-the-photo-is-the-name); [Automatic number and form](#automatic-number-and-form); [A name spoken or typed later](#a-name-spoken-or-typed-later); [A number written on the pot](#a-number-written-on-the-pot).

#### No name, the photo is the name

A pot is shown by its latest photo and its form; no name is asked for or shown unless typed.

**Easy:** nothing to type. **Costs:** pots with no photo yet are anonymous; two similar pots can be confused. **Suits:** potters who recognise pots by look.

#### Automatic number and form

The app names a pot by a running number and its form ("Mug 14"); the potter can rename it.

**Easy:** every pot has a unique, short label from the first touch; the number can be written under the pot. **Costs:** numbers mean nothing to the potter until used; renumbering after deletes or merges needs rules. **Suits:** potters who already mark the foot of a pot or a test tile (recalled from the forum accounts of numbered tiles in the tools survey).

#### A name spoken or typed later

The pot gets its name at a calm moment, by the phone's dictation key or by typing, from a prompt in the catch-up list.

**Easy:** nothing is needed at the bench; a real name when hands are clean. **Costs:** relies on the potter returning to it; dictation quality offline is not verified. **Suits:** potters who name pieces.

#### A number written on the pot

The app shows the pot's number in very large type on its screen, so it can be written on the foot or on a tag with a pencil or underglaze; the number is used to open the pot later.

**Easy:** the pot and the record can be matched with no camera. **Costs:** a physical step in the studio; marks may burn off or be missed by staff at firing. **Suits:** shelves crowded with similar bisque.

### How a batch of pots is entered

**Exclusive:** yes. **Why it matters:** the unit of a record (one pot, a batch, a set) decides how many touches a day of making costs.

What is chosen: what a record stands for when several pots are made together. Options: [One record per pot](#one-record-per-pot); [One record with a count](#one-record-with-a-count); [A set holding single pots](#a-set-holding-single-pots).

#### One record per pot

Each pot has its own record, always; a batch is several quick adds.

**Easy:** the model is simple; each pot has its own photos, stage and failures. **Costs:** a dozen mugs is a dozen entries. **Suits:** potters who make few, distinct pieces.

#### One record with a count

A record can say "x 12" and move together; separating one off is a later step.

**Easy:** one move for twelve tiles. **Costs:** one cracked pot of twelve forces a split; a count complicates every list and photo. **Suits:** repeated tiles and test pieces.

#### A set holding single pots

A set groups several pot records; moving the set moves each, and any single pot can still leave the set.

```
 set: "cups for J"   (3)
   [pot 21] [pot 22] [pot 23]     [ move all ->  Bone dry ]
```

**Easy:** a group move, with each pot keeping its own history. **Costs:** more concepts and screens; a second control on every move. **Suits:** cup-and-saucer pairs, commissions, sets.

## A pot is moved to its next stage

**Solved when:** a potter can move a pot on, or put it right if a finger slipped, with one touch or two and without reading much.

### How the move is made

**Exclusive:** no. **Why it matters:** this is the repeated action of the app after adding; the way it is made decides how many touches a shelf walk costs.

What is chosen: the control that moves a pot to its next stage. Options: [A big next-stage button](#a-big-next-stage-button); [Swipe the card on](#swipe-the-card-on); [A stage rail to tap](#a-stage-rail-to-tap); [Drag along a board](#drag-along-a-board).

#### A big next-stage button

Every pot screen has one very large button that names the next stage ("Leather hard ->"); one touch moves the pot.

```
 +-----------------------+
 | Mug 14     [photo]    |
 | Formed since 3 days   |
 |                       |
 | [  Leather hard  ->  ]|  <- fills the bottom third
 +-----------------------+
```

**Easy:** one touch, the label says what will happen, the target is huge. **Costs:** forks (skip bisque, a third firing) need another place to go; a miss-touch moves the pot, so undo matters. **Suits:** the normal path of most pots.

#### Swipe the card on

In a list, swiping a pot card to the side moves it to the next stage.

**Easy:** quick in a list with many pots. **Costs:** swiping with a wet or coated finger is less reliable than tapping (recalled); invisible unless taught; can be triggered while scrolling. **Suits:** clean-handed catch-up more than the bench.

#### A stage rail to tap

A rail of the stages sits on the pot screen; touching any stage moves the pot there, so a pot can jump forward or back.

```
 ( Formed )-( Leather )-[ Bone dry ]-( Bisque )-( Glazed )-( Done )
```

**Easy:** any stage is one touch, forks and corrections included; the whole journey is visible. **Costs:** stage chips are small side by side on a phone; jumping a stage is easy to do by mistake. **Suits:** potters whose stages skip and reorder.

#### Drag along a board

Pots are cards in columns, one per stage, and a card is dragged to another column.

**Easy:** the whole shelf is one picture. **Costs:** dragging is the least wet-finger-friendly gesture; a phone shows one or two columns at a time. **Suits:** clean-handed shelf planning, a tablet or a bigger screen.

### How a pot is found to be moved

**Exclusive:** no. **Why it matters:** finding the pot costs as many touches as moving it, and similar pots are hard to tell apart.

What is chosen: how the potter gets from the shelf to the right pot. Options: [Recently touched on top](#recently-touched-on-top); [A photo grid by stage](#a-photo-grid-by-stage); [Open the pot from a tag](#open-the-pot-from-a-tag); [Search by typing](#search-by-typing).

#### Recently touched on top

The home screen lists pots with the most recently touched or longest-waiting first, each as a large card with its next-stage button.

**Easy:** the pot just worked on is already there, zero searches. **Costs:** a pot not touched for weeks sinks. **Suits:** the bench, M1 and M2.

#### A photo grid by stage

A grid of photos grouped by stage; touching a photo opens the pot.

```
 Bone dry (4)
 [img][img][img][img]
 Bisqued (6)
 [img][img][img][img][img][img]
```

**Easy:** recognise by sight, as potters do, with no typing. **Costs:** pots with no photo are blank squares; grids with many pots need scrolling. **Suits:** walking a shelf with the phone.

#### Open the pot from a tag

A pot's number, or a printed code on a tag stuck to a shelf or bat, is read by the camera or typed on a large number pad to open it.

**Easy:** exact, even among identical pots. **Costs:** a physical step per pot; camera code reading is not available on every phone browser (recalled); a tag has to survive clay and firing. **Suits:** studios with crowded shelves and many look-alikes.

#### Search by typing

A search field finds pots by name, form, clay or glaze.

**Easy:** familiar, precise with a keyboard. **Costs:** typing with a wet finger is the hardest input; names are inconsistent (the tools survey records search misses caused by free-text names). **Suits:** catch-up at the sink, not the bench.

### How a wrong move is put right

**Exclusive:** no. **Why it matters:** a big target and a slipping wet finger together will produce wrong moves; the cost of putting one right sets how big the targets can be.

What is chosen: the protection against a mis-touch. Options: [Undo bar after each move](#undo-bar-after-each-move); [Hold to move](#hold-to-move); [Confirm every move](#confirm-every-move); [Edit the history later](#edit-the-history-later).

#### Undo bar after each move

After a move, a bar at the bottom says "Moved to Bone dry. Undo" for several seconds; the bar is a large target.

**Easy:** no extra touch for a correct move; a wrong one is one touch to undo. **Costs:** a window that must be noticed; unsafe if the potter leaves. **Suits:** fast one-touch moves.

#### Hold to move

The move button fills as it is held (about half a second) and moves only on completion; a touch that slides off cancels.

**Easy:** accidental brushes do nothing. **Costs:** every move takes longer; a held wet finger can slip off. **Suits:** a big risk of accidental touches (a phone propped against a wall in a splashy place).

#### Confirm every move

Touching the button opens a confirm panel with two big buttons.

**Easy:** nothing moves by accident. **Costs:** twice the touches for every move, which is what this Hop is trying to reduce. **Suits:** moves that are hard to reverse, such as marking a pot failed.

#### Edit the history later

No protection at the moment; every move is a dated line on the pot, editable or deletable at the sink.

**Easy:** nothing in the way. **Costs:** a wrong stage can sit unnoticed in lists. **Suits:** potters who accept late tidying; combines with other options.

### What a move records by itself

**Exclusive:** yes. **Why it matters:** what each move asks decides whether it stays one touch; what it records decides how much of the journey survives.

What is chosen: what the app records, or asks, when a pot moves a stage. Options: [Date and stage only](#date-and-stage-only); [One optional line after the move](#one-optional-line-after-the-move); [A photo nudge on key stages](#a-photo-nudge-on-key-stages); [A branch question at forks](#a-branch-question-at-forks).

#### Date and stage only

The move writes the stage and the date, and nothing is asked.

**Easy:** one touch always. **Costs:** time in stage is known but nothing else; notes need a separate visit. **Suits:** the bench.

#### One optional line after the move

The move completes at once, then a note field with a dictation key appears for a line that can be ignored.

**Easy:** the lesson can be added while it is fresh, without blocking the move. **Costs:** a field that is always there and always skipped; typing is hard when wet. **Suits:** moves after a firing, when results are worth noting.

#### A photo nudge on key stages

On chosen stages (leather hard, bisqued, finished) the move offers a camera button on the next screen, which can be skipped.

**Easy:** photos taken at the moments when progress and results are visible. **Costs:** a nag if the potter does not want it; the potter has to choose the stages. **Suits:** potters who want a visual journey.

#### A branch question at forks

At a fork (after bone dry: bisque, or straight to glaze), the move asks one question with two or three large answers.

**Easy:** the journey is recorded exactly for single-firing and third-firing work. **Costs:** a second touch at forks; the app must know where the forks are. **Suits:** potters with an unusual path, which Project Memory says others have.

## A photo is added without a clean hand

**Solved when:** a potter can take a photo of a pot, a failure or a finished piece with one wet finger, and have it land on the right pot without further sorting.

### How the camera is reached

**Exclusive:** yes. **Why it matters:** the camera route decides speed, offline behaviour and how much of the phone's own camera the potter keeps.

What is chosen: which camera the app uses. Options: [The phone's own camera sheet](#the-phones-own-camera-sheet); [A viewfinder inside the app](#a-viewfinder-inside-the-app); [Photos taken outside, picked after](#photos-taken-outside-picked-after).

#### The phone's own camera sheet

A photo button uses a file input that opens the phone's camera (or its photo picker), and the picture comes back to the app.

**Easy:** the potter's own camera app, with its focus, zoom and light handling; little code. **Costs:** behaviour differs by phone and browser (see the `capture` note above); an extra confirm step on some phones (recalled). **Suits:** a first version that must work on any phone.

#### A viewfinder inside the app

The app shows a live camera view with one huge shutter and keeps the shot with no confirm.

```
 +-------------------+
 |                   |
 |   [ live view ]   |
 |                   |
 |  [ ( SHUTTER ) ]  |  fills the lower half
 +-------------------+
```

**Easy:** the fewest touches, the shutter can be as large as the potter likes. **Costs:** needs camera permission, more code and care on iPhone (recalled); weaker image handling than the phone's camera app. **Suits:** potters who take many shots in a row.

#### Photos taken outside, picked after

The potter takes photos with the phone's camera app, then picks them from the photo library inside the app.

**Easy:** nothing special in the app; the volume-button shutter and the phone's own tools are available. **Costs:** a second step, and photos leave the studio's pot context; a pot's photo has to be matched to a pot later. **Suits:** potters who want to photograph a whole shelf at once.

### What the photo attaches to

**Exclusive:** yes. **Why it matters:** a photo that lands on the wrong pot or the wrong stage is a record that cannot be trusted; extra choosing costs touches.

What is chosen: how the app decides which pot and stage a photo belongs to. Options: [The open pot and its stage](#the-open-pot-and-its-stage); [The pot just moved](#the-pot-just-moved); [An inbox sorted later](#an-inbox-sorted-later).

#### The open pot and its stage

A photo taken from a pot's screen attaches to that pot at its current stage.

**Easy:** no decision. **Costs:** only works when a pot is already open; a photo of a finished piece taken at the previous stage is mislabelled. **Suits:** moving and photographing in one visit.

#### The pot just moved

After a move, the camera button on the next screen attaches the photo to that move.

**Easy:** a photo is tied to the stage it shows (bisque result, finished piece). **Costs:** a photo of a pot not moved has no home. **Suits:** M5 and M8.

#### An inbox sorted later

Every photo lands in an inbox with a time; at the sink the potter drags or taps them onto pots.

**Easy:** zero decisions at the bench, many photos in a row. **Costs:** sorting later may not happen, and a sorted photo can be the wrong pot after an hour; nothing says which photo is the failure or the finished piece until then. **Suits:** a busy session.

### How a photo is taken without tapping

**Exclusive:** no. **Why it matters:** a photo of a pot held in the other hand needs the finger the shutter wants.

What is chosen: alternatives to touching the shutter. Options: [A countdown shutter](#a-countdown-shutter); [A spoken word as shutter](#a-spoken-word-as-shutter); [The volume button as shutter](#the-volume-button-as-shutter); [Tapping only](#tapping-only).

#### A countdown shutter

One touch starts a three- to five-second countdown, then the shot is taken, so the hand can go back to the pot.

**Easy:** works on any phone with in-app camera; hand is free. **Costs:** a wasted shot if the pot is not ready; slower than a direct tap. **Suits:** a phone propped on a shelf.

#### A spoken word as shutter

The phone listens for a word ("now") and takes the photo.

**Easy:** no touch at all. **Costs:** speech recognition needs signal on some phones and is uneven (recalled); noisy studio; an open microphone. **Suits:** potters who find a screen impossible.

#### The volume button as shutter

The potter uses the phone's own camera app, where the volume buttons take photos (recalled), then picks the photo in the app.

**Easy:** a physical button that works with a coated hand. **Costs:** phone and platform differences; the photo has to be picked afterwards. **Suits:** the bench; pairs with photos taken outside.

#### Tapping only

Photos are always taken with a touch on a large shutter.

**Easy:** nothing hidden, always works. **Costs:** the other hand must be free. **Suits:** the simplest first version.

## A failed pot is kept with its photo

**Solved when:** a potter can mark a pot failed in a moment and keep a photo of it, the stage where it broke, and later why.

### How a failure is marked

**Exclusive:** no. **Why it matters:** Project Memory asks to "see a photo of the failure", and failures are found at unplanned moments, often at the kiln.

What is chosen: how a pot is marked failed and how the photo and cause are added. Options: [A failure button on the pot](#a-failure-button-on-the-pot); [Failure photo first](#failure-photo-first); [Cause chips after marking](#cause-chips-after-marking); [Mark now, explain later](#mark-now-explain-later).

#### A failure button on the pot

A pot screen has a "failed" control away from the next-stage button; it opens a panel with a camera button and large stage and cause chips.

**Easy:** deliberate and separate from a normal move, so it is not touched by accident. **Costs:** three or four touches; pots that fail while the potter is elsewhere are marked later. **Suits:** failures found one at a time.

#### Failure photo first

The camera's shutter has a second control, "photograph a failure", which creates or finds the pot, marks it failed at its current stage and keeps the photo.

**Easy:** the photo, which the maintainer asked for, comes first; it can be two touches. **Costs:** the app has to guess which pot (from the open pot or a pick); a second control on a busy camera screen. **Suits:** unloading the kiln.

#### Cause chips after marking

After marking, a row of large chips offers causes drawn from the stage map (drying crack, dunting, crawl, pinholes, glaze ran, broke when handled), one touch or skip.

**Easy:** the cause is captured as one touch while it is fresh. **Costs:** the potter may not know the cause; the stage where a fault was noticed is often later than where it began (pot-journey findings), so one stage field is not enough. **Suits:** potters who learn from failures.

#### Mark now, explain later

A failure is marked and photographed; the catch-up list asks for the cause and what to change at a calm moment.

**Easy:** minimum touches at the kiln. **Costs:** the lesson depends on later effort. **Suits:** a bad day at the kiln.

## A shelf or kiln hand-in is checked

**Solved when:** a potter can see what is where, and what is out of their hands, in one glance, and move a whole group in a few touches.

### What the first screen shows

**Exclusive:** yes. **Why it matters:** the maintainer did not say what they want to see first at a shelf or the kiln (see Open questions), so the home screen is the biggest unanswered design choice here.

What is chosen: the main view the potter opens the app to. Options: [Stage columns](#stage-columns); [Oldest waiting first](#oldest-waiting-first); [Photo wall with stage badges](#photo-wall-with-stage-badges); [Handed in and not back](#handed-in-and-not-back).

#### Stage columns

Pots are grouped by stage, one stage per row or column, with a count.

```
 Formed (2)    [img][img]
 Leather (3)   [img][img][img]
 Bone dry (4)  [img][img][img][img]
 Handed in (6) [img] ...
```

**Easy:** "what is at each stage" is one picture. **Costs:** crowded for many pots; stage groups that never have pots take up space. **Suits:** a weekly shelf walk.

#### Oldest waiting first

One list ordered by days in the current stage, longest first, each with a next-stage button.

**Easy:** the forgotten pot is at the top; the next action is a touch. **Costs:** hides how many pots sit in each stage; old finished pots need leaving the list. **Suits:** drying-shelf checks, where timing matters.

#### Photo wall with stage badges

A wall of recent photos, each with a small stage mark.

**Easy:** beautiful, and works the way potters recognise pots. **Costs:** poor for "what needs doing" and for pots without photos. **Suits:** showing the work as a body; likely the finished-work view later.

#### Handed in and not back

A strip at the top lists what is out of the potter's hands (with staff for bisque or glaze firing), with days waiting, above the other views.

**Easy:** answers "is it back yet" directly, which suits staff-run firings (my reading). **Costs:** a strip that is empty most days; only fits potters who hand in. **Suits:** the author, whose firing is done by studio staff.

### How a firing hand-in is logged

**Exclusive:** yes. **Why it matters:** a hand-in or collection moves many pots together, so the per-pot touch count multiplies.

What is chosen: how a group of pots is moved in and out of a firing. Options: [Select many then move](#select-many-then-move); [A hand-in session](#a-hand-in-session); [Each pot on its own](#each-pot-on-its-own).

#### Select many then move

A long press (or a select mode) ticks pots; one move button moves all ticked pots to the next stage.

**Easy:** any group at any time. **Costs:** selecting with a wet or dusty finger is several touches; long press is less reliable (recalled). **Suits:** moving a handful.

#### A hand-in session

A "hand in for bisque" mode shows every pot at the stage before bisque with a large check beside each; one button ends the session and moves the checked ones.

```
 Handing in for bisque
 [x] Mug 14   [x] Bowl 3   [ ] Vase 2
 [   hand in 2 pots   ]
```

**Easy:** the pots in the right stage are already listed, a single end touch. **Costs:** a special mode to build; forks (single firing) need the same mode for another stage. **Suits:** a routine hand-in day.

#### Each pot on its own

Pots are moved one at a time with the normal next-stage control.

**Easy:** nothing to build. **Costs:** a dozen pots is a dozen touches and a dozen pot finds. **Suits:** a very small studio output.

## A wet finger can drive the screen

**Solved when:** the controls tolerate a coated, wet or clumsy finger, and what cannot be done then can be done later without loss.

### How big and where the controls are

**Exclusive:** yes. **Why it matters:** target size trades speed against how much fits on a screen; no source gives a wet-finger size, so it is a choice to test.

What is chosen: the layout and size of touch targets. Options: [Thumb-zone slab buttons](#thumb-zone-slab-buttons); [Whole-card targets](#whole-card-targets); [A single huge button per screen](#a-single-huge-button-per-screen).

#### Thumb-zone slab buttons

Primary controls are tall bars across the bottom of the screen, well above the 44-point minimum; everything else is smaller and higher.

```
 +-------------------+
 |  (info, photos)   |  top: small, read-only
 |                   |
 |                   |
 | [  next stage  -> ]|  bottom: huge
 | [  photo        ] |
 +-------------------+
```

**Easy:** one-handed, the key actions need no aiming. **Costs:** fewer things per screen, more screens; secondary actions live elsewhere. **Suits:** the bench.

#### Whole-card targets

Every card on a list is one target; touching anywhere acts (opens the pot), with only one action per card.

**Easy:** nothing to aim at. **Costs:** only one action per card; actions such as move need a second screen. **Suits:** finding pots on a shelf walk.

#### A single huge button per screen

Every screen has exactly one primary action filling most of it; others are tiny text.

**Easy:** the least aiming, easiest to learn. **Costs:** more screens and more back and forth; a screen of one button feels sparse. **Suits:** the bench and a friend's first pot.

### When the entry is made

**Exclusive:** no. **Why it matters:** the tools survey's forum accounts say that entering things in arrears is the usual app weakness; whether capture happens at the bench at all is unknown (see Open questions).

What is chosen: where in the working day the potter enters things. Options: [A one-touch mark at the bench](#a-one-touch-mark-at-the-bench); [After washing at the sink](#after-washing-at-the-sink); [A catch-up list for later](#a-catch-up-list-for-later).

#### A one-touch mark at the bench

At the bench the only possible action is a one-touch mark (a new pot, or a photo); details come later.

**Easy:** keeps wet-hand work to one touch. **Costs:** every mark needs finishing later. **Suits:** a day when a lot is made.

#### After washing at the sink

Everything the app can do is meant for clean hands at the sink; the bench has nothing to do.

**Easy:** no need for wet-hand design. **Costs:** forgotten, and late entry is what the forum accounts warn about. **Suits:** potters who already write up afterwards.

#### A catch-up list for later

A list of things to finish (unnamed pots, unsorted photos, failures with no cause) is kept, and nothing blocks the potter from ignoring it.

**Easy:** the bench and the sink are joined, so nothing is lost. **Costs:** a to-do list can feel like a chore, which the brief wants to avoid. **Suits:** combined with the one-touch mark.

## An entry made with no signal is trusted

**Solved when:** a potter never wonders whether an entry or photo was kept, and never waits on the network to continue.

### How saving shows when offline

**Exclusive:** yes. **Why it matters:** the maintainer works with poor signal; an entry that looks lost, or a pause, will make the potter stop using it.

What is chosen: what the potter sees when an entry is saved without a connection. Options: [Silent save with a kept-on-phone mark](#silent-save-with-a-kept-on-phone-mark); [A visible queue count](#a-visible-queue-count); [Nothing shown at all](#nothing-shown-at-all).

#### Silent save with a kept-on-phone mark

Every entry is saved on the phone at once; a small mark on the card says it is kept on the phone.

**Easy:** no waiting, and a visible assurance. **Costs:** a mark that means nothing if records are only ever on the phone. **Suits:** a first version with no server.

#### A visible queue count

A badge counts entries not yet sent anywhere and clears when sent.

**Easy:** exact reassurance that nothing is lost. **Costs:** a number to worry about; only useful if there is a place to send them. **Suits:** a version that keeps records beyond one phone.

#### Nothing shown at all

The app looks the same online and off.

**Easy:** the calmest screen. **Costs:** the potter cannot tell whether an entry was kept. **Suits:** nobody in particular unless trust is built another way.

## A friend logs a first pot unaided

**Solved when:** a friend who receives a link can install the app and log their first pot with nobody explaining anything, and finds the stages already fit how they work.

The flow below is the shape every option in this problem fits; each box is where one dimension below changes what happens. It is a rough wireframe, not a decision.

```
 message with link
        |
        v
 [1 link opens]  ---- How the link opens
        |
        v
 [2 install]     ---- How home-screen install is taught
        |
        v
 [3 first screen]---- How the first pot is led
        |
        v
 [4 stages seen] ---- How a friend's stages are set up
        |
        v
 first pot logged  --- where it is kept: How a friend's private space begins
```

The bar for "no help" in the brief's key result is one friend, alone, with only the link and the screens. The fewest touches from the link to a logged pot, with no install, is about three (open, new pot, photo); install adds the share-menu steps on an iPhone (recalled) and a prompt on Chromium browsers (unverified).

### How the link opens

**Exclusive:** yes. **Why it matters:** the first ten seconds decide whether a friend reaches a pot or closes the tab.

What is chosen: what appears when the friend first opens the link. Options: [Straight into a working app](#straight-into-a-working-app); [A one-screen welcome first](#a-one-screen-welcome-first); [Install first, then open](#install-first-then-open).

#### Straight into a working app

The link opens the app's home screen, usable at once, with no welcome page.

```
 +-------------------+
 | my pots           |
 |                   |
 |  nothing yet      |
 |                   |
 | [  + first pot  ] |
 +-------------------+
```

**Easy:** the first pot is one touch away. **Costs:** a friend who does not install may lose the app in a tab; no place to explain what it is. **Suits:** friends who want to try it first.

#### A one-screen welcome first

The link opens a single screen that says in a sentence what it is and offers two big buttons: "install it" and "try it".

**Easy:** a place for the author's voice and for install teaching. **Costs:** one extra touch before a pot, and every added screen is a place to give up. **Suits:** friends who need a word from the author.

#### Install first, then open

The link shows only install instructions until the app is installed, and the installed app opens.

**Easy:** the friend always ends with a home-screen icon. **Costs:** the biggest hurdle goes first; install steps differ by phone; friends who cannot install are stuck. **Suits:** nobody unless the installed app is needed for offline use from the first pot.

### How home-screen install is taught

**Exclusive:** no. **Why it matters:** the maintainer wants a home-screen install; on an iPhone it is a menu route the friend has to be shown.

What is chosen: how the friend learns to add the app to the home screen. Options: [A picture card for your phone](#a-picture-card-for-your-phone); [Install offered after the first pot](#install-offered-after-the-first-pot); [Instructions in the message with the link](#instructions-in-the-message-with-the-link); [A native install button where there is one](#a-native-install-button-where-there-is-one).

#### A picture card for your phone

A card shows the share-menu or browser-menu steps as a drawing for the phone detected, with a single "done" touch.

```
 Keep it on your home screen
 1. tap  [ share ]   (drawing)
 2. tap  "Add to Home Screen"
 [ not now ]   [ I did it ]
```

**Easy:** step-by-step, in the app. **Costs:** phone and browser detection is imperfect (recalled); text can go out of date as phones change. **Suits:** iPhones, where no install prompt exists (recalled).

#### Install offered after the first pot

The card appears only after a first pot is logged, when the friend has a reason.

**Easy:** the first pot has no hurdle; install is offered at the moment of value. **Costs:** a friend may skip it and lose the app in a tab. **Suits:** friends who need to see a reason first.

#### Instructions in the message with the link

The author sends a one-line install note and a picture with the link.

**Easy:** no work in the app. **Costs:** relies on the author each time, which is exactly the help the key result removes; text is not part of the app. **Suits:** a fallback only.

#### A native install button where there is one

Where the browser offers an install prompt, a button in the app triggers it with a single touch.

**Easy:** one touch, on browsers that support it (unverified). **Costs:** absent on iPhone Safari (recalled); another path to maintain. **Suits:** friends on Android.

### How the first pot is led

**Exclusive:** yes. **Why it matters:** a friend who must ask what to touch has failed the no-help test.

What is chosen: how the app guides the very first pot. Options: [An empty page with one button](#an-empty-page-with-one-button); [A sample pot to play with](#a-sample-pot-to-play-with); [A three-step coach on the first pot](#a-three-step-coach-on-the-first-pot).

#### An empty page with one button

The first screen has one button, "your first pot", and nothing else until a pot exists.

**Easy:** nothing to learn; it matches the single-huge-button layout. **Costs:** no guidance about what a stage is. **Suits:** friends who work much like the author.

#### A sample pot to play with

A sample pot (clearly marked) is already there, and moving it a stage and adding a photo teaches the controls; it can be deleted in one touch.

**Easy:** the friend sees a real record, the stage button and the stages in the list. **Costs:** fake data to remove; a friend may think it is theirs. **Suits:** friends who like to look around first.

#### A three-step coach on the first pot

On the first pot only, three short prompts (photo, move on, add the next) point at the controls.

**Easy:** the real controls are taught on a real pot. **Costs:** coach marks are a business-app pattern that cuts against a calm look. **Suits:** a friend who is not at ease with phones.

### How a friend's stages are set up

**Exclusive:** yes. **Why it matters:** the stage names have to fit the friend ("Friends work much like me", but with their own words), and every question asked before the first pot costs a friend.

What is chosen: how the friend's stage list begins. Options: [The default list, edit later](#the-default-list-edit-later); [Pick a starting kit](#pick-a-starting-kit); [Build the list at the start](#build-the-list-at-the-start).

#### The default list, edit later

Every friend starts with the same default stages; renaming, adding and reordering are in a settings page used after the first pot.

**Easy:** no questions before the first pot. **Costs:** a friend who does not fit sees wrong stages first. **Suits:** friends who work much like the author.

#### Pick a starting kit

One screen offers two or three kits (hand-build and fire at a studio, wheel, single firing) and the friend picks one in a touch.

**Easy:** a fit with one touch. **Costs:** one touch before the first pot; the kits are the author's guess at friends' ways. **Suits:** friends who differ from the author.

#### Build the list at the start

The friend writes their own stages before the first pot.

**Easy:** a fit exactly. **Costs:** the largest barrier of all; typing a list with no pot yet. **Suits:** an experienced potter who wants it.

### How a friend's private space begins

**Exclusive:** yes. **Why it matters:** each friend keeps their own private records; how a space is made decides whether a first pot needs an account. This depends on a sign-in and storage decision no Hop has made.

What is chosen: how a friend's space comes into being. Options: [Space made on the phone by the link](#space-made-on-the-phone-by-the-link); [A sign-in after the first pot](#a-sign-in-after-the-first-pot); [A code the author gives](#a-code-the-author-gives).

#### Space made on the phone by the link

Opening the link makes an empty private space on that phone; no account.

**Easy:** nothing to type, the first pot is one touch. **Costs:** records live on one phone; a lost phone or a new one starts empty unless a way to carry them over exists. **Suits:** a first week of trying.

#### A sign-in after the first pot

The first pot is logged on the phone; the app then offers to keep it safe with a sign-in.

**Easy:** the first pot has no hurdle; the account is requested once there is something to lose. **Costs:** a sign-in method that nothing settles yet; two states to maintain. **Suits:** friends who keep using it.

#### A code the author gives

The link carries or is followed by a code the author gives each friend, which opens that friend's private space.

**Easy:** the author controls who joins, matching a circle of two or three. **Costs:** the author has to send and manage codes, which is the help to avoid; a code must be typed or pasted. **Suits:** a very small circle.

## The app feels like a craft object

**Solved when:** the app looks and moves like something made by a potter for potters, and is no slower for it.

### The look as a whole

**Exclusive:** yes. **Why it matters:** the look is something later variations may differ on, and the brief wants "a craft object, not a business product".

What is chosen: the overall character of the app's surface. Options: [Paper and clay tones](#paper-and-clay-tones); [Photo-led and nearly bare](#photo-led-and-nearly-bare); [Glaze colours as the palette](#glaze-colours-as-the-palette); [Hand-drawn and ink](#hand-drawn-and-ink).

#### Paper and clay tones

Warm off-white paper, slip and clay colours (unglazed terracotta, stoneware grey, bisque pink), low contrast edges, one accent.

```
 +-------------------+   paper ground
 |  Mug 14           |   dark clay text
 |  leather hard     |   slip-coloured band
 |  [ next -> ]      |   terracotta button
 +-------------------+
```

**Easy:** calm and quick to build; the colours already speak of the studio. **Costs:** low contrast is harder in a bright or splashy studio, and the contrast has to stay readable; it may look like a lifestyle app. **Suits:** a gentle everyday tool.

#### Photo-led and nearly bare

Pots' photos are almost the entire screen; text and buttons are small, plain and sit over or beside the image.

**Easy:** the potter's own work is the decoration; nothing to design. **Costs:** pots with no photo look empty; big controls over photos need care to stay legible. **Suits:** the finished-work view and the studio gallery interest.

#### Glaze colours as the palette

The app borrows its colours from the potter's own glazes or from the dominant colours of the pot's photo.

**Easy:** each pot gets its own look; the app changes with the work. **Costs:** colour extraction and contrast control; a screen in a clashing colour; more to build. **Suits:** potters who love colour.

#### Hand-drawn and ink

Line drawings of pots as icons and dividers, hand-lettered headings, ink on paper.

**Easy:** a clear identity that cannot be mistaken for a business tool. **Costs:** needs real drawings made by someone; hand lettering is hard to read at small sizes. **Suits:** a very personal tool, which this is.

### How a stage looks at a glance

**Exclusive:** yes. **Why it matters:** the same mark that makes the app feel crafted can show a pot's stage without reading, which helps wet-handed use.

What is chosen: how a pot's stage is shown on cards and lists. Options: [Clay-state colour bands](#clay-state-colour-bands); [A pot silhouette that fills](#a-pot-silhouette-that-fills); [Plain stage words](#plain-stage-words); [Stamped seals](#stamped-seals).

#### Clay-state colour bands

A colour band follows the state of the clay: dark wet clay, paler leather hard, chalk-white bone dry, pink bisque, glaze colours, finished.

**Easy:** the stage is seen at a distance, with no words. **Costs:** colours need to be learned; people with colour-vision differences need a second cue; custom stages need colours too. **Suits:** shelf walks.

#### A pot silhouette that fills

A small pot outline fills with clay colour as the pot moves on, with the stage name beside it.

```
 ( )  Formed         [..]  Bone dry
 (.)  Leather hard   [##]  Bisqued
```

**Easy:** progress as a shape, the stage as a word. **Costs:** one silhouette has to stand for every form; per-form silhouettes are more drawing. **Suits:** the craft look and a glanceable journey.

#### Plain stage words

The stage is its name in text, with no mark.

**Easy:** nothing to design, any custom stage works. **Costs:** needs reading, and so a pause. **Suits:** a first version.

#### Stamped seals

Each stage has a simple stamp-like mark (like a potter's chop), in one ink colour.

**Easy:** a pot's journey is a row of seals, a record that feels earned. **Costs:** one mark per stage, and per custom stage; marks must be made. **Suits:** a craft feel; fewer stages.

### How an action feels

**Exclusive:** no. **Why it matters:** motion and feedback are the cheapest way to make a quick tool feel made, and the costliest way to make it slow.

What is chosen: the feedback to a touch. Options: [Thumbprint press](#thumbprint-press); [Slow settling motion](#slow-settling-motion); [A small sound or buzz](#a-small-sound-or-buzz); [Plain instant response](#plain-instant-response).

#### Thumbprint press

When a move is made, a thumbprint-like impression settles into the card and the new stage appears; no waiting.

**Easy:** a gesture that echoes pressing clay, and confirms the touch has been felt. **Costs:** an animation to make; has to be fast and skippable. **Suits:** moves and failures.

#### Slow settling motion

Cards ease in, with soft slow movement, as clay settles.

**Easy:** calm. **Costs:** every animation delays the next touch; slow motion works against "in seconds". **Suits:** the finished-work view more than the bench.

#### A small sound or buzz

A soft sound or a buzz confirms a move, so the potter need not look.

**Easy:** confirmation with the eyes on the pot. **Costs:** sound in a studio is easy to miss or to find annoying; buzz is not available on every phone (recalled). **Suits:** moves while the pot is in the hand.

#### Plain instant response

Controls change at once with no ornament.

**Easy:** the quickest. **Costs:** feels like a tool, not an object. **Suits:** a first version.

## Sources

Read in this run, as search results (the pages were not opened in full):

- WCAG 2.2 success criterion 2.5.8, Target Size (Minimum): https://www.digitala11y.com/understanding-sc-2-5-8-target-size-minimum/ and https://www.digitalpolicy.gov.hk/en/our_work/digital_government/digital_inclusion/accessibility/promulgating_resources/handbook/wcag2aa/9_17_target_size_min.html
- Touch-target sizes of Apple and Material Design, as summarised: https://testparty.ai/blog/wcag-target-size-guide and https://uxpatterns.dev/glossary/t/touch-targets
- MDN, the `capture` attribute of the file input: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture
- Progressive web apps on iOS, other browsers adding to the home screen from iOS 16.4: https://www.mobiloud.com/blog/progressive-web-apps-ios/
- Two GitHub issues noting that the install prompt appears only on Chromium browsers and iPhone users add manually: https://github.com/tokim25/movie-app-repo/issues/66 and https://github.com/jsundram/quartet-log/issues/55

From the repository:

- `discovery/pot-journey-stages/findings.md` (candidate stages, failure points, end states, axes along which friends differ).
- `discovery/existing-potter-tools-survey/findings.md` (what potters say about wet hands, late entry and fixed stage lists; what existing apps do).

## Open questions

**What was looked for and not found.**

- Any account of how potters use a phone with wet or clay-covered hands: the only evidence is forum anecdotes quoted in the tools survey (seen as search excerpts), saying hands are often too dirty and potters write up afterwards. No study, no reviews of an app used at the wheel, and no size for a wet-finger touch target were found.
- Whether touchscreens misread clay-coated or wet fingers, and how a swipe or a long press behaves then: general knowledge only (recalled), no page read.
- What the browser camera input, the speech input, the Screen Wake Lock and the vibration feature do on the author's phone: not verified.
- Whether a phone's own volume button takes a photo when the camera is opened from a web page: not verified (recalled for the phone's own camera app).
- Any account of how a first-time user of a home-screen web app fares without help: only the two issue threads and one article, which describe the install route, not user behaviour.

**What would be wanted, from the maintainer.** Project Memory already holds the answer "I don't understand this question" about what they most want to see at the shelves or the kiln, so these are put plainly:

1. Do you use your phone at the bench with wet or clay-covered hands today (for photos, say), or do you wash first? Where does the phone sit, and which hand is free? This decides whether the bench options or the sink options matter more.
2. Which phone do you and your friends have (iPhone or Android)? Install, the camera and the one-touch options differ between them.
3. When you walk into the studio, which question do you want the app to answer first: what is ready to move on, what is back from the kiln, or where a pot is?
4. Do you number or mark your pots now (a number on the foot, a tag, a note on the shelf)? That decides whether a pot number is useful.
5. How will the link reach a friend (a message, in person), and is it acceptable that a friend's records live only on their phone for the first weeks? That bears on the private-space options.
6. Is it fine if a stage is skipped, given the prompts listed here, or must every stage be recorded?

**Claims that were not verified.** Marked in the text as (recalled) where they come from memory and as (unverified) where a page was read but not checked: install behaviour on iPhone and Chromium; every phone feature named (wake lock, speech, vibration, volume-button shutter, camera code reading); how gestures behave with a coated finger; the idea that a tag or number written on a pot survives firing. Sizes in the sketches (the half-second hold, the countdown of three to five seconds) are starting points to test, not measured values. All moments in the studio-moments table are the author's possible moments (my reading), since no account of the maintainer's own working day was available.

**What would narrow the space** without choosing in this document: a short observed session of the maintainer logging three real pots at the bench and at the sink (for moments M1 to M5); one friend trying the install route on their phone; and the maintainer's answers above.
