// Import application
import scsApp from './app.js';

/** Action Tracker */
export default class AttackHUD {
    constructor() {
        Hooks.on("createChatMessage", async app => {

            // Figure out if this is an attack roll
            let isAttack;
            switch (game.system.id) {
                case "dnd5e":
                    isAttack = await game.messages.get(app.id).getFlag("dnd5e", "roll")?.type === "attack";
                    break;
                case "pf2e":
                    const type = await game.messages.get(app.id).getFlag("pf2e", "context")?.type
                    isAttack = type === "attack-roll" || type === "spell-attack-roll";
            };

            // Update HUD if this is an Attack roll and the feature is enabled
            if (isAttack && game.settings.get(scsApp.ID, "showAttackHUD")) {
                console.log("SCS| Latest attack roll set:", app.roll.total);

                // Set flag on Actor
                await game.actors.get(app.data.speaker.actor).setFlag(scsApp.ID, "lastAttackRoll", app.roll.total);

                // Re-render HUD
                const token = game.scenes.get(game.canvas.scene.id).tokens.get(app.data.speaker.token).object;
                canvas.hud.token.bind(token);
            };
        });

        Hooks.on("renderTokenHUD", async (_app, html, data) => {
            // Get flag on Actor
            const roll = await game.actors.get(data.actorId).getFlag(scsApp.ID, "lastAttackRoll");

            // Create control
            const control = document.createElement("div");
            control.classList.add("control-icon");
            control.title = "Last Attack Roll";
            control.innerText = roll;

            // Add to HUD if there is a roll value
            if (roll) html[0].querySelector(".col.right").append(control);
        });
    };
};
