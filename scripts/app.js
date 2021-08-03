// Import libWrapper shim
import { libWrapper } from './shim.js';

// Import public API
import { } from './api.js';

/**
 * Manages the SCS form app itself and it's functionality
 */
export default class scsApp extends FormApplication {
    static pinOffset = 100;

    // Override close() to prevent Escape presses from closing the scs app.
    async close(options = {}) {
        // If called by scs or SmallTime, use original method to handle app closure.
        if (options.scs || options.smallTime) return super.close();

        // Case 1: Close other open UI windows.
        if (Object.keys(ui.windows).length > 1) {
            Object.values(ui.windows).forEach((app) => {
                if (app.title === "Simultaneous Combat System" || app.title === "SmallTime") return;
                app.close();
            });
        }
        // Case 2 (GM only): Release controlled objects.
        else if (
            canvas?.ready &&
            game.user.isGM &&
            Object.keys(canvas.activeLayer._controlled).length
        ) {
            event.preventDefault();
            canvas.activeLayer.releaseAll();
        }
        // Case 3: Toggle the main menu.
        else ui.menu.toggle();
    };

    static get defaultOptions() {
        const pinned = game.settings.get(scs.ID, "pinned");

        const playerApp = document.getElementById("players");
        const playerAppPos = playerApp.getBoundingClientRect();

        this.initialPosition = game.settings.get(scs.ID, "position");

        // The actual pin location is set elsewhere, but we need to insert something
        // manually here to feed it values for the initial render.
        if (pinned) {
            var playerOffset = 12;
            this.initialPosition.top = playerAppPos.top - scsApp.pinOffset + playerOffset;
            this.initialPosition.left = playerAppPos.left;
        };

        return mergeObject(super.defaultOptions, {
            template: "modules/scs/templates/app.hbs",
            id: "scsApp",
            title: "Simultaneous Combat System",
            top: this.initialPosition.top,
            left: this.initialPosition.left
        });
    };

    activateListeners(html) {
        super.activateListeners(html);

        // Make sure the app is pinned properly once loaded
        if (game.settings.get(scs.ID, "pinned")) scsApp.pinApp();

        // Make the app draggable
        const drag = new Draggable(this, html, document.querySelector("#scsApp #currentRound"), false);

        // Application startup
        scsApp.initPhaseNames(game.settings.get(scs.ID, "phases"));
        scsApp.generateColors();
        scsApp.addPhases();
        scsApp.hideFromPlayers();
        scsApp.display(html);
        if (game.user.isGM) scsApp.clock();

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
            // TODO: Figure out how to account for changes to the viewport size
            // between drags.
            let conditionalOffset = 0;
            if (game.settings.get(scs.ID, "pinned")) {
                conditionalOffset = 20;
            };

            if (document.getElementById("pin-lock")) scsApp.unPinApp(this);

            this.app.setPosition({
                left: this.position.left + (event.clientX - this._initial.x),
                top: this.position.top + (event.clientY - this._initial.y - conditionalOffset),
            });

            // Defining a region above the PlayerList that will trigger the jiggle.
            let playerAppUpperBound = playerAppPos.top - scsApp.pinOffset;
            let playerAppLowerBound = playerAppPos.top + scsApp.pinOffset;

            if (
                event.clientX < 215 &&
                event.clientY > playerAppUpperBound &&
                event.clientY < playerAppLowerBound
            ) {
                $("#scsApp").css("animation", "jiggle 0.2s infinite");
                pinZone = true;
            } else {
                $("#scsApp").css("animation", "");
                pinZone = false;
            }
        };

        drag._onDragMouseUp = async function _newOnDragMouseUp(event) {
            event.preventDefault();

            window.removeEventListener(...this.handlers.dragMove);
            window.removeEventListener(...this.handlers.dragUp);

            const playerApp = document.getElementById("players");
            const playerAppPos = playerApp.getBoundingClientRect();
            let myOffset = playerAppPos.height + scsApp.pinOffset;

            // If the mouseup happens inside the Pin zone, pin the app.
            if (pinZone) {
                scsApp.pinApp(true);
                await game.settings.set(scs.ID, "pinned", true);
                this.app.setPosition({
                    left: 15,
                    top: window.innerHeight - myOffset,
                });
            } else {
                let windowPos = $("#scsApp").position();
                let newPos = { top: windowPos.top, left: windowPos.left };
                await game.settings.set(scs.ID, "position", newPos);
                await game.settings.set(scs.ID, "pinned", false);
            }

            // Kill the jiggle animation on mouseUp.
            $("#scsApp").css("animation", "");
        };

