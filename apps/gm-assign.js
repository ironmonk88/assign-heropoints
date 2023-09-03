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

        let questions = (setting("questions") || [{ id: 'R9IX48qIBUU6lt9X', icon: 'fa-circle-h', name: "Default", default: true }]);

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

        mergeObject(data, {
            questions,
            players
        });

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.question-checkbox', html).on('change', this._changePlayerQuestion.bind(this));
        $('.cancel-button', html).on("click", this.close.bind(this));
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
                    updates.push({ _id: character.id, 'system.resources.heroPoints.value': (getProperty(character, 'system.resources.heroPoints.value') ?? 0) + totalPoints });
                } else if (data.assignment === "remove") {
                    updates.push({ _id: character.id, 'system.resources.heroPoints.value': (getProperty(character, 'system.resources.heroPoints.value') ?? 0) - totalPoints });
                }
            }
        });

        Actor.updateDocuments(updates);
    }

    async close(options = {}) {
        super.close(options);
        await game.settings.set("assign-heropoints", "showing", false);
        AssignHeroPoints.emit("closeApp");
    }
}