introJs().setOptions({
    steps: [{
        title: 'Welcome to SCS',
        intro: 'This module is an implementation of the Simultaneous Combat System described in <a href="https://redd.it/nlyif8">this reddit post</a>'
    },
    {
        title: "How it works",
        intro: "Instead of each character taking their own turn sequentially, everything happens all at once. In order to prevent total chaos, combat still happens in rounds and there is a structure to each round. That is, they are divided into three phases: movement, attacks, and spells."
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
});