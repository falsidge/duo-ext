import browser from 'webextension-polyfill';
import DuoClient from './client.js';

function activate() {
	const href = new URL(window.location);
	href.searchParams.set('post_auth_action', 'addDevice');
	href.pathname = '/frame/enroll/pre_flow_prompt';
	// Href.searchParams.set('flow', 'tablet');
	// href.pathname = "/frame/enroll/mobile_activate"
	browser.storage.local.set({site_creds: {[window.location.host]: {activation: true}}});
	window.location = href;
}

async function init() {
	const storage = await browser.storage.local.get({site_creds: {}});
	const site_storage = window.location.host in storage.site_creds ? storage.site_creds[window.location.host] : {};
	console.log(site_storage);
	if (site_storage) {
		if (!('key' in site_storage)) {
			const element = document.querySelector('nav');
			if (element) {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = 'Activate duo-ext';
				button.classList.add('button', 'positive');
				button.addEventListener('click', activate);
				element.append(button);
			}
		}

		const myPort = browser.runtime.connect({name: window.location.host});
		const auth_button = document.querySelector('.auth-button');
		if (auth_button) {
			auth_button.addEventListener('click', () => {
				myPort.postMessage({action: 'auth'});
			});
		}
	}
}

async function loadPages() {
	const storage = await browser.storage.local.get({site_creds: {}});
	console.log(storage);
	const site_storage = window.location.host in storage.site_creds ? storage.site_creds[window.location.host] : {};

	/*  // eslint-disable-line capitalized-comments
		if (site_storage) {
	// 	const myPort = browser.runtime.connect({name: window.location.host});
	// 	const auth_button = document.querySelector('auth-button')
	// 	if (auth_button) {
	// 		auth_button.addEventListener('click', () => {
	// 			myPort.postMessage({action: 'auth'});
	// 		});
	// 	}
	// }
	*/

	if ('activation' in site_storage && site_storage.activation) {
		switch (window.location.pathname) {
			case '/frame/enroll/flow': {
				const href = new URL(window.location);
				href.searchParams.set('u2f_extension', 'false');
				href.searchParams.set('flow', 'tablet');
				href.pathname = '/frame/enroll/enrollplatform';
				window.location = href;
				// Let href = new URL(window.location);
				// href.searchParams.set('platform', 'android');
				// href.pathname = "/frame/enroll/mobile_activate"
				// window.location = href
				// browser.storage.local.set({[window.location.host] : {activation : false}})

				break;
			}

			case '/frame/enroll/enrollplatform': {
				const href = new URL(window.location);
				href.searchParams.set('platform', 'Android');
				href.pathname = '/frame/enroll/install_mobile_app';
				window.location = href;

				break;
			}

			case '/frame/enroll/install_mobile_app': {
				const href = new URL(window.location);
				href.searchParams.set('platform', 'Android');
				href.pathname = '/frame/enroll/mobile_activate';
				window.location = href;

				break;
			}

			case '/frame/enroll/mobile_activate': {
				const qr = document.querySelector('.qr');
				const href = new URL(qr.src);
				const code = href.searchParams.get('value');

				const client = new DuoClient();
				await client.generate_key();
				client.read_code(code);
				await client.activate();

				const storage = await browser.storage.local.get({site_creds: {}});
				storage.site_creds[window.location.host] = {
					response: client.export_response(), key: await client.export_keyPair(), encrypted: false, activation: false, notification: true,
				};
				browser.storage.local.set(storage);

				break;
			}
		// No default
		}

		for (const i of document.querySelectorAll('a')) {
			i.addEventListener('click', async () => {
				const storage = await browser.storage.local.get({site_creds: {}});
				storage.site_creds[window.location.host].activation = false;
				browser.storage.local.set(storage);
			});
		}
	}
}

loadPages();
window.addEventListener('load', init);
// Init();

// https://api-c03055b9.duosecurity.com/frame/enroll/mobile_platforms?calling_code=%2B1&phone_number=5515555556&sid=
// https://api-c03055b9.duosecurity.com/frame/enroll/install_mobile_app?sid=
// https://api-c03055b9.duosecurity.com/frame/enroll/mobile_activate?sid=
// pkey=devicekey
// akey=accountkey
// sid=sessionid
