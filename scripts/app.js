// Import libWrapper shim
import { libWrapper } from './shim.js';

// Import public API
import api from './api.js';

/**
 * Manages the SCS form app itself and it's functionality
 */
export default class scsApp extends FormApplication {

    /** Pixels by which to offset the app */
    static pinOffset = 50;

    /** The module's ID */
    static ID = "scs";

    /**
     * An object containing the current phase names and colors
     */
    static phases = {
        names: [],
        colors: [],
        count: undefined,
    };

    /** The current phase */
    static currentPhase = 1;

    /** The current cycle */
    static currentCycle = 1;

    /** The current round
     *  This mirrors the Core round during Core combats and is overridden whenever one is started
     */
    static currentRound = 1;

    /** A boolean representing whether SCS thinks there is currently a combat which is used for About Time integration
     * If a new combatant is created, this will become true.
     * If all combatants are removed, this will return to false.
     */
    static inCombat = false;

    /** @override */
    static get defaultOptions() {
        const pinned = game.settings.get(scsApp.ID, "pinned");

        const playerApp = document.getElementById("players");
        const playerAppPos = playerApp.getBoundingClientRect();

        this.initialPosition = game.settings.get(scsApp.ID, "position");

        // The actual pin location is set elsewhere, but we need to insert something
        // manually here to feed it values for the initial render.
        if (pinned) {
            let rowsHeight = 46 * Math.min(Math.ceil(scsApp.phases.count / 3), 3); // Height of all rows of phases

            this.initialPosition.top = playerAppPos.top - scsApp.pinOffset - rowsHeight + 12;
            this.initialPosition.left = playerAppPos.left;
        };

        return mergeObject(super.defaultOptions, {
            template: "modules/scs/templates/app.hbs",
            id: "scsApp",
            title: "Simultaneous Combat System",
            top: this.initialPosition.top,
            left: this.initialPosition.left,
            closeOnSubmit: false,
        });
    };

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);

        // Remove the app from `ui.windows` to not let it close with the escape key
        delete ui.windows[this.appId];

        // Make sure the app is pinned properly once loaded
        if (game.settings.get(scsApp.ID, "pinned")) scsApp.pinApp();

        // Make the app draggable
        const drag = new Draggable(this, html, document.querySelector("#scsApp #currentRound"), false);

        // Application startup
        if (game.user.isGM) {
            scsApp.combatManager();
            scsApp.generateColors();
        } else {
            scsApp.phases.colors = game.settings.get(scsApp.ID, "colors");
        };
        scsApp.addPhases();
        scsApp.hideFromPlayers();
        scsApp.manageDisplay(html);

        // Pin zone is the "jiggle area" in which the app will be locked to a pinned position if dropped. pinZone stores whether or not we're currently in that area.
        let pinZone = false;

        // Have to override this because of the non-standard drag handle, and also to manage the pin lock zone and animation effects.
        drag._onDragMouseMove = function _newOnDragMouseMove(event) {
            event.preventDefault();

            const playerApp = document.getElementById("players");
            const playerAppPos = playerApp.getBoundingClientRect();

            // Limit dragging to 60 updates per second.
            const now = Date.now();
            if (now - this._moveTime < 1000 / 60) return;
            this._moveTime = now;

            // Follow the mouse.
            let conditionalOffset = 0;
            if (game.settings.get(scsApp.ID, "pinned")) {
                conditionalOffset = 20;
            };

            if (document.getElementById("scs-pin-lock")) scsApp.unPinApp(this);

            this.app.setPosition({
                left: this.position.left + (event.clientX - this._initial.x),
                top: this.position.top + (event.clientY - this._initial.y - conditionalOffset),
            });

            let rowsHeight = 46 * Math.min(Math.ceil(scsApp.phases.count / 3), 3); // Height of all rows of phases

            // Defining a region above the PlayerList that will trigger the jiggle.            
            let playerAppUpperBound = playerAppPos.top - scsApp.pinOffset - rowsHeight;
            let playerAppLowerBound = playerAppPos.top + scsApp.pinOffset;

            if (
                event.clientX < 215 &&
                event.clientY > playerAppUpperBound &&
                event.clientY < playerAppLowerBound
            ) {
                document.querySelector("#scsApp").style.animation = "jiggle 0.2s infinite";
                pinZone = true;
            } else {
                document.querySelector("#scsApp").style.animation = "";
                pinZone = false;
            }
        };

        drag._onDragMouseUp = async function _newOnDragMouseUp(event) {
            event.preventDefault();

            window.removeEventListener(...this.handlers.dragMove);
            window.removeEventListener(...this.handlers.dragUp);

            const playerApp = document.getElementById("players");
            const playerAppPos = playerApp.getBoundingClientRect();
            let rowsHeight = 46 * Math.min(Math.ceil(scsApp.phases.count / 3), 3); // Height of all rows of phases
            let myOffset = playerAppPos.height + scsApp.pinOffset + rowsHeight + 12;

            // If the mouseup happens inside the Pin zone, pin the app.
            if (pinZone) {
                scsApp.pinApp(true);
                await game.settings.set(scsApp.ID, "pinned", true);
                this.app.setPosition({
                    left: 15,
                    top: window.innerHeight - myOffset,
                });
            } else {
                let windowPos = document.querySelector("#scsApp").getBoundingClientRect();
                let newPos = { top: windowPos.top, left: windowPos.left };
                await game.settings.set(scsApp.ID, "position", newPos);
                await game.settings.set(scsApp.ID, "pinned", false);
            }

            // Kill the jiggle animation on mouseUp.
            $("#scsApp").css("animation", "");
        };

        // Re-pin the app when the player list is re-rendered
        Hooks.on("renderPlayerList", () => {
            if (game.settings.get(scsApp.ID, "pinned")) {
                scsApp.unPinApp(false);
                scsApp.pinApp();
            };
        });
    };

    /** Pin the app above the Players list **/
    static async pinApp() {
        // Only do this if a pin lock isn"t already in place.
        if (!document.querySelectorAll("#scs-pin-lock").length) {
            const playerApp = document.getElementById("players");
            const playerAppPos = playerApp.getBoundingClientRect();
            let rowsHeight = 46 * Math.min(Math.ceil(scsApp.phases.count / 3), 3); // Height of all rows of phases
            let myOffset = playerAppPos.height + scsApp.pinOffset + rowsHeight + 12;

            // Add the pin lock to the DOM
            const pinLock = document.createElement("style");
            pinLock.id = "scs-pin-lock";
            pinLock.innerHTML = `#scsApp {
                top: calc(100vh - ${myOffset}px)!important;
                left: 15px!important;
            }`;
            document.body.append(pinLock);

            await game.settings.set(scsApp.ID, "pinned", true);
        }
    };

    /** Un-pin the app */
    static unPinApp(app) {
        // Set initial position to what is being enforced by pin lock if triggered by app
        if (app) {
            let pinnedApp = document.getElementById("scsApp");
            app.position.left = pinnedApp.offsetLeft;
            app.position.top = pinnedApp.offsetTop;
        };

        // Remove the style tag that's pinning the window.
        document.querySelector("#scs-pin-lock").remove();
    };

    /** Initialize phase names */
    static initPhaseNames() {

        // Get phase names
        let settings = game.settings.get(scsApp.ID, "names");

        // Check if the user reset to default phase names
        if (settings === "undefined") {
            // If so, set to the default phases
            scsApp.phases.names = game.i18n.localize("scs.settings.phaseNames.defaults");
        } else {
            // If not, parse and use the first 50 new values from settings
            scsApp.phases.names = settings.split(",").slice(0, 50).map(val => val.trim());
        };
    };

    /**
     * All allowed hues
     * @returns {Array} Hues that validate certain rules from a given base hue
     */
    static allAllowedHues = base => Array.from(new Array(360)) // Hue is in degrees
        .map((_, i) => i + 1) // Insert numbers into the Array from 1 to 300
        .filter(h => // Filter the Array
            Math.abs(base - h) > 15 // Must be sufficiently different than the base
            && Math.abs(base - h) <= 100 // Must not be too different
            && (h < 50 || h > 150) // Must not be green
        );

    /** Last hue generated */
    static lastHue;

    /** Generate a new hue
     * @param {Number} base A base hue from which to generate another hue
     */
    static generateHue(base) {

        // Initialize an Array that will contain the valid hues for the current base
        let validHues = scsApp.allAllowedHues(base);

        // If there is a last hue, set the valid hues to everything that isn't within 25 from the last hue
        if (scsApp.lastHue != null) {
            validHues = scsApp.allAllowedHues(base).filter(h => Math.abs(scsApp.lastHue - h) >= 25);
        };

        // Pick the a random hue from the valid hues
        let chosenHue = validHues[Math.floor(Math.random() * validHues.length)];

        // Set lastHue to the chosen hue for the next generation
        scsApp.lastHue = chosenHue;

        if (chosenHue == undefined) {
            ui.notifications.error("SCS | Error in color generation. Trying again...");
        };

        return chosenHue; // Return the chosen hue
    };

    /** Generate random beautiful color gradients */
    static generateColors() {

        // A hue for each phase
        scsApp.phases.names.forEach((_name, i) => {
            let hueTop, hueBottom;

            // Try and assign existing hues for this phase
            try {
                hueTop = game.settings.get(scsApp.ID, "colors").map(([top]) => top)[i];
                hueBottom = game.settings.get(scsApp.ID, "colors").map(([, bottom]) => bottom)[i];
                if (!hueTop || !hueBottom) throw "no hues stored"

            } catch (err) { // If not, generate new hues

                // Generate the top hue from a random base
                hueTop = scsApp.generateHue(Math.floor(Math.random() * 360));

                // Generate the bottom hue with the top hue as the base
                hueBottom = scsApp.generateHue(hueTop);
            };

            // Push the hues to temp storage
            scsApp.phases.colors.push([hueTop, hueBottom]);
        });

        // Update settings for storage
        game.settings.set(scsApp.ID, "colors", scsApp.phases.colors);
    };

    /** Adds the phases to the Application */
    static addPhases() {
        // Remove any existing buttons
        document.querySelectorAll(".phase-button").forEach(button => { button.remove() });

        // Create "buttons" for phases
        scsApp.phases.names.forEach(name => {
            let phaseButton = document.createElement("div");
            document.querySelector(".scsButtons").append(phaseButton);
            phaseButton.classList.add("phase-button");
            phaseButton.innerText = name;
        });

        // Add colors
        scsApp.phases.colors.forEach((color, i) => {
            document.querySelector("#scsApp #colorGradients").innerHTML += `
            #scsApp .phase-button:nth-child(${i + 1}) {
                background-image: linear-gradient(
                hsl(${color[0]} 80% 40%),
                hsl(${color[1]} 80% 40%)
                );
            }`;
        });
    };

    /** Hide buttons for players and re-adjust app size */
    static hideFromPlayers() {
        if (!game.user.isGM) {
            document.querySelectorAll("#scsApp .scsArrows > *.fas").forEach(arrow => { arrow.style.display = "none" });
        };
    };

    /** Manage phase and round display
     * @param {HTMLElement} html The apps html
    */
    static manageDisplay(html) {

        // Update on Render
        Hooks.on("renderscsApp", () => {
            scsApp.pullValues();
            scsApp.updateApp();
        });

        // Update for players
        Hooks.on("updateSetting", setting => {
            if ((setting.data.key === "scs.currentPhase" || setting.data.key === "scs.currentRound") && !game.user.isGM) {
                scsApp.pullValues();
                scsApp.updateApp();
            };
        });

        // Reset when a new combat is created
        Hooks.on("createCombat", () => { scsApp.pullValues(); scsApp.updateApp(); });

        // If GM, execute one of the functions below this, depending on the button clicked
        if (game.user.isGM) {
            html[0].querySelector("#lastRound").addEventListener("click", () => api.changeRound(-1));
            html[0].querySelector("#lastPhase").addEventListener("click", () => api.changePhase(-1));
            html[0].querySelector("#nextPhase").addEventListener("click", () => api.changePhase(1));
            html[0].querySelector("#nextRound").addEventListener("click", () => api.changeRound(1));
            html[0].querySelectorAll(".phase-button").forEach((button, i) => button.addEventListener("click", () => api.changePhase((i + 1) - scsApp.currentPhase)));
        };
    };

    /** Pull current phase, cycle, and round */
    static pullValues() {
        scsApp.currentPhase = game.settings.get(scsApp.ID, "currentPhase"); // counts the current phase
        scsApp.currentCycle = game.settings.get(scsApp.ID, "currentCycle"); // counts the current cycle
        scsApp.currentRound = game.combat ? game.combat.round : game.settings.get(scsApp.ID, "currentRound"); // get the current round

        // Make sure that the phase is within bounds
        // This is needed because the total amount of phases might be changed by the user
        if (scsApp.currentPhase < 0) {
            scsApp.currentPhase = 1;
        } else if (scsApp.currentPhase > scsApp.phases.count + 1) {
            scsApp.currentPhase = scsApp.phases.count;
        };
    };

    /** Updates the app to display the correct state */
    static updateApp() {
        const buttons = document.querySelectorAll(".phase-button"); // gets an array of the three buttons

        // Save new values if GM
        if (game.user.isGM) {
            game.settings.set(scsApp.ID, "currentPhase", scsApp.currentPhase);
            game.settings.set(scsApp.ID, "currentCycle", scsApp.currentCycle);
            game.settings.set(scsApp.ID, "currentRound", scsApp.currentRound);
        };
        if (buttons[scsApp.currentPhase - 1]) {
            // Update the appearance of the buttons depending on the user's settings
            if (!game.settings.get(scsApp.ID, "alternateActive")) { // Active is darker
                buttons.forEach(current => { current.classList.remove("active") });
                buttons[scsApp.currentPhase - 1].classList.add("active");
            } else { // Active is lighter
                buttons.forEach(current => { current.classList.add("active") });
                buttons[scsApp.currentPhase - 1].classList.remove("active");
            };

            // Scroll the active phase button into view
            let scrollTarget = document.querySelector(".phase-button.active");
            if (scrollTarget.parentNode.scrollTop + document.querySelector(".scsButtons").clientHeight < scrollTarget.offsetTop) {
                scrollTarget.parentNode.scrollTop = scrollTarget.offsetTop - 4;
            } else if (scrollTarget.offsetTop < scrollTarget.parentNode.scrollTop) {
                scrollTarget.parentNode.scrollTop = scrollTarget.offsetTop - 4;
            };
        }
        // Update the Round number
        document.querySelector("#currentRound").innerHTML = [game.i18n.localize("COMBAT.Round"), scsApp.currentRound].join(" ");

        // Alert if core round doesn't match module after some time (checks if there is a core combat first and if one wasn't just created)
        setTimeout(() => { if (game.combat && game.combat?.round !== 0 && game.combat?.round != scsApp.currentRound) ui.notifications.error("SCS | Current round doesn't match Core") }, 100);
    };

    /** Manage combat */
    static combatManager() {
        // Start a combat as soon as a Combatant is created
        Hooks.on("createCombatant", () => {
            if (game.combat) {
                // If a combat exists, start it
                game.combat.startCombat()
            } else {
                // Other wise, create a new one
                const combat = Combat.implementation.create({ scene: game.scenes.active.id })
                combat?.activate({ render: false });
                ui.combat.initialize({ combat });
            };
        });

        // End the combat when all of the Combatants have been removed
        Hooks.on("deleteCombatant", () => {
            if (game.combat?.turns.length === 0) game.combat.endCombat();
        });
    };

    /** Lock users to only certain actions depending on the phase */
    static actionLocking() {
        // Check if enabled
        if (game.settings.get(scsApp.ID, "actionLocking")) {

            if (!["dnd5e"].includes(game.system.id)) {
                ui.notifications.notify("SCS | There is no action locking available for this system yet. Feel free to drop by <a href='https://discord.gg/AAkZWWqVav'>my discord server</a> to make a suggestion");
            } else {
                // Register wrapper for Item Roll for Action Locking
                libWrapper.register(scsApp.ID, "CONFIG.Item.documentClass.prototype.roll", function (wrapped, ...args) {

                    let thisPhase = scsApp.phases.names[scsApp.currentPhase - 1];
                    // Don't change anything if this is not a known phase and notify user
                    if (!["Move", "Attacks", "Magic"].includes(thisPhase)) {
                        if (game.user.isGM) ui.notifications.notify("SCS | There is no action locking available for this phase yet. Feel free to drop by <a href='https://discord.gg/AAkZWWqVav'>my discord server</a> to make a suggestion");
                        return wrapped(...args);
                    };

                    // Manage action locking
                    if (thisPhase === "Move" && (this.data.type === "spell" || this.hasAttack)) {
                        // If it is currently the move phase and this is a spell or an attack, alert user and do nothing
                        ui.notifications.error("SCS | It's currently the Movement & Misc. phase, so you cannot cast spells or attack");
                        return;
                    } else if (thisPhase === "Attacks" && !this.hasAttack) {
                        // If it is currently the attack phase and this is not an attack, alert user and do nothing
                        ui.notifications.error("SCS | It's currently the attack phase, so you can only attack");
                        return;
                    } else if (thisPhase === "Magic" && (this.data.type !== "spell" || this.hasAttack)) {
                        // If it is currently the spells phase and this is not a spell or this has an attack, alert user and do nothing
                        ui.notifications.error("SCS | It's currently the magic phase, so you can only cast non-attacking spells");
                        return;
                    } else {
                        // If not one of the cases above, allow action
                        return wrapped(...args);
                    };
                });
            };
        };
    };
};
