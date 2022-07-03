// Import application
import scsApp from "./app.js";

/**
 * Provides a public API
 */
export default class api {
	/** Change the visibility of the App
	 * @param {Boolean} state - Whether the App should be visible or not
	 */
	static changeVisibility(state) {
		const app = document.querySelector("#scsApp");
		const states = ["", "none"];
		app.style.display = state ? states[0] : states[1];
	}

	/** Adjust visibility of default combat tracker
	 * @param {Boolean} [hide=true] Whether to hide the tracker or not
	 */
	static defaultTracker(hide = true) {
		// Hide or show combat tab
		const combatTab = document.querySelector("[data-tab='combat']");
		hide ? (combatTab.style.display = "none") : (combatTab.style.display = "block");

		// Adjust alignment to compensate for the missing tab
		document.querySelector("#sidebar-tabs").style.justifyContent = "space-between";
		Hooks.on("collapseSidebar", (_sidebar, collapsed) => {
			if (collapsed) document.querySelector("#sidebar").style.height = "auto";
		});
	}

	/** Start IntroJS tutorial tour */
	static startTutorial() {
		if (game.modules.get("_introjs")?.active) {
			introJs()
				.setOptions({
					steps: [
						{
							title: game.i18n.localize("scs.tutorial.welcome.Title"),
							intro: `<form id="scsWelcome"><p>${game.i18n.localize(
								"scs.tutorial.welcome.Intro"
							)}<p></form>`,
						},
						{
							title: game.i18n.localize("scs.tutorial.howItWorks.Title"),
							intro: `${game.i18n.localize("scs.tutorial.howItWorks.Intro")}<ul>${scsApp.phases.names
								.map(name => `<li>${name}</li>`)
								.join("")}</ul>`,
						},
						{
							title: game.i18n.localize("scs.tutorial.combatTracker.Title"),
							element: document.getElementById("sidebar-tabs"),
							intro: game.i18n.localize("scs.tutorial.combatTracker.Intro"),
						},
						{
							title: game.i18n.localize("scs.tutorial.movingAround.Title"),
							element: document.querySelector("#scsApp .currentRound"),
							intro: game.i18n.localize("scs.tutorial.movingAround.Intro"),
						},
					],
					skipLabel: '<a><i class="fas fa-times"></i></a>',
				})
				.start();

			// Create "Don't Show Again" checkbox
			let stopButton = document.createElement("div");
			stopButton.id = "scsTutorialAgainDiv";
			stopButton.innerHTML = `<input id="scsTutorialAgain" type="checkbox"><label for="scsTutorialAgain">${game.i18n.localize(
				"scs.tutorial.dontShowAgain"
			)}</label>`;
			// Add it to the DOM
			document.querySelector(".introjs-tooltipbuttons").before(stopButton);

			// Stop tutorial when it's clicked
			stopButton.addEventListener("click", api.stopTutorial(false));
		} else {
			ui.notifications.warn(
				`${scsApp.ID} | ${game.i18n.format("scs.notifications.tutorial.introDependency", { action: "start" })}`
			);
		}
	}

	/** Stop showing IntroJS tutorial
	 * @param {Boolean} close - Whether the tutorial should also immediately close (defaults to `false`)
	 */
	static stopTutorial(close = false) {
		if (game.modules.get("_introjs")?.active) {
			game.settings.set(scsApp.ID, "startupTutorial", false); // Don't show again
			if (close) document.querySelector(".introjs-skipbutton").click(); // Close tutorial if wanted
		} else {
			ui.notifications.warn(
				`${scsApp.ID} | ${game.i18n.format("scs.notifications.tutorial.introDependency", { action: "stop" })}`
			);
		}
	}

	/** Change SCS phase
	 * @param {Number} delta - The delta by which the phase should change.
	 * Use a positive number to move the phase forward and a negative number to go to previous phases.
	 */
	static async changePhase(delta) {
		if (game.user.isGM) {
			// Pull current values
			scsApp.pullValues();

			// If the phase would change to an invalid value, alert and exit
			if (scsApp.currentPhase + delta < 0 || scsApp.currentPhase + delta > scsApp.phases.count + 1) {
				console.warn(
					`${scsApp.ID} | ${game.i18n.format("scs.notifications.changeOutOfBounds", {
						delta: delta,
						phase: scsApp.currentPhase,
					})}`
				);
				return;
			}

			// Get previous phase
			const previousPhase = scsApp.currentPhase;

			// Change phase by delta
			scsApp.currentPhase += delta;

			// Loop phases if limit cycles is enabled
			if (game.settings.get(scsApp.ID, "limitCycles")) {
				// Increment cycle if at the end of all phases
				if (scsApp.currentPhase === scsApp.phases.count + 1) scsApp.currentCycle += 1;

				// If the maximum amount of cycles is reached, loop and reset cycles
				if (scsApp.currentCycle > game.settings.get(scsApp.ID, "maxCycle")) {
					game.combat?.nextRound();
					scsApp.currentCycle = 1;
				}
			}

			// Change rounds if limit phases is enabled
			if (game.settings.get(scsApp.ID, "limitPhases")) {
				if (scsApp.currentPhase === scsApp.phases.count + 1) {
					game.combat?.nextRound();
				} else if (scsApp.currentPhase === 0) {
					game.combat?.previousRound();
				}
			} else {
				// Loop over phases
				if (scsApp.currentPhase === scsApp.phases.count + 1) {
					scsApp.currentPhase = 1;
				} else if (scsApp.currentPhase === 0) {
					scsApp.currentPhase = scsApp.phases.count;
				}
			}

			// Correct phase if it exceeds new limit
			if (scsApp.currentPhase > scsApp.phases.count) scsApp.currentPhase = scsApp.phases.count;

			// Update app to display new values
			scsApp.updateApp();

			// Fire a hook
			Hooks.call("scsPhaseChanged", scsApp.currentPhase, previousPhase, delta);
		}
	}
}

// Add API to the module's scope on init
Hooks.on("ready", () => (game.modules.get(scsApp.ID).api = api));
