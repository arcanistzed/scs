// Import application
import scsApp from "./app.js";
import api from "./api.js";

/**
 * Register all keybindings for SCS
 */
export default function registerKeybindings() {
	game.keybindings.register(scsApp.ID, "nextPhase", {
		name: game.i18n.localize("scs.keybindings.nextPhase.name"),
		hint: game.i18n.localize("scs.keybindings.nextPhase.hint"),
		onDown: () => api.changePhase(1),
	});
	game.keybindings.register(scsApp.ID, "previousPhase", {
		name: game.i18n.localize("scs.keybindings.previousPhase.name"),
		hint: game.i18n.localize("scs.keybindings.previousPhase.hint"),
		onDown: () => api.changePhase(-1),
	});

	game.keybindings.register(scsApp.ID, "nextRound", {
		name: game.i18n.localize("scs.keybindings.nextRound.name"),
		hint: game.i18n.localize("scs.keybindings.nextRound.hint"),
		onDown: () => game.combat?.nextRound(),
	});
	game.keybindings.register(scsApp.ID, "previousRound", {
		name: game.i18n.localize("scs.keybindings.previousRound.name"),
		hint: game.i18n.localize("scs.keybindings.previousRound.hint"),
		onDown: () => game.combat?.previousRound(),
	});

	game.keybindings.register(scsApp.ID, "toggleVisibility", {
		name: game.i18n.localize("scs.keybindings.toggleVisibility.name"),
		hint: game.i18n.localize("scs.keybindings.toggleVisibility.hint"),
		onDown: () => {
			if (document.querySelector("#scsApp").style.display === "none") {
				api.changeVisibility(true);
			} else {
				api.changeVisibility(false);
			}
		},
	});
}
