let scs_PinOffset = 125;

// remove combat tab from sidebar
Hooks.on("renderSidebar", app => {
    delete app.tabs.combat
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
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            submitOnChange: true,
            closeOnSubmit: false,
            template: 'modules/scs/templates/template.html',
            id: 'scs-app',
            title: 'Simultaneous Combat System'
        });
    }

    async _updateObject(event, formData) {
        console.log("update")
    }

    activateListeners(html) {
        super.activateListeners(html);

        const drag = new Draggable(this, html, draggable, false);

        html.find('#lastRound').on('click', () => {
            changeRound(-1);
        });

        html.find('#lastPhase').on('click', () => {
            changePhase(-1);
        });

        html.find('#nextPhase').on('click', () => {
            changePhase(1);
        });

        html.find('#nextRound').on('click', () => {
            changeRound(1);
        });

        var buttons = document.querySelectorAll(".phase-button");
        var phase = 0;
        var round = 1;

        function changePhase(delta) {
            phase += delta;
            if (phase === 3) {
                changeRound(1);
            } else if (phase === -1) {
                phase = 3;
                changeRound(-1);
            };
            updateDisplay();
        };

        function changeRound(delta) {
            phase = 0;
            round += delta;
            document.querySelector("#currentRound").innerHTML = "Round " + round;
            updateDisplay();
        };

        function updateDisplay() {
            buttons.forEach(current => { current.classList.remove("checked") });
            buttons[phase].classList.toggle("checked");
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
            let playerAppUpperBound = playerAppPos.top - 50;
            let playerAppLowerBound = playerAppPos.top + 50;

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
            let myOffset = playerAppPos.height + scs_PinOffset;

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
            let myOffset = playerAppPos.height + scs_PinOffset;

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
