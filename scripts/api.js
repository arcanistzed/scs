/**
 * Provides a public API
 */
export default class scs {
    static ID = "scs";
    static phases = {
        "names": [],
        "colors": []
    };
    static currentPhase = 1;
    static currentRound = 1;
    static inCombat = false;

    // Hide default combat tracker
    static hideTracker() {
        document.querySelector("[data-tab='combat']").style.display = "none";
        document.querySelector("#sidebar-tabs").style.justifyContent = "space-between";
        Hooks.on("collapseSidebar", (_sidebar, collapsed) => {
            if (collapsed) document.querySelector("#sidebar").style.height = "min-content";
        });
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
                intro: `${game.i18n.localize("scs.tutorial.howItWorks.Intro")}<ul>${scs.phases.names.map(name => `<li>${name}</li>`).join("")}</ul>`
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
        stopButton.innerHTML = `<input id="scsTutorialAgain" type="checkbox" onchange="scs.stopTutorial()"><label for="scsTutorialAgain">Don't show again</label>`;
        document.querySelector(".introjs-tooltipbuttons").before(stopButton);
    };

    // Don't show IntroJS tutorial again
    static stopTutorial() {
        game.settings.set(scs.ID, "startupTutorial", false); // Don't show again
        // document.querySelector(".introjs-skipbutton").click(); // End tutorial
    };
};

// Add API to the global scope
globalThis.scs = scs;
