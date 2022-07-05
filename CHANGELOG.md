# Changelog

## 2.14.0 - 5 Jul 2022

### Added

Add configuration open for turn removal feature (enabled by default) [#14](https://github.com/arcanistzed/scs/issues/14)

### Fixed

CSS padding issue that caused arrow buttons to not be visible

## 2.13.0 - 4 Jul 2022

Removed the default keys for the keybinding for better compatibility (users can define their own)

### Added

* As part of the "display" feature, a flag is now set on actors with their last attack roll. This could be used in a custom [Combat Tracker Groups](https://github.com/arcanistzed/ctg) grouping mode, for example.
* Refactor CSS completely
  * New scroll snapping
* Configuration form to enable complete manual configuration of all colors

### Fixed

* Refactors to color generation and display
* Make phase and round switching more predictable
* Don't start combat if the Combat Tracker is not hidden (thanks to @Lethay)

## 2.12.0 - 13 Dec 2021

### Added

* Localized everything to make the "display" and "Action Locking" features work in other languages

### Fixed

* Removed separate round value since it was causing bugs with de-sync and making it so that you aren't able to advance the round at all. This separation was created because I originally wanted the SCS to work without any core combats active, but that no longer makes sense because they are now synchronized anyway

## 2.11.2 - 11 Dec 2021

### Fixed

* Error with display enabled when there is no flavor text in rolls
* Remove conflicting Keybindings

## 2.11.1 - 7 Dec 2021

### Fixed

* Use MidiQoL's hook
* Only attempt to add the Combat Tracker display if a combatant exists

## 2.11.0 - 7 Dec 2021

* IntroJS is now a soft dependency which you only need to install for the tutorial
* Inverted default Combat Tracker visibility setting

### Added

* Removed the concept of turns from the Combat Tracker:
  * Previous and Next turn buttons are hidden
  * No combatant is highlighted as the current combatant as there is no one taking their turn (requires v9d2 or later)
* Keybindings for switching phase and round as well as toggling app visibility (requires v9d2 or later)
* Major rework of the HUD feature which has been renamed to the more generic "Attack Display" and now includes an option to display the last roll in the Combat Tracker

### Fixed

* Always move above SmallTime no matter what it's height happens to be
* Attack Display works with MidiQoL
* Attack Display HUD is more consistently centered

## 2.10.0 - 19 Nov 2021

### Added

* Hide App when there is no Combat encounter
* End combat when all of the combatants have been removed

### Fixed

* Create a new combat if one doesn't exist if the round isn't zero
* Only allow GM users to change the phase or round with the API
* Bug fixes and improvements
* Code Quality improvements
* Fixed default settings in v9d2 which were messed up now that arrays can't be localized

## 2.9.0 - 24 Sept 2021

* *Action Locking:* the notification for an unrecognized phase is now GM-only
* *Combat Management:*
  * Added a prompt to end the current combat when the round becomes zero
  * Create a new Combat whenever the round becomes greater than zero
* *Color Generation:* player clients no longer reload after a delay
* Now always reloads the page after the phase names are changed in order to keep clients in sync
* Use v9 CSS variables for styling

## 2.8.0 - 16 Sept 2021 - Module Compatibility

* The HUD is now compatible with the [Better Rolls 5e](https://foundryvtt.com/packages/betterrolls5e) module (Fixes #5). See the README for details.
* Improved compatibility with [SmallTime](https://foundryvtt.com/packages/smalltime), to allow them to both position correctly together
* Some code cleanup and now there's no more jQuery!

## 2.7.2 - 6 Sept 2021

Set z-index above control toolbar

## 2.7.1 - 4 Sept 2021 - Window Closing

* Fix window closing by removing app from `ui.windows`
* Fix typos

## 2.7.0 - 30 Aug 2021

* Add `scsPhaseChanged` and `scsRoundChanged` hooks
* Use PIXI for the HUD to make it always show up. In addition, the HUD was redesigned. It now also only shows up during the Attack phase.

## 2.6.0 - 29 Aug 2021 - Attack Roll HUD

In order to ease determining the attack order (for example, in the default attack phase), the module shows you the last attack roll in the token's HUD. This currently only works in D&D 5e and PF 2e.

## 2.5.0 - 26 Aug 2021 - More API and Fixes

* Exposed round (`.changeRound(delta)`) and phase (`.changePhase(delta)`) switching in the public API
* Fix app border appearing incorrectly
* Updated [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) shim with dialog removed
* Migrated API to `game.modules.get("scs")?.api`
* Added optional parameter to `hideTracker` (which has been renamed to `defaultTracker`), allowing you to instead show the tracker if hidden
* Added optional parameter to `stopTutorial()` allowing you to also close the tutorial at the same time
* Fix a bug where the phase would be stuck in an invalid state after the names are changed
* Updated localisations

## 2.4.6 - 15 Aug 2021

* Fix action locking for Magic phase
* Removed [Argon's](https://foundryvtt.com/packages/enhancedcombathud) "End Turn" button

## 2.3.0 - 13 Aug 2021 - Cycles & Smooth scrolling

* Implemented cycles (which are one complete run through all phases) in order to allow for the round to end after three as per [SCSv2](https://redd.it/p11h35)
* Added animated smooth scrolling when there are too many phases to fit in the box

## 2.2.1 - 13 Aug 2021

Fix typo and fix not working on Firefox

## 2.2.0 - 12 Aug 2021 - Stacks

* Phases now stack when there is more than three (instead of making them really small)
* Renamed Spells to Magic and added other new terminology from [SCSv2](https://redd.it/p11h35)

## 2.1.1 - 11 Aug 2021 - Update for players

Fixed app not updating for players

## 2.1.0 - 7 Aug 2021

* Whetstone compatibility
* Allow switching to any phase by clicking on it
* Alert if using a game system that doesn't have Action Locking yet
* Don't allow rounds below zero

## 2.0.0 - 3 Aug 2021 - API & Action Locking

* Works with Core rounds: switching SCS rounds will update the default combat tracker
* Fix app not appearing in the right position when the canvas is disabled or no scene is activated
* Added Action Locking which restricts actions based on the current phase. Only works for known phases (Move, Attacks, Spells). Feel free to make suggestions on [my discord server](https://discord.gg/AAkZWWqVav) for more phases that could have Action Locking.
* Switched to `esmodules` and opened up some functions as an API

## 1.3.0 - 31 Jul 2021 - Color Generation

* Moved Foundry-style theme to the IntroJS library itself
* Fixed window briefly showing when clicking "🌈 Generate" in settings
* Color generation is much faster and more reliable (thanks to @LukeAbby)
* Added error handling for when no color is findable

## 1.2.2 - 17 Jul 2021 - Updated translations

## 1.2.1 - 17 Jul 2021 - Fix build

## 1.2.0 - 17 Jul 2021 - Alternate Appearance

Added an option to invert the appearance of the active phase, so that it's lighter than the others rather than darker.

## 1.0.2 - 14 Jul 2021 - Updated localizations

## 1.0.1 - 14 Jul 2021 - Bug Fixes

* Fix new color generator
* Fix player sync

## 1.0.0 - 14 Jul 2021 - Big Update

* A tutorial for using it with [IntroJS](https://introjs.com/)
* More integration with [AboutTime](https://gitlab.com/tposney/about-time)
* Better localization and the ability to give custom names to phases
* Randomly generated colors
* Up to 50 phases! (I'm not sure why you would want anywhere near that many)

## 0.4.2 - 25 Jun 2021 - Update loops

There was a super annoying bug where the app would go into an update loop which took like 10 hours to debug

## 0.4.1 - 24 Jun 2021 - For those without SmallTime

* Fixed a bug for anyone that doesn't have SmallTime installed

## 0.4.0 - 23 Jun 2021 - About Time for Gradients

Added integration with About Time, so that changing rounds updates the game's time. Currently, the time is not paused during combat as I still have to figure out how to do that.

Also, added some gradients to make it look nicer ✨

## 0.3.1 - 23 Jun 2021 - Fix for player client not updating

The player client now updates whenever the DM's does. Before, it would only updated on reload 🤭

## 0.3.0 - 22 Jun 2021 - Limit Phases?

I added a new setting to limit the phases to three per round (defaults to disabled). By default this was enabled before.

## 0.1.2 - 22 Jun 2021 - Loading fixes

* Changing the settings now reloads the page
* When loaded, the app initially displays the correct round
* When the sidebar is collapsed, it resizes to fit the content now that there is no combat tracker (if you don't have that disabled)
  
## 0.2.1 - 17 Jun 2021 - Namespace localizations

* Added all of the localizations to the `scs` namespace
* Removed unused logging function

## 0.2.0 - 17 Jun 2021

## 0.1.1 - 15 Jun 2021

## 0.1.0 - 15 Jun 2021 - First Release
