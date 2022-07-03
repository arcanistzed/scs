// Import application
import scsApp from "./app.js";

/** Action Tracker */
export default class AttackDisplay {
	constructor() {
		Hooks.on("createChatMessage", async doc => {
			// Don't do anything if Better Rolls or MidiQoL are enabled
			if (game.modules.get("betterrolls5e")?.active || game.modules.get("midi-qol")?.active) return;

			/** Whether or not this is an attack roll */
			let isAttack;
			switch (game.system.id) {
				case "dnd5e":
					isAttack = (await doc.getFlag("dnd5e", "roll")?.type) === "attack";
					break;
				case "pf2e":
					const type = await doc.getFlag("pf2e", "context")?.type;
					isAttack = type === "attack-roll" || type === "spell-attack-roll";
			}
			if (doc.data.flavor?.includes(game.i18n.localize("DND5E.AttackRoll"))) isAttack = true; // fallback

			// Update if this is an Attack roll
			if (isAttack) this.update(doc.data.speaker.token, doc.roll.total);
		});

		// Manage when Better Rolls is enabled
		Hooks.on("messageBetterRolls", br => this.updateForBetterRolls(br));
		Hooks.on("updateBetterRolls", br => this.updateForBetterRolls(br));

		// Manage when MidiQoL is enabled
		Hooks.on("midi-qol.AttackRollComplete", workflow => this.update(workflow.tokenId, workflow.attackTotal));

		// Remove the previous display when the token changes sizes
		Hooks.on("updateToken", (doc, change) => {
			if (change.width || change.height) this.remove(doc.id);
		});
	}

	/** The current display */
	DISPLAY = {};

	/** Create the display
	 * @param {Token} token - The token {@link PlaceableObject} to create a display for
	 * @memberof AttackDisplay
	 */
	create(token) {
		// Create a new PIXI display for this token
		this.DISPLAY[token.id] = {};

		// Create the HUD display
		if (game.settings.get(scsApp.ID, "hudDisplay")) {
			// Create PIXI Objects
			const TEXT = new PreciseText("", {
				fill: 0x000000,
				fontSize: 125,
				fontFamily: "Roboto",
				fontWeight: "bold",
				align: "center",
			});
			const ICON = new PIXI.Sprite.from("/icons/svg/combat.svg");

			// Adjust icon dimensions and position
			ICON.height = 48;
			ICON.width = 48;
			ICON.x = token.width / 2 - ICON.width / 2 - /* Fix for un-centered icon */ 5;
			ICON.y = token.height - 15;

			// FIXME These numbers are sort of random
			TEXT.x = TEXT.width * 6;
			TEXT.y = ICON.height * 4.5;

			// Add to the placeable
			token.addChild(ICON);
			ICON.addChild(TEXT);

			// Store the PIXI objects for updating later
			this.DISPLAY[token.id].hud = { icon: ICON, text: TEXT };
		}

		// Create the Combat Tracker display
		if (game.settings.get(scsApp.ID, "trackerDisplay")) {
			this.DISPLAY[token.id].tracker = [];

			// Get the combatant in the tracker(s) if it is there
			if (game.combat && token.combatant)
				document
					.querySelectorAll(
						`.combatant[data-combatant-id=${game.combat.combatants.get(token.combatant.id).id}]`
					)
					.forEach(el => {
						// Create the icon
						const icon = document.createElement("img");
						icon.src = "/icons/svg/combat.svg";
						icon.style.flex = 0;

						// Create the text
						const text = document.createElement("p");
						text.style.flex = 0;
						text.style.width = 0;
						text.style.margin = 0;
						text.style.transform = "translate(-31px, 3px)";
						text.style.color = "black";

						// Add the image and text to the tracker after the name
						el.querySelector(".token-name").after(icon, text);

						// Store the HTML elements for updating later
						this.DISPLAY[token.id].tracker.push({ icon: icon, text: text });
					});
		}
	}

	/** Update the display for Better Rolls
	 * @param {CustomItemRoll} br - The Better Rolls Item Roll
	 * @memberof AttackDisplay
	 */
	updateForBetterRolls(br) {
		// Get the attack roll if this is an attack
		const attackRoll = (br.entries ?? [])
			.find(entry => entry.rollType === "attack")
			?.entries.filter(entry => !entry.ignored)
			.map(entry => entry.total)[0];

		// Search for the token ID
		const tokenId =
			br.tokenId?.replace(/Scene\.\w{16}\.Token\.(?=\w{16})/, "") ||
			game.messages.get(br.messageId)?.data.speaker.token ||
			canvas.tokens.controlled[0].id ||
			game.actors.get(br.actorId)?.getActiveTokens()[0];

		// Update the display
		this.update(tokenId, attackRoll);
	}

	/** Update the display
	 * @param {ID} tokenId - The {@link Token} ID
	 * @param {Number} roll - The Attack Roll total result
	 * @memberof AttackDisplay
	 */
	update(tokenId, roll) {
		// Check if the feature is enabled, and if it's the Attack phase
		if (
			(game.settings.get(scsApp.ID, "hudDisplay") || game.settings.get(scsApp.ID, "trackerDisplay")) &&
			scsApp.phases.names[scsApp.currentPhase - 1] ===
				game.i18n.localize("scs.settings.phaseNames.defaults.attacks")
		) {
			/** Log this attack roll */
			console.log(`${scsApp.ID} | ${game.i18n.localize("scs.notifications.display.latestAttackRoll")}`, roll);

			// Get token placeables for this actor
			canvas.tokens.placeables
				.filter(token => token.id === tokenId)
				.forEach(token => {
					// Set a flag on the actor
					token.actor.setFlag("scs", "attackRoll", roll);

					// If no PIXI display already exist for this token, create one
					if (!this.DISPLAY[tokenId]) this.create(token);

					// Update text
					if (this.DISPLAY[tokenId].hud) this.DISPLAY[tokenId].hud.text.text = roll;
					if (this.DISPLAY[tokenId].tracker)
						this.DISPLAY[tokenId].tracker.forEach(d => (d.text.innerText = roll));

					// When the phase changes, if it's no longer the attack phase, remove the display
					Hooks.on("scsPhaseChanged", currentPhase => {
						if (
							scsApp.phases.names[currentPhase - 1] !==
							game.i18n.localize("scs.settings.phaseNames.defaults.attacks")
						)
							this.remove(tokenId);
					});
				});
		}
	}

	/** Remove the display
	 * @param {ID} tokenId - The {@link Token} ID
	 * @memberof AttackDisplay
	 */
	remove(tokenId) {
		// Check if there is a display for this token
		if (this.DISPLAY[tokenId]) {
			// Remove the HTML elements
			this.DISPLAY[tokenId].tracker?.forEach(d => {
				d.icon.remove();
				d.text.remove();
			});
			// Remove the PIXI display
			canvas.tokens.get(tokenId).removeChild(this.DISPLAY[tokenId].hud?.icon);
			this.DISPLAY[tokenId] = false;
		}
	}
}
