let pinOffset = 100;

// Hide combat tab from sidebar
Hooks.on("renderSidebar", () => {
    if (!game.settings.get("scs", "showTracker")) {
        document.querySelectorAll("[data-tab='combat']").forEach(element => element.style.display = "none");
        document.querySelector("#sidebar-tabs").style.justifyContent = "space-between";
        Hooks.on("collapseSidebar", (_sidebar, collapsed) => { collapsed ? document.querySelector("#sidebar[class*='collapsed']").style.height = "min-content" : null; });
    };
});

Hooks.on("init", () => {

    game.settings.register('scs', 'position', {
        name: 'Position',
        scope: 'client',
        config: false,
        type: Object,
        default: { top: 446, left: 15 }
    });

     game.settings.register('scs', 'pinned', {
        name: 'Pinned',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true
    });

    game.settings.register('scs', 'phase', {
        name: 'Phase',
        scope: 'world',
        config: false,
        type: Number,
        default: 0
    });

    game.settings.register('scs', 'round', {
        name: 'Round',
        scope: 'world',
        config: false,
        type: Number,
        default: 1
    });

    game.settings.register('scs', 'stopRealtime', {
        name: "stopRealtime",
        scope: 'world',
        config: false,
        type: Boolean,
        default: true,
    });

    game.settings.register('scs', 'showTracker', {
        name: game.i18n.localize("scs.settings.showTracker.Name"),
        hint: game.i18n.localize("scs.settings.showTracker.Hint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
        onChange: debounce(() => window.location.reload(), 100)
    });

    game.settings.register('scs', 'phaseOne', {
        name: game.i18n.localize("scs.settings.phaseOne.Name"),
        hint: game.i18n.localize("scs.settings.phaseOne.Hint"),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize("scs.phases.one"),
        onchange: () => { new scsApp().render(true); }
    });

    game.settings.register('scs', 'phaseTwo', {
        name: game.i18n.localize("scs.settings.phaseTwo.Name"),
        hint: game.i18n.localize("scs.settings.phaseTwo.Hint"),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize("scs.phases.two"),
        onchange: () => { new scsApp().render(true); }
    });

    game.settings.register('scs', 'phaseThree', {
        name: game.i18n.localize("scs.settings.phaseThree.Name"),
        hint: game.i18n.localize("scs.settings.phaseThree.Hint"),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize("scs.phases.three"),
        onchange: () => { new scsApp().render(true); }
    });

    game.settings.register('scs', 'limitPhases', {
        name: game.i18n.localize("scs.settings.limitPhases.Name"),
        hint: game.i18n.localize("scs.settings.limitPhases.Hint"),
        scope: 'world',
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register('scs', 'startupTutorial', {
        name: game.i18n.localize("scs.settings.startupTutorial.Name"),
        hint: game.i18n.localize("scs.settings.startupTutorial.Hint"),
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
    });
});

Hooks.once('ready', async function () {
    if (game.modules.get("smalltime")?.active) { pinOffset += 67 };

    new scsApp().render(true);
});

class scsApp extends FormApplication {
    // Override close() to prevent Escape presses from closing the scs app.
    async close(options = {}) {
        // If called by scs, use original method to handle app closure.
        if (options.scs || options.smallTime) return super.close();

        // Case 1: Close other open UI windows.
        if (Object.keys(ui.windows).length > 1) {
            Object.values(ui.windows).forEach((app) => {
                if (app.title === 'Simultaneous Combat System' || app.title === 'SmallTime') return;
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

        const pinned = game.settings.get('scs', 'pinned');

        const playerApp = document.getElementById('players');
        const playerAppPos = playerApp.getBoundingClientRect();

        this.initialPosition = game.settings.get('scs', 'position');

        // The actual pin location is set elsewhere, but we need to insert something
        // manually here to feed it values for the initial render.
        if (pinned) {
            var playerOffset = !game.user.isGM ? 36 : 12;
            this.initialPosition.top = playerAppPos.top - pinOffset + playerOffset;
            this.initialPosition.left = playerAppPos.left;
        }

        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            submitOnChange: true,
            closeOnSubmit: false,
            template: 'modules/scs/templates/template.hbs',
            id: 'scs-app',
            title: 'Simultaneous Combat System',
            top: this.initialPosition.top,
            left: this.initialPosition.left
        });
    };

    activateListeners(html) {
        super.activateListeners(html);

        const drag = new Draggable(this, html, document.getElementById("currentRound"), false);

        // Hide buttons for players and re-adjust app size
        if (!game.user.isGM) {
            html.find("nav.flexrow.arrows").hide();
            document.querySelector("#scs-app").style.setProperty('--scsHeight', '50px');
            pinOffset -= 25;
        };

        scsApp.tutorial();

        scsApp.display(html);

        scsApp.combat()

        // Inject phase names
        html.find(".phase-button.one")[0].innerText = game.settings.get("scs", "phaseOne");
        html.find(".phase-button.two")[0].innerText = game.settings.get("scs", "phaseTwo");
        html.find(".phase-button.three")[0].innerText = game.settings.get("scs", "phaseThree");
        console.log(html)

        // Pin zone is the "jiggle area" in which the app will be locked
        // to a pinned position if dropped. pinZone stores whether or not
        // we're currently in that area.
        let pinZone = false;

        // Have to override this because of the non-standard drag handle, and
        // also to manage the pin lock zone and animation effects.
        drag._onDragMouseMove = function _newOnDragMouseMove(event) {
            event.preventDefault();

            const playerApp = document.getElementById('players');
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
            if (game.settings.get('scs', 'pinned')) {
                conditionalOffset = 20;
            }

            this.app.setPosition({
                left: this.position.left + (event.clientX - this._initial.x),
                top: this.position.top + (event.clientY - this._initial.y - conditionalOffset),
            });

            // Defining a region above the PlayerList that will trigger the jiggle.
            let playerAppUpperBound = playerAppPos.top - pinOffset;
            let playerAppLowerBound = playerAppPos.top + pinOffset;

            if (
                event.clientX < 215 &&
                event.clientY > playerAppUpperBound &&
                event.clientY < playerAppLowerBound
            ) {
                $('#scs-app').css('animation', 'jiggle 0.2s infinite');
                pinZone = true;
            } else {
                $('#scs-app').css('animation', '');
                pinZone = false;
            }
        };

        drag._onDragMouseUp = async function _newOnDragMouseUp(event) {
            event.preventDefault();

            window.removeEventListener(...this.handlers.dragMove);
            window.removeEventListener(...this.handlers.dragUp);

            const playerApp = document.getElementById('players');
            const playerAppPos = playerApp.getBoundingClientRect();
            let myOffset = playerAppPos.height + pinOffset;

            // If the mouseup happens inside the Pin zone, pin the app.
            if (pinZone) {
                scsApp.pinApp(true);
                await game.settings.set('scs', 'pinned', true);
                this.app.setPosition({
                    left: 15,
                    top: window.innerHeight - myOffset,
                });
            } else {
                let windowPos = $('#scs-app').position();
                let newPos = { top: windowPos.top, left: windowPos.left };
                await game.settings.set('scs', 'position', newPos);
                await game.settings.set('scs', 'pinned', false);
            }

            // Kill the jiggle animation on mouseUp.
            $('#scs-app').css('animation', '');
        };
    };

    // Pin the app above the Players list.
    static async pinApp(_expanded) {
        // Only do this if a pin lock isn't already in place.
        if (!$('#pin-lock').length) {
            const playerApp = document.getElementById('players');
            const playerAppPos = playerApp.getBoundingClientRect();
            let myOffset = playerAppPos.height + pinOffset;

            // Dropping this into the DOM with an !important was the only way
            // I could get it to enable the locking behaviour.
            $('body').append(`
        <style id="pin-lock">
          #scs-app {
            top: calc(100vh - ${myOffset}px) !important;
            left: 15px !important;
          }
        </style>
      `);
            await game.settings.set('scs', 'pinned', true);
        }
    }

    // Un-pin the app.
    static unPinApp() {
        // Remove the style tag that's pinning the window.
        $('#pin-lock').remove();
    }

    // Manage phase and round diplay
    static display(html) {
        const buttons = document.querySelectorAll(".phase-button"); // gets an array of the three buttons
        const aboutTime = game.modules.get("about-time")?.active;
        var phase, round;

        function pullValues() {
            phase = game.settings.get("scs", "phase"); // counts the current phase
            round = game.settings.get("scs", "round"); // counts the current round
        };
        Hooks.on("renderscsApp", () => {
            pullValues();
            updateApp();
        });
        Hooks.on("updateSetting", setting => { setting.data.key === "scs.phase" ? pullValues() : null });

        // Execute one of the functions below this, depending on the button clicked
        html.find('#lastRound').on('click', () => { lastRound() });
        html.find('#lastPhase').on('click', () => { lastPhase() });
        html.find('#nextPhase').on('click', () => { nextPhase() });
        html.find('#nextRound').on('click', () => { nextRound() });

        // Return to the last round
        function lastRound() {
            pullValues();
            round -= 1;
            phase = 2;
            if (aboutTime) game.Gametime.advanceClock(-game.settings.get("about-time", "seconds-per-round"));
            updateApp();
        };

        // Return to the last phase
        function lastPhase() {
            pullValues();
            phase -= 1;
            updateApp();
        };

        // Advance to the next phase
        function nextPhase() {
            pullValues();
            phase += 1;
            updateApp();
        };

        // Advance to the next round
        function nextRound() {
            pullValues();
            round += 1;
            phase = 0;
            if (aboutTime) game.Gametime.advanceClock(game.settings.get("about-time", "seconds-per-round"));
            updateApp();
        };

        /**
         * Updates the app to display the correct state
         */
        function updateApp() {
            // Change rounds if limit phases is enabled
            if (game.settings.get("scs", "limitPhases")) {
                if (phase === 3) { nextRound() }
                else if (phase === -1) { lastRound() };
            } else {
                if (phase === 3) { phase = 0 };
                if (phase === -1) { phase = 2 };
            };

            // Update the appearance of the buttons
            buttons.forEach(current => { current.classList.remove("checked") });
            buttons[phase].classList.add("checked");

            // Update the Round number
            document.querySelector("#currentRound").innerHTML = [game.i18n.localize("COMBAT.Round"), round].join(" ");

            // Save new values
            game.settings.set("scs", "phase", phase);
            game.settings.set("scs", "round", round);
        };
    };

    // Manage combat
    static combat() {
        // Integration with About Time
        const aboutTime = game.modules.get("about-time")?.active;
        if (aboutTime && game.settings.get("scs", "stopRealtime")) {
            Hooks.on("createCombatant", () => {
                let d = new Dialog({
                    title: "Slow down time?",
                    content: "<p>You have started a combat and have About Time enabled, would you like to pause tracking time in realtime for the duration?</p>",
                    buttons: {
                        yes: {
                            icon: '<i class="fas fa-check"></i>',
                            label: "Yes",
                            callback: () => game.Gametime.stopRunning()
                        },
                        no: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "No"
                        },
                        never: {
                            icon: '<i class="fas fa-skull"></i>',
                            label: "Never",
                            callback: () => game.settings.set("scs", "stopRealtime", false)
                        }
                    },
                    default: "yes",
                });
                d.render(true);
            });
        };
 
        Hooks.on("deleteCombatant", () => {
            if (game.combat?.turns.length && aboutTime) game.Gametime.startRunning();
        });
    };

    // IntroJS tutorial
    static tutorial() {
        introJs().setOptions({
            steps: [{
                title: 'Welcome to SCS',
                intro: 'This module is an implementation of the Simultaneous Combat System described in <a href="https://redd.it/nlyif8">this reddit post</a><br/>Don\'t show this tutorial again.'
            },
            {
                title: "How it works",
                intro: `Instead of each character taking their own turn sequentially, everything happens all at once. In order to prevent total chaos, combat still happens in rounds and there is a structure to each round. That is, they are divided into three phases: ${"TODO movement, attacks, and spells"}.`
            },
            {
                title: "Where is the Combat Tracker?",
                element: document.getElementById("sidebar-tabs"),
                intro: "Since combat happens simultaneously with this system, I've disabled the combat tracker. You can always renable it in the module's settings."
            },
            {
                title: "How do I move this thing around?",
                element: document.getElementById("currentRound"),
                intro: "You can drag the app around by clicking and holding this text. It snaps to the bottom left corner, but will remember it's position wherever you choose to put it."
            }]
        }).start();
    }
};
