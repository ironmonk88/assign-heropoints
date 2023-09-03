import { AssignHeroPoints, setting, i18n } from "../assign-heropoints.js";

export class PlayerAssignApplication extends FormApplication {
    constructor(options = {}) {
        super(options);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions,
            {
                title: i18n("AssignHeroPoints.Title"),
                id: "assign-heropoints-app",
                template: "modules/assign-heropoints/templates/player-assign.html",
                width: 400,
                height: 'auto',
                resizable: false,
                classes: ["assign-heropoints", "player-assign"]
            });
    }

    getData() {
        //questions
        let questions = setting("questions");
        let responses = setting("responses");
        let response = responses[game.user.id] || {};

        questions.forEach((q) => {
            q.value = response[q.id] ?? q.default ?? false;
            q.enabled = q.enabled ?? true;
        });

        console.log("Player Assign", questions);

        return mergeObject(super.getData(), {
            questions
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.question-checkbox', html).on('change', this._changePlayerQuestion.bind(this));
    }

    _changePlayerQuestion(event) {
        let questionId = event.currentTarget.closest('.assignhp-question').dataset.questionId;
        let value = $(event.currentTarget).prop("checked");

        let response = {};
        response[questionId] = value;
        AssignHeroPoints.emit("updatePlayerQuestions", { userId: game.user.id, response, from: "player" });
    }

    refresh(questionId, value) {
        $(`[name="questions.${questionId}"]`, this.element).prop('checked', value);
    }

    async _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);

        AssignHeroPoints.emit("updatePlayerQuestions", {
            userId: game.user.id,
            response: data.questions,
            responded: true
        });
    }
}