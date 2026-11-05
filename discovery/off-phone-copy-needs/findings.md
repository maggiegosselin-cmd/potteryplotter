# Findings: off-phone copy needs

**Kind of hop: both.** A survey of how records on a phone can be lost and what a copy recovers ([loss-events.md](loss-events.md)), and an exploration of ways each potter's copy could stay private without accounts ([design-space.md](design-space.md), [design-space.json](design-space.json)). It recommends nothing.

## What was found

1. **The maintainer's answers narrow the space.** Phones are "A mix of iPhone and Android", so iPhone-specific work is carried. Records living only on each phone for the first weeks is acceptable ("Yes, for my first weeks and my friends' first weeks"), so a copy off the phone is needed after those weeks, not before the first pot. The maintainer may read friends' pots ("Yes, my friends trust me"). A code or passphrase is ruled out ("No, it must work with nothing to remember"), which leaves out passphrases, typed codes, recovery codes and keys only the potter holds.
2. **The loss that is left is the gap, not the phone's own rules.** Installed apps keep their data under the phone's rules, so what remains is the icon removed or data cleared, a lost or replaced phone, pots logged in a Safari tab, an update going wrong, and everything made since the last copy. On iPhone nothing copies in the background, so the gap lasts until the app is next open with signal. A copy recovers all of these except a pot that was never stored.
3. **A copy can make a loss permanent.** A copy that only mirrors the phone can be overwritten by an emptied database; keeping earlier copies is what makes those events recoverable (my reading).
4. **On iPhone the Safari tab and the installed app are separate stores, but cookies cross once.** WebKit's notes say Add to Home Screen copies cookies (not other storage) on iOS 17.2 and later, which is one way for a secret to reach the installed app with nothing typed.
5. **Nothing is copied off the phone today.** The app has no export, import or copy; a saved file would cover every event except the gap and a failed write, and depends on being saved off the phone.
6. **Privacy without accounts, nothing to remember:** 25 options across 8 dimensions in 5 problems, each with what it asks of one maintainer. Without a potter-held secret, recovery of a lost phone rests on the maintainer, a file, the old phone or the phone maker's keychain.

## What was not found

- Whether a "save a copy" button with a reminder is acceptable as one layer: the maintainer is not sure yet; it stays open.
- What an iPhone restore or "clear website data" does to an installed web app, and what removing the icon does on either phone: no vendor statement; needs a device.

## Files

- [loss-events.md](loss-events.md): the events, what a copy recovers, what Full export covers.
- [design-space.md](design-space.md) and [design-space.json](design-space.json): the privacy options.
- [open-questions.md](open-questions.md): what is still to ask, and unverified claims.
