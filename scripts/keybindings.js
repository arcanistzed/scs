/**
 * Register all keybindings for SCS
 */
export default function registerKeybindings() {
	game.keybindings.register(scsApp.ID, "nextPhase", {
		name: "Next Phase",
		hint: "Switch to the next phase",
		editable: [
			{
				key: "ARROWRIGHT",
				modifiers: ["ALT"]
			}
		],
		onDown: () => api.changePhase(1),
	});
	game.keybindings.register(scsApp.ID, "previousPhase", {
		name: "Previous Phase",
		hint: "Switch to the previous phase",
		editable: [
			{
				key: "ARROWLEFT",
				modifiers: ["ALT"]
			}
		],
		onDown: () => api.changePhase(-1),
	});

	game.keybindings.register(scsApp.ID, "nextRound", {
		name: "Next Round",
		hint: "Switch to the next round",
		editable: [
			{
				key: "ARROWRIGHT",
				modifiers: ["SHIFT"]
			}
		],
		onDown: () => api.changeRound(1),
	});
	game.keybindings.register(scsApp.ID, "previousRound", {
		name: "Previous Round",
		hint: "Switch to the previous round",
		editable: [
			{
				key: "ARROWLEFT",
				modifiers: ["SHIFT"]
			}
		],
		onDown: () => api.changeRound(-1),
	});

	game.keybindings.register(scsApp.ID, "toggleVisibility", {
		name: "Toggle Visibility",
		hint: "Show and hide the app",
		editable: [
			{
				key: "S",
				modifiers: ["ALT"]
			}
		],
		onDown: () => {
			if (document.querySelector("#scsApp").style.display === "none") {
				api.changeVisibility(true);
			} else {
				api.changeVisibility(false);
			};
		},
	});
};
