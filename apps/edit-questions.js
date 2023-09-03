import { AssignHeroPoints, setting, i18n } from "../assign-heropoints.js";

export class EditQuestions extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions,
            {
                title: i18n("AssignHeroPoints.EditQuestions"),
                id: "edit-questions",
                template: "modules/assign-heropoints/templates/edit-questions.html",
                width: '400',
                height: 'auto',
                resizable: false,
            });
    }

    getData() {
        return super.getData();
    }

    activateListeners(html) {
        super.activateListeners(html);

    }

    _updateObject() {

    }
}