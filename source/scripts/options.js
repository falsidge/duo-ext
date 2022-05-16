import browser from 'webextension-polyfill';
import DuoClient from './client.js';
import '../styles/popup.scss';

let currentTab = '';
// Import optionsStorage from '../options-storage.js';

// Async function main() {
//     // await browser.storage.local.clear()
//     const storage = await browser.storage.local.get({ "site_creds": {} })
//     // console.log(storage)
//     // throw ""

//     const site_creds = storage["site_creds"]
//     const client = new DuoClient()
//     if (("test" in site_creds))
//         // {
//         //     await client.generate_key()
//         //     await client.activate()
//         //     site_creds["test"] = {"response": client.export_response(), "key": await client.export_keyPair(),"encrypted":false}
//         //     await browser.storage.local.set(storage)
//         // }
//         // else
//         // {
//         client.import_response(site_creds["test"]["response"])

//     // site_creds["test"]["key"]["privateKey"] = dev_key
//     console.log("test")
//     await client.import_key(site_creds["test"]["key"])

//     const transactions = await client.get_transactions()
//     console.log(transactions)
//     if (transactions["response"]["transactions"].length > 0) {
//         const tx = transactions["response"]["transactions"][0]
//         client.reply_transaction(tx["urgid"], "approve")
//         document.getElementById("output").innerText = "Approving transaction"
//     }
//     else {
//         document.getElementById("output").innerText = "No transactions"
//     }
//     // document.getElementById("output").innerText = JSON.stringify(client)
//     // }
// }
function loadTransactions() {
	window.location.reload();
}

async function createTabs() {
	const element = document.querySelector('.tab');
	const storage = await browser.storage.local.get({site_creds: {}});
	const site_creds = storage.site_creds;

	for (const i in site_creds) {
		if (Object.prototype.hasOwnProperty.call(site_creds, i)) {
			if (!currentTab) {
				currentTab = i;
			}

			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = site_creds[i].response.customer_name;
			button.classList.add('tablinks');
			button.addEventListener('click', () => {
				currentTab = i;
				loadTransactions();
			});
			element.append(button);
		}
	}

	if (currentTab in site_creds) {
		if ('notification' in site_creds[currentTab]) {
			document.querySelector('#notification').checked
				= site_creds[currentTab].notification;
		}

		if ('autoapprove' in site_creds[currentTab]) {
			document.querySelector('#autoapprove').checked
				= site_creds[currentTab].autoapprove;
		}
	}
}

window.addEventListener('load', function () {
	// Main()

	createTabs();

	this.document.querySelector('#clear').addEventListener('click', () => {
		browser.storage.local.clear();
	});
	this.document
		.querySelector('#activate')
		.addEventListener('click', async () => {
			browser.storage.local.clear();
			const storage = await browser.storage.local.get({site_creds: {}});
			const site_creds = storage.site_creds;
			const client = new DuoClient();
			await client.generate_key();
			client.read_code(document.querySelector('#code').value);
			await client.activate();
			site_creds[client.export_response().host] = {
				response: client.export_response(),
				key: await client.export_keyPair(),
				encrypted: false,
				notification: true,
			};
			await browser.storage.local.set(storage);
			// Document.getElementById("output").innerText = JSON.stringify({ "response": client.export_response(), "key": await client.export_keyPair() }).replace(/\n/g, "&#13;&#10;")
			loadTransactions();
		});
	document
		.querySelector('#autoapprove')
		.addEventListener('change', async event => {
			const storage = await browser.storage.local.get({site_creds: {}});
			const site_creds = storage.site_creds;
			if (currentTab in site_creds) {
				site_creds[currentTab].autoapprove = event.target.checked;
				browser.storage.local.set(storage);
			}
		});
	document
		.querySelector('#notification')
		.addEventListener('change', async event => {
			const storage = await browser.storage.local.get({site_creds: {}});
			const site_creds = storage.site_creds;
			if (currentTab in site_creds) {
				site_creds[currentTab].notification = event.target.checked;
				browser.storage.local.set(storage);
			}
		});
	this.document.querySelector('#export').addEventListener('click', async () => {
		const storage = await browser.storage.local.get({site_creds: {}});
		const site_creds = storage.site_creds;
		if (currentTab in site_creds) {
			const json = JSON.stringify(site_creds[currentTab]);
			const blob = new Blob([json], {type: 'application/json'});
			const url = URL.createObjectURL(blob);
			const element = document.createElement('a');
			element.setAttribute('href', url);
			element.setAttribute('download', currentTab + '.json');
			element.click();
			setTimeout(() => URL.revokeObjectURL(url), 100);
		}
	});
	const imported_files = this.document.querySelector('#import');
	this.document.querySelector('#import_proxy').addEventListener('click', () => {
		imported_files.click();
	});
	imported_files.addEventListener('change', () => {
		for (const file of imported_files.files) {
			const reader = new FileReader();
			reader.addEventListener('load', async event => {
				const imp = JSON.parse(event.target.result);
				const host = imp.response.host;
				const storage = await browser.storage.local.get({site_creds: {}});
				storage.site_creds[host] = imp;
				await browser.storage.local.set(storage);
				loadTransactions();
			});
			reader.readAsText(file);
		}
	});
});
