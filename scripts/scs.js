// Import public API
import api from './api.js';

// Import application
import scsApp from './app.js'

// Import for registering module settings
import registerSettings from './settings.js';

// Import Attack Roll Token HUD
import AttackHUD from './hud.js';

Hooks.on("ready", () => {
    // Register settings
    registerSettings();

    // Initialize API
    new api();

    // Hide default combat tracker
    if (game.settings.get(scsApp.ID, "hideTracker")) api.defaultTracker();

    // Move the app up if SmallTime is active
    if (game.modules.get("smalltime")?.active) { scsApp.pinOffset += 67 };

    // Hide Argon's "End Turn" button
    Hooks.on("renderCombatHudCanvasElement", (_app, html) => html[0].querySelector("[data-title='Pass']").style.display = "none");

    // Initialize phase names
    scsApp.initPhaseNames();

    // If not already done, define a property to count the number of phases, but disallow change
    if (!scsApp.phases.count) {
        Object.defineProperty(scsApp.phases, "count", {
            get: () => scsApp.phases.names.length,
            set: () => { throw "SCS | The phase count is calculated from the phase names and cannot be changed directly." },
            configurable: false
        });
    };

    // Render the app
    new scsApp().render(true);

    // Manage Action Locking
    scsApp.actionLocking();

    // Prevent any combat turns (requires v9d2 or later)
    if (isNewerVersion(game.version, "9.230")) {
        game.combat?.update({ turn: null });
        Hooks.on("preUpdateCombat", (_document, change) => { change.turn = null });
    };

    // Show the IntroJS tutorial once the app is rendered if the user hasn't denied the tutorial
    Hooks.once("renderscsApp", () => {
        if (game.modules.get("_introjs")?.active) {
            if (game.settings.get(scsApp.ID, "startupTutorial")) api.startTutorial();
        } else {
            ui.notifications.warn("You must install and enable the IntroJS library to view the SCS tutorial");
        };
    });

    // Start action tracker
    new AttackHUD();
});