        // Re-pin the app when the player list is re-rendered
        Hooks.on("renderPlayerList", () => {
            if (game.settings.get(scs.ID, "pinned")) {
                scsApp.unPinApp(false);
                scsApp.pinApp();
            };
        });
    };

    // Pin the app above the Players list.
    static async pinApp(_expanded) {
        // Only do this if a pin lock isn"t already in place.
        if (!$("#pin-lock").length) {
            const playerApp = document.getElementById("players");
            const playerAppPos = playerApp.getBoundingClientRect();
            let myOffset = playerAppPos.height + scsApp.pinOffset;

            // Dropping this into the DOM with an !important was the only way
            // I could get it to enable the locking behaviour.
            $("body").append(`
        <style id="pin-lock">
          #scsApp {
            top: calc(100vh - ${myOffset}px) !important;
            left: 15px !important;
          }
        </style>
      `);
            await game.settings.set(scs.ID, "pinned", true);
        }
    };

    // Un-pin the app.
    static unPinApp(app) {
        // Set initial position to what is being enforced by pin lock if triggered by app
        if (app) {
            let pinnedApp = document.getElementById("scsApp");
            app.position.left = pinnedApp.offsetLeft;
            app.position.top = pinnedApp.offsetTop;
        };

        // Remove the style tag that's pinning the window.
        $("#pin-lock").remove();
    };

    // Initialize phase names
    static initPhaseNames(settings) {
        // Check if the user reset to default phase names
        if (settings === "undefined") {
            // If so, set to the default phases
            scs.phases.names = game.i18n.localize("scs.settings.phaseNames.defaults");
        } else {
            // If not, parse and use the first 50 new values from settings
            scs.phases.names = settings.split(",").slice(0, 50).map(val => val.trim());
        };
    };

    // Returns an array of hues that validate certain rules from a given base hue
    static allAllowedHues = base => Array.from(new Array(360)) // Hue is in degrees
        .map((_, i) => i + 1) // Insert numbers into the Array from 1 to 300
        .filter(h => // Filter the Array
            Math.abs(base - h) > 15 // Must be sufficiently different than the base
            && Math.abs(base - h) <= 100 // Must not be too different
            && (h < 50 || h > 150) // Must not be green
        );

    // Last hue generated
    static lastHue;

    // Generate a new hue from a base hue
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

    // Generate random beautiful color gradients
    static generateColors() {

        // A hue for each phase
        scs.phases.names.forEach((_name, i) => {
            let hueTop, hueBottom;

            // Try and assign existing hues for this phase
            try {
                hueTop = game.settings.get(scs.ID, "color").map(([top]) => top)[i];
                hueBottom = game.settings.get(scs.ID, "color").map(([, bottom]) => bottom)[i];
                if (!hueTop || !hueBottom) throw "no hues stored"

            } catch (err) { // If not, generate new hues

                // Generate the top hue from a random base
                hueTop = scsApp.generateHue(Math.floor(Math.random() * 360));

                // Generate the bottom hue with the top hue as the base
                hueBottom = scsApp.generateHue(hueTop);
            };

            // Push the hues to temp storage
            scs.phases.colors.push([hueTop, hueBottom]);
        });

        // Update settings for storage if GM
        if (game.user.isGM) game.settings.set(scs.ID, "color", scs.phases.colors);
    };

    // Adds the phases to the Application
    static addPhases() {
        // Remove any existing buttons
        document.querySelectorAll(".phase-button").forEach(button => { button.remove() });

        // Create "buttons" for phases
        scs.phases.names.forEach(name => {
            let phaseButton = document.createElement("div");
            document.querySelector(".scsButtons").append(phaseButton);
            phaseButton.classList.add("phase-button");
            phaseButton.innerText = name;
        });

        // Add colors
        scs.phases.colors.forEach((color, i) => {
            document.querySelector("#scsApp #colorGradients").innerHTML += `
            #scsApp .phase-button:nth-child(${i + 1}) {
                background-image: linear-gradient(
                hsl(${color[0]} 80% 40%),
                hsl(${color[1]} 80% 40%)
                );
            }`
        })
    };

    // Hide buttons for players and re-adjust app size
    static hideFromPlayers() {
        if (!game.user.isGM) {
            document.querySelectorAll("#scsApp .scsArrows > *.fas").forEach(arrow => { arrow.style.display = "none" });
        };
    };

    // Manage phase and round diplay
    static display(html) {
        // Count the number of phases
        if (!scs.phases.count) {
            Object.defineProperty(scs.phases, "count", {
                get: () => {
                    return scs.phases.names.length;
                }
            });
        };

        const buttons = document.querySelectorAll(".phase-button"); // gets an array of the three buttons
        const aboutTime = game.modules.get("about-time")?.active; // Is About Time active?

        function pullValues() {
            scs.currentPhase = game.settings.get(scs.ID, "currentPhase"); // counts the current phase
            scs.currentRound = game.combat ? game.combat.round : game.settings.get(scs.ID, "currentRound"); // get the current round
        };

        Hooks.on("renderscsApp", () => {
            pullValues();
            updateApp();
        });

        // Update for players
        Hooks.on("updateSetting", setting => {
            if ((setting.data.key === "scs.currentPhase" || setting.data.key === "scs.currentRound") && !game.user.isGM) {
                pullValues();
                updateApp();
            };
        });

        // Reset when a new combat is created
        Hooks.on("createCombat", () => { pullValues(); updateApp(); });

        // If GM, execute one of the functions below this, depending on the button clicked
        if (game.user.isGM) {
            html.find("#lastRound").on("click", () => { lastRound() });
            html.find("#lastPhase").on("click", () => { lastPhase() });
            html.find("#nextPhase").on("click", () => { nextPhase() });
            html.find("#nextRound").on("click", () => { nextRound() });
        };

        // Return to the last round
        function lastRound() {
            pullValues();
            if (scs.currentRound > 0) scs.currentRound -= 1;
            scs.currentPhase = scs.phases.count;
            if (aboutTime) game.Gametime.advanceClock(-game.settings.get("about-time", "seconds-per-round"));
            game.combat?.previousRound();
            updateApp();
        };

        // Return to the last phase
        function lastPhase() {
            pullValues();
            scs.currentPhase -= 1;
            updateApp();
        };

        // Advance to the next phase
        function nextPhase() {
            pullValues();
            scs.currentPhase += 1;
            updateApp();
        };

        // Advance to the next round
        function nextRound() {
            pullValues();
            scs.currentRound += 1;
            scs.currentPhase = 1;
            if (aboutTime) game.Gametime.advanceClock(game.settings.get("about-time", "seconds-per-round"));
            game.combat?.nextRound();
            updateApp();
        };

        // Updates the app to display the correct state
        function updateApp() {
            // Change rounds if limit phases is enabled
            if (game.settings.get(scs.ID, "limitPhases")) {
                if (scs.currentPhase === scs.phases.count + 1) { nextRound() }
                else if (scs.currentPhase === 0) { lastRound() };
            } else {
                if (scs.currentPhase === scs.phases.count + 1) { scs.currentPhase = 1 };
                if (scs.currentPhase === 0) { scs.currentPhase = scs.phases.count };
            };

            // Correct phase if it excedes new limit
            if (scs.currentPhase > scs.phases.count) { scs.currentPhase = scs.phases.count }

            // Update the appearance of the buttons depending on the user's settings
            if (!game.settings.get(scs.ID, "alternateChecked")) { // Checked is darker
                buttons.forEach(current => { current.classList.remove("checked") });
                buttons[scs.currentPhase - 1].classList.add("checked");
            } else { // Checked is lighter
                buttons.forEach(current => { current.classList.add("checked") });
                buttons[scs.currentPhase - 1].classList.remove("checked");
            };

            // Update the Round number
            document.querySelector("#currentRound").innerHTML = [game.i18n.localize("COMBAT.Round"), scs.currentRound].join(" ");

            // Save new values if GM
            if (game.user.isGM) {
                game.settings.set(scs.ID, "currentPhase", scs.currentPhase);
                game.settings.set(scs.ID, "currentRound", scs.currentRound);
            };

            // Alert if core round doesn't match module after some time (checks if there is a core combat first and if one wasn't just created)
            setTimeout(() => { if (game.combat && game.combat?.round !== 0 && game.combat?.round != scs.currentRound) ui.notifications.error("SCS | Current round doesn't match Core") }, 100);
        };
    };

    // Manage about time realtime clock
    static clock() {

        // Integration with About Time
        if (game.modules.get("about-time")?.active) {

            // If a combatant is being added, there must be a combat
            Hooks.on("createCombatant", () => {

                // Check that the user wants to use this feature, that the clock is running, and that we aren't already in another combat
                if (
                    game.settings.get(scs.ID, "stopRealtime")
                    && game.Gametime.isRunning()
                    && scs.inCombat === false
                ) {

                    scs.inCombat = true; // Now we are in a combat
                    let clockStopped = false;

                    // Prompt for what to do
                    let d = new Dialog({
                        title: "SCS | Pause About Time?",
                        content: "<p>You have started a combat and have About Time enabled, would you like to pause tracking time in realtime for the duration?</p>",
                        buttons: {
                            yes: {
                                icon: "<i class='fas fa-check'></i>",
                                label: "Yes",
                                callback: () => {
                                    game.Gametime.stopRunning(); // Stop time
                                    clockStopped = true; // So that we can restart it
                                }
                            },
                            no: {
                                icon: "<i class='fas fa-times'></i>",
                                label: "No"
                            },
                            never: {
                                icon: "<i class='fas fa-skull'></i>",
                                label: "Never",
                                callback: () => game.settings.set(scs.ID, "stopRealtime", false) // This Dialog won't appear anymore
                            }
                        },
                        default: "yes",
                    });
                    d.render(true);

                    // Resume counting time once the combat has no particpants
                    Hooks.on("deleteCombatant", () => {
                        if (game.combat?.turns.length) {
                            scs.inCombat = false; // We aren't in combat
                            if (clockStopped) game.Gametime.startRunning(); // Restart the clock
                        };
                    });
                };
            });
        };
    };

    // Lock users to only certain actions depending on the phase
    static actionLocking() {

        // Check if enabled
        if (game.settings.get(scs.ID, "actionLocking")) {

            // Wrap Item Roll for Action Locking
            libWrapper.register(scs.ID, "CONFIG.Item.documentClass.prototype.roll", function (wrapped, ...args) {

                let thisPhase = scs.phases.names[scs.currentPhase - 1];
                // Don't change anything if this is not a known phase and notify user
                if (!["Move", "Attacks", "Spells"].includes(thisPhase)) {
                    ui.notifications.notify("SCS | There is no action locking available for this phase yet. Feel free to drop by <a href='https://discord.gg/AAkZWWqVav'>my discord server</a> to make a suggestion");
                    return wrapped(...args);
                };

                // Manage action locking
                if (thisPhase === "Move" && (this.data.type === "spell" || this.hasAttack)) {
                    // If it is currently the move phase and this is a spell or an attack, alert user and do nothing
                    ui.notifications.error("SCS | It's currently the move phase, so you cannot cast spells or attack");
                    return;
                } else if (thisPhase === "Attacks" && !this.hasAttack) {
                    // If it is currently the attack phase and this is not an attack, alert user and do nothing
                    ui.notifications.error("SCS | It's currently the attack phase, so you can only attack");
                    return;
                } else if (thisPhase === "Spells" && (this.data.type !== "spell" || this.hasAttack)) {
                    // If it is currently the spells phase and this is not a spell or this has an attack, alert user and do nothing
                    ui.notifications.error("SCS | It's currently the spells phase, so you can only cast non-attacking spells");
                    return;
                } else {
                    // If not one of the cases above, allow action
                    return wrapped(...args);
                };
            });
        };
    };
};
