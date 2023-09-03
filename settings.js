import { i18n } from "./assign-heropoints.js";
import { EditQuestions } from "./apps/edit-questions.js"

export const registerSettings = function () {
    // Register any custom module settings here
	let modulename = "assign-heropoints";

	game.settings.registerMenu(modulename, 'edit-questions', {
		label: i18n("AssignHeroPoints.edit-questions.name"),
		hint: i18n("AssignHeroPoints.edit-questions.hint"),
		icon: 'fas fa-pencil',
		restricted: true,
		type: EditQuestions
	});
	
	game.settings.register(modulename, "questions", {
		scope: "world",
		config: false,
		default: [
			{ id: 'R9IX48qIBUU6lt9X', icon: 'fa-circle-h', name: "One at the start", enabled: false, default: true },
			{ id: 'CxFByjFnkecEkftg', icon: 'fa-book', name: "Notes last session" },
			{ id: 'aIseJ9kKVDmWOoH1', icon: 'fa-pencil', name: "Notes this session" },
		],
		type: Array,
	});

	game.settings.register(modulename, "showing", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean,
	});

	game.settings.register(modulename, "responses", {
		scope: "world",
		config: false,
		default: {},
		type: Object,
	});

	game.settings.register(modulename, "responded", {
		scope: "world",
		config: false,
		default: {},
		type: Object,
	});

	game.settings.register(modulename, "history", {
		scope: "world",
		config: false,
		default: [],
		type: Array,
	});

}