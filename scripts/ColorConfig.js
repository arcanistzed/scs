import scsApp from "./app.js";

/**
 * Color configuration settings menu
 */
export default class ColorConfig extends FormApplication {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			id: "scs-colorConfig",
			title: game.i18n.localize("scs.colorConfig.title"),
			template: "modules/scs/templates/colorConfig.hbs",
			classes: ["scs", "colorConfig"],
			submitOnChange: true,
			submitOnClose: true,
			closeOnSubmit: false,
		});
	}

	getData(options = {}) {
		return mergeObject(super.getData(options), {
			// Prepare the data to be passed to the template
			phases: scsApp.phases.names.map((name, i) => ({
				name,
				colors: expandObject(scsApp.phases.colors[i]),
			})),
		});
	}

	activateListeners([html]) {
		super.activateListeners(this.element);

		// Handle clicking on the randomize buttons
		html.addEventListener("click", ({ target }) => {
			if (target.matches("[data-action='randomize']")) {
				const input = target.parentElement.querySelector("input");
				const data = input.name.split(".");
				const hue = scsApp.generateHue();
				input.value = hue;
				scsApp.phases.colors[parseInt(data[0])][parseInt(data[1])] = hue;
				scsApp.addPhases();
				scsApp.updateApp();
				this.submit()
			}
		});

		// Handle changing the color inputs
		html.addEventListener("change", ({ target }) => {
			if (target.matches(".phase input")) {
				const data = target.name.split(".");
				scsApp.phases.colors[parseInt(data[0])][parseInt(data[1])] = parseInt(target.value);
				scsApp.addPhases();
				scsApp.updateApp();
			}
		});
	}

	// Update the source data
	async _updateObject(_event, _formData) {
		game.settings.set(scsApp.ID, "colors", scsApp.phases.colors);
	}
}
