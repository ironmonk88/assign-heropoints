import { AssignHeroPoints, setting, i18n } from "../assign-heropoints.js";
import { PickIcon } from "./pick-icon.js";

export class EditQuestions extends FormApplication {
    constructor(object, options) {
        super(object, options);
        this.questions = duplicate(setting("questions") || []);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions,
            {
                title: i18n("AssignHeroPoints.EditQuestions"),
                id: "edit-questions",
                template: "modules/assign-heropoints/templates/edit-questions.html",
                classes: ["assign-heropoints", "edit-questions"],
                width: '600',
                height: 'auto',
                resizable: false,
            });
    }

    getData() {
        let data = super.getData();

        data.questions = this.questions;
        for (let question of data.questions) {
            question.enabled = question.enabled ?? true;
            question.visible = question.visible ?? true;
        }

        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('button[name="submit"]', html).click(this._onSubmit.bind(this));
        $('button[name="reset"]', html).click(this.resetQuestions.bind(this));

        $('.item-add', html).click(this.addQuestion.bind(this));
        $('.item-delete', html).click(this.removeQuestion.bind(this));
        $('.item-icon', html).click(this.changeIcon.bind(this));

        $('.item .item-name input[type="text"]', html).change(this.updateName.bind(this));
        $('.item .item-controls input', html).click(this.updateCheckbox.bind(this));
    }

    addQuestion(event) {
        this.questions.push({ id: randomID(16), icon: 'fa-question', name: "Question", enabled: true });
        this.refresh();
    }

    removeQuestion(event) {
        let questionId = event.currentTarget.closest('.item').dataset.questionId;
        this.questions.findSplice(q => q.id == questionId);
        $('.item[data-question-id="' + questionId + '"]', this.element).remove();
        this.refresh();
    }

    updateName(event) {
        let questionId = event.currentTarget.closest('.item').dataset.questionId;
        let question = this.questions.find(q => q.id == questionId);
        question.name = $(event.currentTarget).val();
    }

    updateCheckbox(event) {
        let questionId = event.currentTarget.closest('.item').dataset.questionId;
        let question = this.questions.find(q => q.id == questionId);
        question[event.currentTarget.dataset.value] = $(event.currentTarget).prop('checked');
    }

    changeIcon(event) {
        this.questionId = event.currentTarget.closest('.item').dataset.questionId;
        let question = this.questions.find(q => q.id == this.questionId);
        new PickIcon(question, this).render(true);
    }

    async resetQuestions() {
        let setting = game.settings.settings.get("assign-heropoints.questions");
        await game.settings.set("assign-heropoints", "questions", setting.default);
        this.refresh();
    }

    refresh() {
        this.render(true);
        window.setTimeout(() => { this.setPosition(); }, 500);
    }

    async _updateObject(event, formData) {
        let data = foundry.utils.expandObject(formData);
        // convert data.questions from an object to an array
        let questions = [];
        for (let key in data.questions) {
            let question = data.questions[key];
            if (!question.name)
                continue;

            question.id = key;
            questions.push(question);
        }

        await game.settings.set("assign-heropoints", "questions", questions);
        this.submitting = true;
    }
}