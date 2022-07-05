// Import public API
import api from "./api.js";

// Import application
import scsApp from "./app.js";

// Import for registering module settings
import registerSettings from "./settings.js";

// Import for registering keybindings
import registerKeybindings from "./keybindings.js";

// Import Attack Roll Token HUD
import AttackDisplay from "./display.js";

Hooks.on("init", () => {
	if (game.version && isNewerVersion(game.version, "9.230")) registerKeybindings();
});

Hooks.on("ready", () => {
	// Register settings
	registerSettings();

	// Initialize API
	new api();

	// Hide default combat tracker
	if (game.settings.get(scsApp.ID, "hideTracker")) api.defaultTracker();

	// Move the app up if SmallTime's app is rendered
	Hooks.once("renderSmallTimeApp", () => {
		scsApp.pinOffset += document.querySelector("#smalltime-app").clientHeight + 10;
	});

	// Prevent turns from existing
	if (game.settings.get(scsApp.ID, "preventTurns")) {
		// Hide Argon's "End Turn" button
		Hooks.on(
			"renderCombatHudCanvasElement",
			(_app, [html]) => (html.querySelector("[data-title='Pass']").style.display = "none")
		);

		// Prevent any active combatants (requires v9d2 or later)
		if (game.version && isNewerVersion(game.version, "9.230")) {
			game.combat?.update({ turn: null });
			Hooks.on("preUpdateCombat", (_document, change) => {
				change.turn = null;
			});
		}

		// Add class to Combat Tracker to hide buttons
		Hooks.on("renderCombatTracker", (_app, [html]) => html.classList.add("scs-hide-turn-buttons"));
	}

	// Initialize phase names
	scsApp.initPhaseNames();

	// If not already done, define a property to count the number of phases, but disallow change
	if (!scsApp.phases.count) {
		Object.defineProperty(scsApp.phases, "count", {
			get: () => scsApp.phases.names.length,
			set: () => {
				throw `${scsApp.ID} | ${game.i18n.localize("scs.notifications.phaseCountDerived")}`;
			},
			configurable: false,
		});
	}

	// Render the app
	new scsApp().render(true);

	// Manage Action Locking
	scsApp.actionLocking();

	// Show the IntroJS tutorial once the app is rendered if the user hasn't denied the tutorial
	Hooks.once("renderscsApp", () => {
		if (game.settings.get(scsApp.ID, "startupTutorial")) {
			if (game.modules.get("_introjs")?.active) {
				api.startTutorial();
			} else {
				ui.notifications.warn(
					`${scsApp.ID} | ${game.i18n.format("scs.notifications.tutorial.introDependency", {
						action: "view",
					})}`
				);
			}
		}
	});

	// Start action tracker
	new AttackDisplay();
});
