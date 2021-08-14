# Changelog

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
