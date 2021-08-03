// Import application
import scsApp from './app.js'

/**
 * Manages color generation button in module settings menu
 */
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

        // Unset colors if GM
        if (game.user.isGM) {
            await game.settings.set(scsApp.ID, "colors", []);
            scsApp.phases.colors = [];
        };

        // Reload the page
        location.reload();
    };
};

/**
 * Register all settings for SCS
 */
export default function registerSettings() {
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

    game.settings.register(scsApp.ID, "actionLocking", {
        name: game.i18n.localize("scs.settings.actionLocking.Name"),
        hint: game.i18n.localize("scs.settings.actionLocking.Hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
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

    game.settings.register(scsApp.ID, "colors", {
        scope: "world",
        config: false,
        type: Object,
        onChange: () => {
            // Don't cause a reload loop for the GM
            if (!game.user.isGM) {
                // After a small wait, update the players' colors as well
                ui.notifications.notify("SCS | The page will reload shortly as your GM has begun regenerating the colors.")
                setTimeout(() => new GenerateColors().render(true), 10000);
            };
        }
    });

    game.settings.registerMenu(scsApp.ID, "generateColors", {
        name: game.i18n.localize("scs.settings.generateColors.Name"),
        label: game.i18n.localize("scs.settings.generateColors.Label"),
        hint: game.i18n.localize("scs.settings.generateColors.Hint"),
        icon: "fas fa-rainbow",
        type: GenerateColors,
        restricted: true
    });

    game.settings.register(scsApp.ID, "names", {
        name: game.i18n.localize("scs.settings.phaseNames.Name"),
        hint: game.i18n.localize("scs.settings.phaseNames.Hint"),
        scope: "world",
        config: true,
        type: String,
        default: (() => game.i18n.localize("scs.settings.phaseNames.defaults").join(", "))(),
        onChange: () => {
            // Reset colors if GM
            if (game.user.isGM) {
                game.settings.set(scsApp.ID, "colors", []);
                scsApp.phases.colors = [];
            };
            new scsApp().render(true); // Re-render the app
        }
    });
};