// Import public API
import { } from './api.js';

// Import application
import scsApp from './app.js'

// Import for registering module settings
import registerSettings from './settings.js';

Hooks.on("ready", () => {

    // Register settings
    registerSettings();

    // Initialize API
    new scs();

    // Hide default combat tracker
    if (!game.settings.get(scsApp.ID, "showTracker")) scs.hideTracker();

    // Move the app up if SmallTime is active
    if (game.modules.get("smalltime")?.active) { scsApp.pinOffset += 67 };

    // Render the app
    new scsApp().render(true);

    // Manage Action Locking
    scsApp.actionLocking();

    // Show the IntroJS tutorial once the app is rendered if the user hasn't denied the tutorial
    Hooks.once("renderscsApp", () => {
        if (game.settings.get(scsApp.ID, "startupTutorial")) scs.startTutorial();
    });
});
