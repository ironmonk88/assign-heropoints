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
        if (game.user.isGM) {
            AssignHeroPoints.setTimer();
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

    static setTimer() {
        let remaining = setting("remaining");
        if (remaining != null) {
            let time = new Date(remaining) - Date.now();

            if (time > 0) {
                AssignHeroPoints.remainingTimer = window.setTimeout(() => {
                    // Let the GM know to assign hero points
                    ChatMessage.create({
                        content: `
<div>
<h3 class="noborder">${i18n("AssignHeroPoints.AssignHeroPoints")}</h3>
<p>${i18n("AssignHeroPoints.AssignHeroPointsMessage")}</p>
<button type="button" class="assign-heropoints-to-player">${i18n("AssignHeroPoints.AssignHeroPointsButton")}</button>
</div>
                        `,
                        whisper: ChatMessage.getWhisperRecipients("GM")
                    });
                    $('#players .assignhp-button').addClass("active");
                    window.setTimeout(() => {
                        $('#players .assignhp-button').removeClass("active");
                        game.settings.set("assign-heropoints", "remaining", null);
                        if (game.user.isGM && AssignHeroPoints.app != null)
                            AssignHeroPoints.app.render(true);
                    }, 5000);
                }, time);
            } else {
                window.clearInterval(AssignHeroPoints.remainingTimer);
                game.settings.set("assign-heropoints", "remaining", null);
            }
        } else if (AssignHeroPoints.remainingTimer) {
            window.clearInterval(AssignHeroPoints.remainingTimer);
        }
    }

    static async assignPoints() {
        if (AssignHeroPoints.app == null && !setting("showing")) {
            await game.settings.set("assign-heropoints", "responses", {});
            await game.settings.set("assign-heropoints", "responded", {});
        }

        AssignHeroPoints.showApp();
    }

    static async showApp() {
        if (AssignHeroPoints.app == null)
            AssignHeroPoints.app = game.user.isGM ? new GMAssignApplication().render(true) : new PlayerAssignApplication().render(true);
        else
            AssignHeroPoints.app.render(true);

        ui.players.render();
    }

    static async closeApp() {
        if (AssignHeroPoints.app != null && AssignHeroPoints.app.rendered && !game.user.isGM) {
            AssignHeroPoints.app.close({ ignore: true }).then(() => {
                AssignHeroPoints.app = null;
            });
        } else
            AssignHeroPoints.app = null;

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

    static async assignPointsToPlayers(event) {
        // loop through all players and assign hero points to their character
        for (let user of game.users.filter(u => !!u && u.character && u.isGM === false)) {
            let character = user.character;
            let heroPoints = getProperty(character, 'system.resources.heroPoints.value') ?? 0;
            let maxPoints = getProperty(character, 'system.resources.heroPoints.max') ?? 3;
            await character.update({ 'system.resources.heroPoints.value': Math.min(heroPoints + 1, maxPoints) });
        }

        // get the content of the message and change the button to text saying the points have been assigned
        let content = $(this.content);
        $('.assign-heropoints-to-player', content).after("<p><i>Hero Points have been assigned</i></p>");
        $('.assign-heropoints-to-player', content).remove();
        this.update({ content: content[0].outerHTML });
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
            .append(`<div><i class="fas fa-circle-h"></i> ${i18n("AssignHeroPoints.HeroPoints")}${game.user.isGM && setting("showing") ? '<i style="float:right;" class="fas fa-users"></i>' : ''}</div>`)
            .insertAfter($('h3:last', html))
            .click(game.user.isGM ? AssignHeroPoints.assignPoints.bind() : AssignHeroPoints.showApp.bind());
    }
});

Hooks.on('renderChatMessage', (message, html, data) => {
    if (message.isAuthor && message.content.includes("assign-heropoints-to-player")) {
        $('.assign-heropoints-to-player', html).click(AssignHeroPoints.assignPointsToPlayers.bind(message));
    }
});