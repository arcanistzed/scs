let pinOffset = 100;

// remove combat tab from sidebar
Hooks.on("renderSidebar", app => {
    document.querySelectorAll("[data-tab='combat']").forEach(element => element.remove());
    document.querySelector("#sidebar-tabs").style.justifyContent = "space-between";
});

Hooks.on("init", () => {
    game.settings.register('scs', 'position', {
        name: 'Position',
        scope: 'client',
        config: false,
        type: Object,
        default: { top: 446, left: 15 },
    });

    game.settings.register('scs', 'pinned', {
        name: 'Pinned',
        scope: 'client',
        config: false,
        type: Boolean,
        default: true,
    });
})

Hooks.once('ready', async function () {
    if (game.modules.get("smalltime").active) { pinOffset += 67 };

    new scsApp().render(true);
});

class scsApp extends FormApplication {
    // Override close() to prevent Escape presses from closing the scs app.
    async close(options = {}) {
        // If called by scs, use original method to handle app closure.
        if (options.scs) return super.close();

        // Case 1: Close other open UI windows.
        if (Object.keys(ui.windows).length > 1) {
            Object.values(ui.windows).forEach((app) => {
                if (app.title === 'Simultaneous Combat System') return;
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
    }

    static get defaultOptions() {

        const pinned = game.settings.get('scs', 'pinned');

        const playerApp = document.getElementById('players');
        const playerAppPos = playerApp.getBoundingClientRect();

        this.initialPosition = game.settings.get('scs', 'position');

        // The actual pin location is set elsewhere, but we need to insert something
        // manually here to feed it values for the initial render.
        if (pinned) {
            this.initialPosition.top = playerAppPos.top - pinOffset + 12;
            this.initialPosition.left = playerAppPos.left;
        }

        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            submitOnChange: true,
            closeOnSubmit: false,
            template: 'modules/scs/templates/template.html',
            id: 'scs-app',
            title: 'Simultaneous Combat System',
            top: this.initialPosition.top,
            left: this.initialPosition.left
        });
    }

    async _updateObject(event, formData) {
        console.log("update")
    }

    activateListeners(html) {
        super.activateListeners(html);

        const drag = new Draggable(this, html, draggable, false);

        var buttons = document.querySelectorAll(".phase-button"); // gets an array of the three buttons
        var phase = 0; // counts the current phase
        var round = 1; // counts the current round

        // Execute one of the functions below this, depending on the button clicked
        html.find('#lastRound').on('click', () => { lastRound() });
        html.find('#lastPhase').on('click', () => { lastPhase() });
        html.find('#nextPhase').on('click', () => { nextPhase() });
        html.find('#nextRound').on('click', () => { nextRound() });

        // Return to the last round
        function lastRound() {
            round -= 1;
            phase = 2;
            updateDisplay();
            console.log("hi")
        };

        // Return to the last phase
        function lastPhase() {
            phase -= 1;
            updateDisplay();
            console.log("ho")
        };

        // Advance to the next phase
        function nextPhase() {
            phase += 1;
            updateDisplay();
        };

        // Advance to the next round
        function nextRound() {
            round += 1;
            phase = 0;
            updateDisplay();
        };

        /**
         * Updates the app to display the correct state
         */
        function updateDisplay() {
            // Change rounds
            if (phase === 3) { nextRound() }
            else if (phase === -1) { lastRound() };

            // Update the appearance of the buttons
            buttons.forEach(current => { current.classList.remove("checked") });
            buttons[phase].classList.add("checked");

            // Update the Round number
            document.querySelector("#currentRound").innerHTML = "Round " + round;
        }

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
    static async pinApp(expanded) {
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
}
