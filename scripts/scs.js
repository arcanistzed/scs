// Import public API
import { } from './api.js';

// Import application for rendering
import scsApp from './app.js'

// Import for registering module settings
import registerSettings from './settings.js';


Hooks.on("ready", () => {

    // Register settings
    registerSettings();

    // Hide default combat tracker
    if (!game.settings.get(scs.ID, "showTracker")) scs.hideTracker();

    // Move the app up if SmallTime is active
    if (game.modules.get("smalltime")?.active) { scsApp.pinOffset += 67 };

    // Render the app
    new scsApp().render(true);

    // Manage Action Locking
    scsApp.actionLocking();

    // Show the IntroJS tutorial if the user hasn't denied the tutorial
    if (game.settings.get(scs.ID, "startupTutorial")) scs.startTutorial();
});
