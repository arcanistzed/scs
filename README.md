# Simultaneous Combat System

![Version](https://img.shields.io/github/v/tag/arcanistzed/scs?label=Version&style=flat-square&color=2577a1) ![Latest Release Download Count](https://img.shields.io/github/downloads/arcanistzed/scs/latest/module.zip?label=Downloads&style=flat-square&color=9b43a8) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Farcanistzed%2Fscs%2Fmain%2Fmodule.json&label=Foundry%20Core%20Compatible%20Version&query=$.compatibleCoreVersion&style=flat-square&color=ff6400)

A beautiful mostly system-agnostic and completely customizable implementation of a Simultaneous Combat System. See the [Reddit post](https://redd.it/p11h35) from the author.

Have you ever tired of waiting for the turns of your friends to be over? Are you fed up with your players taking so long in *every* combat encounter? Do you feel like changing things up in your game and trying something new?

![gradient](https://user-images.githubusercontent.com/82790112/123046244-ddeb3a80-d3c9-11eb-98db-da2f4a6abd68.gif)

## Usage

Please follow the built-in tutorial (built with IntoJS), for instructions. You can always relaunch the tutorial from within the settings. If you have any questions, feel free to contact me.

## Features

### Action Locking

In supported systems, SCS will detect whether the current phase has been registered with the module and will restrict what can be done on your turn accordingly.

If you would like to add support for another system or more phases, please make a PR or let me know on my Discord (link is below) and I will happily take suggestions.

Currently only dnd5e is supported with the default phases as described in the reddit post linked above.

### Phase and Round display

The module will display the current phase and round in an interactive and draggble app. You can use the arrows to change phase (`<` or `>`) and change round (`<<` or `>>`), or you can simply click on the phase you would like to switch to (not recommended if using phase/cycle limits).

### Integration with the Core Combat Tracker

While this module hides the Combat Tracker by default, it updates it in the background whenever the round is switched to allow for better compatibility. There is also a setting to show the default Combat Tracker.

### Attack Roll HUD

In order to ease determining the attack order (for example, in the default attack phase), the module shows you the last attack roll in the token's HUD. This currently only works in D&D 5e and PF 2e.

### Integration with other modules

#### [SmallTime](https://foundryvtt.com/packages/smalltime)

The app moves outside of SmallTime's way

#### [About Time](https://foundryvtt.com/packages/about-time)

If using About Time's realtime clock, SCS will prompt you to pause for the duration of your combat encounter. Just add a combatant (by right clicking on it and clicking "Toggle Combat State" in the HUD) and it will percieve that as a combat that has started. Removing all combatants ends the combat.

#### [Argon Combat HUD](https://foundryvtt.com/packages/enhancedcombathud)

This module hides Argon's "End Turn" button.

### Change Colors

Clicking this button will generate new random colors for the phases!

### Limit Phases

This setting will automatically switch the round at the end of the cycle of all phases. You can also do this with Maximum Cycle set to 1 and Limit Cycles enabled.

### Limit Cycles & Maximum Cycle

This setting will put a limit on how many cycles can take place before switching to the next round. For example, if Maximum Cycle is set to 3, after each phase has been completed three times, it will be the next round. It is recommended using the arrows to navigate between phases when using this.

## API

SCS has a small API with a few methods that can be called by others. They are accessible under `game.modules.get("scs")?.api`.

### `defaultTracker(hide = true)`

This will elegantly hide the default combat tracker from the sidebar. An optional Boolean paramter can be used to show the trackeragain, if hidden.

### `startTutorial()`

This will show the IntroJS tutorial tour once.

### `stopTutorial(close = false)`

This will stop the tour from showing everytime the page is loaded unless the user re-enabled the tutorial from within the module settings.
An optional Boolean paramter can be used to also immediately close the tutorial, but this defaults to `false`.

### `changeRound(delta)`

An asynchronous method that changes the SCS's round by a given delta. Note that this will also change the Core round. Use a positive number for the delta to move the round forward and a negative number to go to previous rounds.

### `changePhase(delta)`

An asynchronous method that changes the SCS's phase by a given delta. Use a positive number for the delta to move the round forward and a negative number to go to previous rounds.

## Installation

In the setup screen, use the URL `https://github.com/arcanistzed/scs/releases/latest/download/module.json` to install the module.

## License

Copyright © 2021 arcanist

This package is under an [MIT license](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).

See the [Notice](./NOTICE.md) for attribution details.

## Bugs

You can submit bugs via [Github Issues](https://github.com/arcanistzed/scs/issues/new/choose) or on [my Discord server](https://discord.gg/AAkZWWqVav).

## Localization

Please note that the `Phases` must be short enough to fit their boxes, so you shouldn't put anything over approximately eight characters.

## Contact me

Come hang out on [my Discord server](https://discord.gg/AAkZWWqVav) or [click here to send me an email](mailto:arcanistzed@gmail.com?subject=Simultaneous%20Combat%20System%20module).
