// Register settings asynchronously when ready
Hooks.on("ready", async () => {
    game.settings.register(scsApp.ID, "position", {
        scope: "client",
        config: false,
        type: Object,
        default: { top: 446, left: 15 }
    });

    game.settings.register(scsApp.ID, "pinned", {
        scope: "client",
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register(scsApp.ID, "currentPhase", {
        scope: "world",
        config: false,
        type: Number,
        default: 0
    });

    game.settings.register(scsApp.ID, "currentRound", {
        scope: "world",
        config: false,
        type: Number,
        default: 1
    });

    game.settings.register(scsApp.ID, "stopRealtime", {
        scope: "world",
        config: false,
        type: Boolean,
        default: true,
    });

    game.settings.register(scsApp.ID, "showTracker", {
        name: game.i18n.localize("scs.settings.showTracker.Name"),
        hint: game.i18n.localize("scs.settings.showTracker.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => { game.setupGame(); }
    });

    game.settings.register(scsApp.ID, "limitPhases", {
        name: game.i18n.localize("scs.settings.limitPhases.Name"),
        hint: game.i18n.localize("scs.settings.limitPhases.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(scsApp.ID, "alternateChecked", {
        name: game.i18n.localize("scs.settings.alternateChecked.Name"),
        hint: game.i18n.localize("scs.settings.alternateChecked.Hint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(scsApp.ID, "startupTutorial", {
        name: game.i18n.localize("scs.settings.startupTutorial.Name"),
        hint: game.i18n.localize("scs.settings.startupTutorial.Hint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => { if (!document.getElementById("scsTutorialAgain")) new scsApp().render(true); } // Re-render the app
    });

    game.settings.register(scsApp.ID, "color", {
        scope: "world",
        config: false,
        type: Object
    });

    game.settings.registerMenu(scsApp.ID, "generateColors", {
        name: game.i18n.localize("scs.settings.generateColors.Name"),
        label: game.i18n.localize("scs.settings.generateColors.Label"),
        hint: game.i18n.localize("scs.settings.generateColors.Hint"),
        icon: "fas fa-rainbow",
        type: GenerateColors,
        restricted: true
    });

    await game.settings.register(scsApp.ID, "phases", {
        name: game.i18n.localize("scs.settings.phaseNames.Name"),
        hint: game.i18n.localize("scs.settings.phaseNames.Hint"),
        scope: "world",
        config: true,
        type: String,
        default: (() => game.i18n.localize("scs.settings.phaseNames.defaults").join(", "))(),
        onChange: () => {
            // Reset colors
            game.settings.set(scsApp.ID, "color", []);
            scsApp.phases.colors = [];
            new scsApp().render(true); // Re-render the app
        }
    });

    // Render the app
    if (game.modules.get("smalltime")?.active) { scsApp.pinOffset += 67 }; // Move the app up if SmallTime is active
    new scsApp().render(true);
});
class scsApp extends FormApplication {
    static ID = "scs";
    static pinOffset = 100;
    static phases = {
        "names": [],
        "colors": []
    };
    static currentPhase = 1;
    static currentRound = 1;
    static inCombat = false;

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
        const pinned = game.settings.get(scsApp.ID, "pinned");

        const playerApp = document.getElementById("players");
        const playerAppPos = playerApp.getBoundingClientRect();

        this.initialPosition = game.settings.get(scsApp.ID, "position");

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

        // Make the app draggable
        const drag = new Draggable(this, html, document.querySelector("#scsApp #currentRound"), false);

        // Application startup
        scsApp.initPhaseNames(game.settings.get(scsApp.ID, "phases"));
        scsApp.generateColors();
        scsApp.addPhases();
        scsApp.hideTracker();
        scsApp.hideFromPlayers();
        scsApp.display(html);
        scsApp.combat()

        // If the user hasn't denied the tutorial or it has already rendered, show it once after this app is rendered
        if (game.settings.get(scsApp.ID, "startupTutorial") && !document.getElementById("scsTutorialAgain")) {
            Hooks.once("renderscsApp", () => { scsApp.startTutorial() })
        };

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

            scsApp.unPinApp();

            // Follow the mouse.
            // TODO: Figure out how to account for changes to the viewport size
            // between drags.
            let conditionalOffset = 0;
            if (game.settings.get(scsApp.ID, "pinned")) {
                conditionalOffset = 20;
            }

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
                await game.settings.set(scsApp.ID, "pinned", true);
                this.app.setPosition({
                    left: 15,
                    top: window.innerHeight - myOffset,
                });
            } else {
                let windowPos = $("#scsApp").position();
                let newPos = { top: windowPos.top, left: windowPos.left };
                await game.settings.set(scsApp.ID, "position", newPos);
                await game.settings.set(scsApp.ID, "pinned", false);
            }

            // Kill the jiggle animation on mouseUp.
            $("#scsApp").css("animation", "");
        };
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
            await game.settings.set(scsApp.ID, "pinned", true);
        }
    };

    // Un-pin the app.
    static unPinApp() {
        // Remove the style tag that"s pinning the window.
        $("#pin-lock").remove();
    };

    // Initialize phase names
    static initPhaseNames(settings) {
        // Check if the user reset to default phase names
        if (settings === "undefined") {
            // If so, set to the default phases
            scsApp.phases.names = game.i18n.localize("scs.settings.phaseNames.defaults");
        } else {
            // If not, parse and use the first 50 new values from settings
            scsApp.phases.names = settings.split(",").slice(0, 50).map(val => val.trim());
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
        if (scsApp.lastHue) validHues = scsApp.allAllowedHues(base).filter(h => Math.abs(scsApp.lastHue - h) >= 25);

        // Pick the a random hue from the valid hues
        let chosenHue = validHues[Math.floor(Math.random() * validHues.length)];

        // Set lastHue to the chosen hue for the next generation
        scsApp.lastHue = chosenHue;

        return chosenHue; // Return the chosen hue
    };

    // Generate random beautiful color gradients
    static generateColors() {

        // A hue for each phase
        scsApp.phases.names.forEach((_name, i) => {
            let hueTop, hueBottom;

            // Try and assign existing hues for this phase
            try {
                hueTop = game.settings.get(scsApp.ID, "color").map(([top]) => top)[i];
                hueBottom = game.settings.get(scsApp.ID, "color").map(([, bottom]) => bottom)[i];
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

        // Update settings for storage if GM
        if (game.user.isGM) game.settings.set(scsApp.ID, "color", scsApp.phases.colors);
    };

    // Adds the phases to the Application
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
            }`
        })
    };

    // Hide default combat tracker
    static hideTracker() {
        if (!game.settings.get(scsApp.ID, "showTracker")) {
            document.querySelector("[data-tab='combat']").style.display = "none";
            document.querySelector("#sidebar-tabs").style.justifyContent = "space-between";
            Hooks.on("collapseSidebar", (_sidebar, collapsed) => {
                if (collapsed) document.querySelector("#sidebar").style.height = "min-content";
            });
        };
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
        if (!scsApp.phases.count) {
            Object.defineProperty(scsApp.phases, "count", {
                get: () => {
                    return scsApp.phases.names.length;
                }
            });
        };

        const buttons = document.querySelectorAll(".phase-button"); // gets an array of the three buttons
        const aboutTime = game.modules.get("about-time")?.active; // Is About Time active?

        function pullValues() {
            scsApp.currentPhase = game.settings.get(scsApp.ID, "currentPhase"); // counts the current phase
            scsApp.currentRound = game.settings.get(scsApp.ID, "currentRound"); // counts the current round
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
            scsApp.currentRound -= 1;
            scsApp.currentPhase = scsApp.phases.count;
            if (aboutTime) game.Gametime.advanceClock(-game.settings.get("about-time", "seconds-per-round"));
            updateApp();
        };

        // Return to the last phase
        function lastPhase() {
            pullValues();
            scsApp.currentPhase -= 1;
            updateApp();
        };

        // Advance to the next phase
        function nextPhase() {
            pullValues();
            scsApp.currentPhase += 1;
            updateApp();
        };

        // Advance to the next round
        function nextRound() {
            pullValues();
            scsApp.currentRound += 1;
            scsApp.currentPhase = 1;
            if (aboutTime) game.Gametime.advanceClock(game.settings.get("about-time", "seconds-per-round"));
            updateApp();
        };

        // Updates the app to display the correct state
        function updateApp() {
            // Change rounds if limit phases is enabled
            if (game.settings.get(scsApp.ID, "limitPhases")) {
                if (scsApp.currentPhase === scsApp.phases.count + 1) { nextRound() }
                else if (scsApp.currentPhase === 0) { lastRound() };
            } else {
                if (scsApp.currentPhase === scsApp.phases.count + 1) { scsApp.currentPhase = 1 };
                if (scsApp.currentPhase === 0) { scsApp.currentPhase = scsApp.phases.count };
            };

            // Correct phase if it excedes new limit
            if (scsApp.currentPhase > scsApp.phases.count) { scsApp.currentPhase = scsApp.phases.count }

            // Update the appearance of the buttons depending on the user's settings
            if (!game.settings.get(scsApp.ID, "alternateChecked")) { // Checked is darker
                buttons.forEach(current => { current.classList.remove("checked") });
                buttons[scsApp.currentPhase - 1].classList.add("checked");
            } else { // Checked is lighter
                buttons.forEach(current => { current.classList.add("checked") });
                buttons[scsApp.currentPhase - 1].classList.remove("checked");
            };

            // Update the Round number
            document.querySelector("#currentRound").innerHTML = [game.i18n.localize("COMBAT.Round"), scsApp.currentRound].join(" ");

            // Save new values
            game.settings.set(scsApp.ID, "currentPhase", scsApp.currentPhase);
            game.settings.set(scsApp.ID, "currentRound", scsApp.currentRound);
        };
    };

    // Manage combat
    static combat() {
        // Integration with About Time
        if (game.modules.get("about-time")?.active) {

            // If a combatant is being added, there must be a combat
            Hooks.on("createCombatant", () => {

                // Check that the user wants to use this feature, that the clock is running, and that we aren't already in another combat
                if (game.settings.get(scsApp.ID, "stopRealtime") && game.Gametime.isRunning() && scsApp.inCombat === false) {
                    scsApp.inCombat = true; // Now we are in a combat
                    let clockStopped = false;

                    // Prompt for what to do
                    let d = new Dialog({
                        title: "SCS: Slow down time?",
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
                                callback: () => game.settings.set(scsApp.ID, "stopRealtime", false) // This Dialog won't appear anymore
                            }
                        },
                        default: "yes",
                    });
                    d.render(true);

                    // Resume counting time once the combat has no particpants
                    Hooks.on("deleteCombatant", () => {
                        if (game.combat?.turns.length) {
                            scsApp.inCombat = false; // We aren't in combat
                            if (clockStopped) game.Gametime.startRunning(); // Restart the clock
                        };
                    });
                };
            });
        };
    };

    // Start IntroJS tutorial
    static startTutorial() {
        introJs().setOptions({
            steps: [{
                title: game.i18n.localize("scs.tutorial.welcome.Title"),
                intro: `<form id="scsWelcome"><p>${game.i18n.localize("scs.tutorial.welcome.Intro")}<p></form>`
            },
            {
                title: game.i18n.localize("scs.tutorial.howItWorks.Title"),
                intro: `${game.i18n.localize("scs.tutorial.howItWorks.Intro")}<ul>${scsApp.phases.names.map(name => `<li>${name}</li>`).join("")}</ul>`
            },
            {
                title: game.i18n.localize("scs.tutorial.combatTracker.Title"),
                element: document.getElementById("sidebar-tabs"),
                intro: game.i18n.localize("scs.tutorial.combatTracker.Intro")
            },
            {
                title: game.i18n.localize("scs.tutorial.movingAround.Title"),
                element: document.querySelector("#scsApp #currentRound"),
                intro: game.i18n.localize("scs.tutorial.movingAround.Intro")
            }],
            skipLabel: '<a><i class="fas fa-times"></i></a>'
        }).start();

        // Create "Don't Show Again" checkbox
        let stopButton = document.createElement("div");
        stopButton.id = "scsTutorialAgainDiv";
        stopButton.innerHTML = `<input id="scsTutorialAgain" type="checkbox" onchange="scsApp.stopTutorial()"><label for="scsTutorialAgain">Don't show again</label>`;
        document.querySelector(".introjs-tooltipbuttons").before(stopButton);
    };

    // Don't show IntroJS tutorial again
    static stopTutorial() {
        game.settings.set(scsApp.ID, "startupTutorial", false); // Don't show again
        // document.querySelector(".introjs-skipbutton").click(); // End tutorial
    };
};

class GenerateColors extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "modules/scs/templates/color.hbs",
            id: "scsColor",
            title: "SCS: Colors",
            minimized: true
        });
    }
    async activateListeners() {
        // Unset colors
        await game.settings.set(scsApp.ID, "color", []);
        scsApp.phases.colors = [];

        // Reload the page
        location.reload();
    };
};
