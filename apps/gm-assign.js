import { AssignHeroPoints, setting, i18n } from "../assign-heropoints.js";

export class GMAssignApplication extends FormApplication {
    static get defaultOptions() {
        let questions = (setting("questions") || [{ id: 'R9IX48qIBUU6lt9X', icon: 'fa-circle-h', name: "Default", default: true }]);

        return mergeObject(super.defaultOptions,
            {
                title: i18n("AssignHeroPoints.Title"),
                id: "assign-heropoints-app",
                template: "modules/assign-heropoints/templates/gm-assign.html",
                width: parseInt(`${400 + (questions.length * 30)}`),
                height: 'auto',
                resizable: true,
                classes: ["assign-heropoints", "gm-assign"]
            });
    }

    getData() {
        let data = super.getData();

        let questions = duplicate(setting("questions") || [{ id: 'R9IX48qIBUU6lt9X', icon: 'fa-circle-h', name: "Default", default: true }]);
        questions = questions.map(q => {
            return Object.assign({}, q, {
                enabled: q.enabled ?? true,
                visible: q.visible ?? true
            });
        });

        let responses = setting("responses");
        let responded = setting("responded");
        let players = game.users.contents
            .filter(u => !!u && u.character && u.isGM === false)
            .map(u => {
                let response = responses[u.id] ?? {};
                let playerResponse = questions.reduce((acc, q) => {
                    acc[q.id] = response[q.id] ?? q.default ?? false;
                    return acc;
                }, {});

                return {
                    id: u.id,
                    name: u.name,
                    avatar: u.avatar,
                    color: u.color,
                    character: u.character?.name,
                    responded: responded[u.id] ?? false,
                    response: playerResponse
                }
            });

        let remaining = setting("remaining") ? this.getRemainingTime() : null;

        mergeObject(data, {
            questions,
            players,
            remaining,
            showing: setting("showing")
        });

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.question-checkbox', html).on('change', this._changePlayerQuestion.bind(this));
        $('.cancel-button', html).on("click", this.close.bind(this));

        $('button.set-timer', html).click(this.setTime.bind(this));
        $('button.show-players', html).click(this.showToPlayers.bind(this));

        if (setting("remaining")) {
            if (this.remainingTimer)
                window.clearInterval(this.remainingTimer);
            this.remainingTimer = window.setInterval(() => {
                let done;
                $('.remaining-timer', html).val(this.getRemainingTime());
            }, 1000);
        }
    }

    async showToPlayers() {
        let showing = !setting("showing");
        await game.settings.set("assign-heropoints", "showing", showing);
        $('button.show-players', this.element).toggleClass("active", showing);
        if (showing)
            AssignHeroPoints.emit("showApp");
        else
            AssignHeroPoints.emit("closeApp");
    }

    getRemainingTime() {
        let remaining = new Date(setting("remaining"));
        let diff = Math.ceil((remaining - Date.now()) / 1000);
        if (diff <= 0) {
            return "Assign Hero Points!";
        } else {
            const switchover = 120;
            let min = diff > switchover ? Math.ceil(diff / 60) : Math.floor(diff / 60);
            let sec = (diff > switchover ? null : diff % 60)
            return `Assign in: ${min ? min : ""}${sec != null ? (min ? ":" : "") + String(sec).padStart(2, '0') + (min ? " min" : " sec") : " min"}`;
        }
    }

    setTime() {
        Dialog.confirm({
            title: "Set Time Until Hero Points",
            content: `<p class="notes">Set the time remaining until assigning hero points (minutes)</p><input type="text" style="float:right; margin-bottom: 10px;text-align: right;width: 150px;" value="60"/> `,
            yes: async (html) => {
                let value = parseInt($('input', html).val());
                if (isNaN(value) || value == 0) {
                    await game.settings.set("assign-heropoints", "remaining", null);
                    if (AssignHeroPoints.remainingTimer)
                        window.clearInterval(AssignHeroPoints.remainingTimer);
                }
                else {
                    let remaining = new Date(Date.now() + (value * 60000));
                    await game.settings.set("assign-heropoints", "remaining", remaining);
                    if (AssignHeroPoints.remainingTimer)
                        window.clearInterval(AssignHeroPoints.remainingTimer);
                    AssignHeroPoints.setTimer();
                }

                this.render(true);
            }
        });
    }

    _changePlayerQuestion(event) {
        let playerId = event.currentTarget.closest('.assignhp-player').dataset.userId;
        let questionId = event.currentTarget.closest('.assignhp-question').dataset.questionId;
        let value = event.currentTarget.checked;

        AssignHeroPoints.emit("updatePlayerQuestions", { userId: playerId, questionId, value });
    }

    refresh(userId, response) {
        Object.entries(response).forEach(([id, value]) => {
            $(`[name="questions.${userId}.${id}"]`, this.element).prop('checked', value);
        });
    }

    responded(userId) {
        $("li[data-user-id='" + userId + "']", this.element).addClass("responded");
    }

    async _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);
        let updates = [];
        Object.entries(data.questions).forEach(([userId, value]) => {
            let user = game.users.get(userId);
            let character = user?.character;
            if (character) {
                let totalPoints = Object.values(value).reduce((acc, v) => {
                    if (v === true) acc++;
                    return acc;
                }, 0);
                if (data.assignment === "set") {
                    updates.push({ _id: character.id, 'system.resources.heroPoints.value': totalPoints });
                } else if (data.assignment === "add") {
                    updates.push({ _id: character.id, 'system.resources.heroPoints.value': Math.min((getProperty(character, 'system.resources.heroPoints.value') ?? 0) + totalPoints, 3) });
                } else if (data.assignment === "remove") {
                    updates.push({ _id: character.id, 'system.resources.heroPoints.value': Math.max((getProperty(character, 'system.resources.heroPoints.value') ?? 0) - totalPoints, 0) });
                }
            }
        });

        Actor.updateDocuments(updates);
        AssignHeroPoints.emit("closeApp");
    }
}