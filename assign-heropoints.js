import { registerSettings } from "./settings.js";
import { GMAssignApplication } from "./apps/gm-assign.js";
import { PlayerAssignApplication } from "./apps/player-assign.js";

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: assign-heropoints | ", ...args);
};
export let log = (...args) => console.log("assign-heropoints | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("assign-heropoints | ", ...args);
};
export let error = (...args) => console.error("assign-heropoints | ", ...args);
export let i18n = key => {
    return game.i18n.localize(key);
};

export let setting = key => {
    return game.settings.get("assign-heropoints", key);
};

export class AssignHeroPoints {
    static app = null;

    static async init() {
        log("initializing");

        AssignHeroPoints.SOCKET = "module.assign-heropoints";

        // init socket
        game.socket.on(AssignHeroPoints.SOCKET, AssignHeroPoints.onMessage);
    }

    static async setup() {
        registerSettings();
    }

    static async ready() {
        if (setting("showing")) {
            AssignHeroPoints.showApp();
        }
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id;
        game.socket.emit(AssignHeroPoints.SOCKET, args, (resp) => { });
        AssignHeroPoints.onMessage(args);
    }

    static onMessage(data) {
        AssignHeroPoints[data.action].call(AssignHeroPoints, data);
    }

    static async assignPoints() {
        if (AssignHeroPoints.app == null && !setting("showing")) {
            await game.settings.set("assign-heropoints", "showing", true);
            await game.settings.set("assign-heropoints", "responses", {});
            await game.settings.set("assign-heropoints", "responded", {});
        }
        AssignHeroPoints.emit("showApp");
    }

    static async showApp() {
        if (AssignHeroPoints.app == null)
            AssignHeroPoints.app = game.user.isGM ? new GMAssignApplication().render(true) : new PlayerAssignApplication().render(true);
        else
            AssignHeroPoints.app.render(true);

        if (!game.user.isGM)
            ui.players.render();
    }

    static async closeApp() {
        if (AssignHeroPoints.app != null && AssignHeroPoints.app.rendered) {
            AssignHeroPoints.app.close({ ignore: true }).then(() => {
                AssignHeroPoints.app = null;
            });
        } else
            AssignHeroPoints.app = null;

        if (!game.user.isGM)
            ui.players.render();
    }

    static async updatePlayerQuestions(data) {
        if (game.user.isGM) {
            let userId = data.userId;
            let responses = setting("responses");

            let response = mergeObject(responses[userId] || {}, data.response);
            responses[userId] = response;
            await game.settings.set("assign-heropoints", "responses", responses);

            if (data.responded !== undefined) {
                let responded = setting("responded");
                responded[userId] = true;
                await game.settings.set("assign-heropoints", "responded", responded);

                if (AssignHeroPoints.app)
                    AssignHeroPoints.app.responded(userId);
            } 
            if (data.from === "player" && AssignHeroPoints.app) {
                AssignHeroPoints.app.refresh(data.userId, data.response);
            }
        } else if (data.userId === game.user.id && AssignHeroPoints.app) {
            AssignHeroPoints.app.refresh(data.questionId, data.value);
        }
    }

    static refreshPlayerUI() {
        ui.players.render();
    }
}

Hooks.once('init', AssignHeroPoints.init);
Hooks.once('setup', AssignHeroPoints.setup);
Hooks.once('ready', AssignHeroPoints.ready);

Hooks.on('renderPlayerList', async (playerList, html, data) => {
    if (AssignHeroPoints.app && AssignHeroPoints.app.rendered) {
        AssignHeroPoints.app.render(true);
    }

    if (game.user.isGM || (!game.user.isGM && setting("showing"))) {
        $('<h3>').addClass('assignhp-button')
            .append(`<div><i class="fas fa-circle-h"></i> ${i18n("AssignHeroPoint.HeroPoints")}</div>`)
            .insertAfter($('h3:last', html))
            .click(game.user.isGM ? AssignHeroPoints.assignPoints.bind() : AssignHeroPoints.showApp.bind());
    }
});