import OptionsSync from 'webext-options-sync';
import '../styles/content.scss';

export default new OptionsSync({
	defaults: {
		colorRed: 244,
		colorGreen: 67,
		colorBlue: 54,
		text: 'Set a text!',
		loggedin: false,
		client: {},
		key: '',
	},
	migrations: [
		OptionsSync.migrations.removeUnused,
	],
	logging: true,
});
