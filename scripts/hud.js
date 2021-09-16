// Import application
import scsApp from './app.js';

/** Action Tracker */
export default class AttackHUD {
    constructor() {
        Hooks.on("createChatMessage", async doc => {
            // Don't do anything if Better Rolls is enabled
            if (game.modules.get("betterrolls5e")?.active) return;
            /** Whether or not this is an attack roll */
            let isAttack;
            switch (game.system.id) {
                case "dnd5e":
                    isAttack = await game.messages.get(doc.id).getFlag("dnd5e", "roll")?.type === "attack";
                    break;
                case "pf2e":
                    const type = await game.messages.get(doc.id).getFlag("pf2e", "context")?.type
                    isAttack = type === "attack-roll" || type === "spell-attack-roll";
            };

            // Update HUD if this is an Attack roll
            if (isAttack) this.updateHUD(doc.data.speaker.token, doc.roll.total);
        });

        // Manage the HUD when Better Rolls is enabled
        Hooks.on("messageBetterRolls", br => this.updateForBetterRolls(br));
        Hooks.on("updateBetterRolls", br => this.updateForBetterRolls(br));

        // Remove the previous HUD when the token changes sizes
        Hooks.on("updateToken", (doc, change) => {
            if (change.width || change.height) this.HUD[doc.id] = false;
        });
    };

    /** The PIXI Objects in the HUD */
    HUD = {};

    /** Create the HUD
     * @param {String} tokenId - The ID of the {@link Token} to create an HUD for
     * @param {*} placeable - The {@link PlaceableObject} for the token
     * @memberof AttackHUD
     */
    createHUD(tokenId, placeable) {
        // Create a new PIXI HUD for this token
        this.HUD[tokenId] = {};

        // Create PIXI Objects
        const TEXT = this.HUD[tokenId].text = new PIXI.Text("", { fill: 0x000000, fontSize: 125, fontFamily: "Roboto", fontWeight: "bold", align: "center" });
        const ICON = this.HUD[tokenId].icon = new PIXI.Sprite.from("/icons/svg/combat.svg");

        // Adjust icon dimensions and position
        ICON.height = 48;
        ICON.width = 48;
        ICON.y = game.scenes.active.tokens.get(tokenId).object.height / 1.5;
        ICON.x = game.scenes.active.tokens.get(tokenId).object.width / 2 - 36;

        // Adjust text resolution and position
        TEXT.resolution = 10;
        TEXT.x = 180;
        TEXT.y = 210;

        // Add to the placeable
        placeable.addChild(ICON);
        ICON.addChild(TEXT);
    };

    /** Update the HUD for Better Rolls
     * @param {CustomItemRoll} br - The Better Rolls Item Roll
     * @memberof AttackHUD
     */
    updateForBetterRolls(br) {
        // Get the attack roll if this is an attack
        const attackRoll = (br.entries ?? []).find(entry => entry.rollType === "attack")?.entries.filter(entry => !entry.ignored).map(entry => entry.total)[0];

        // Search for the token ID
        const tokenId = br.tokenId?.replace(/Scene\.\w{16}\.Token\.(?=\w{16})/, "")
            || game.messages.get(br.messageId)?.data.speaker.token
            || canvas.tokens.controlled[0].id
            || game.actors.get(br.actorId)?.getActiveTokens()[0];

        // Update the HUD
        this.updateHUD(tokenId, attackRoll);
    };

    /** Update the HUD
     * @param {ID} tokenId - The {@link Token} ID
     * @param {Number} roll - The Attack Roll total result
     * @memberof AttackHUD
     */
    updateHUD(tokenId, roll) {
        // Check if the feature is enabled, and if it's the Attack phase
        if (game.settings.get(scsApp.ID, "showAttackHUD") && scsApp.phases.names[scsApp.currentPhase - 1] === "Attacks") {

            /** Log this attack roll */
            console.log("SCS | Latest attack roll", roll);

            // Get token placeables for this actor
            canvas.tokens.placeables.filter(token => token.id === tokenId).forEach(placeable => {

                // If no PIXI HUD already exist for this token, create one
                if (!this.HUD[tokenId]) this.createHUD(tokenId, placeable);

                // Update text
                this.HUD[tokenId].text.text = roll;

                // When the phase changes, if it's no longer the attack phase, remove the HUD
                Hooks.on("scsPhaseChanged", currentPhase => {
                    if (scsApp.phases.names[currentPhase - 1] !== "Attacks") {
                        placeable.removeChild(this.HUD[tokenId].icon);
                        this.HUD[tokenId] = false;
                    };
                });
            });
        };
    }
};