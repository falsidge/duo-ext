import browser from 'webextension-polyfill';
import QRCode from 'qrcode';
import DuoClient from './client.js';
import '../styles/popup.scss';

let currentTab = '';
let currentClient = null;
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

async function loadTransactions() {
	const storage = await browser.storage.local.get({site_creds: {}});
	const site_creds = storage.site_creds;
	console.log(storage);
	if (currentTab in site_creds) {
		document.querySelector('#output').textContent = 'Activated';

		console.log(currentClient);
		const transactions = await currentClient.get_transactions();
		const table = document.querySelector('#transactionlist');
		while (table.firstChild) {
			table.lastChild.remove();
		}

		console.log(transactions);
		for (const tx of transactions.transactions) {
			const row = document.createElement('tr');
			const summary = document.createElement('td');
			row.append(summary);
			summary.textContent = tx.summary;

			const attributes = document.createElement('td');
			row.append(attributes);
			attributes.textContent = JSON.stringify(tx.attributes);
			{
				const cell = document.createElement('td');
				row.append(cell);
				const button = document.createElement('input');
				button.type = 'button';
				button.value = 'accept';
				cell.append(button);
				button.addEventListener('click', async () => {
					await currentClient.reply_transaction(tx.urgid, 'approve');
					loadTransactions();
				});
			}

			const cell = document.createElement('td');
			row.append(cell);
			const button = document.createElement('input');
			button.type = 'button';
			button.value = 'reject';
			button.addEventListener('click', async () => {
				await currentClient.reply_transaction(tx.urgid, 'reject');
				loadTransactions();
			});
			cell.append(button);
			table.append(row);
		}
	}
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

			const div = document.createElement('div');
			const img = document.createElement('img');
			div.append(img);
			img.src = 'data:image/png;base64,' + site_creds[i].response.customer_logo;
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = site_creds[i].response.customer_name;
			div.classList.add('tablinks');
			button.addEventListener('click', async () => {
				const storage = await browser.storage.local.get({site_creds: {}});
				const site_creds = storage.site_creds;
				currentClient.import_response(site_creds[currentTab].response);
				await currentClient.import_key(site_creds[currentTab].key);
				currentTab = i;

				loadTransactions();
			});
			div.append(button);
			element.append(div);
		}
	}

	if (currentClient) {
		currentClient.import_response(site_creds[currentTab].response);
		await currentClient.import_key(site_creds[currentTab].key);
	} else {
		currentClient = new DuoClient(site_creds[currentTab]);
		await currentClient.import_key(site_creds[currentTab].key);
	}

	if (currentTab) {
		if ('notification' in site_creds[currentTab]) {
			document.querySelector('#notification').checked
				= site_creds[currentTab].notification;
		} else {
			site_creds[currentTab].notification
				= document.querySelector('#notification').checked;
		}

		if ('autoapprove' in site_creds[currentTab]) {
			document.querySelector('#autoapprove').checked
				= site_creds[currentTab].autoapprove;
		} else {
			site_creds[currentTab].autoapprove
				= document.querySelector('#autoapprove').checked;
		}
	}
}

async function loadOTP() {
	const counter = document.querySelector('#counter');
	const storage = await browser.storage.local.get({site_creds: {}});
	const site_creds = storage.site_creds;
	if (currentTab) {
		let counter_value = 1;
		if ('counter' in site_creds[currentTab] && site_creds[currentTab].counter) {
			counter.value =	site_creds[currentTab].counter.toString();
			counter_value = Number.parseInt(site_creds[currentTab].counter, 10);
		} else {
			counter_value = Number.parseInt(counter.value, 10);
			site_creds[currentTab].counter = counter_value;
		}

		const passcode = await currentClient.generate_hotp(counter_value);
		document.querySelector('#pass').textContent = passcode.toString().padStart(6, '0');
		document.querySelector('#secret').value = currentClient.export_hotp_secret_standard();
	}
}

window.addEventListener('load', function () {
	// Main()
	async function init() {
		await createTabs();
		loadTransactions();
		loadOTP();
	}

	init();
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
			this.window.location.reload();
		});
	this.document
		.querySelector('#refresh')
		.addEventListener('click', loadTransactions);
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
		browser.runtime.openOptionsPage();
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
	const counter = this.document.querySelector('#counter');
	counter.addEventListener('change', async () => {
		console.log('1,', counter.value);
		if (currentTab) {
			const storage = await browser.storage.local.get({site_creds: {}});
			const site_creds = storage.site_creds;
			console.log(',', counter.value);
			const counter_value = Number.parseInt(counter.value, 10);
			site_creds[currentTab].counter = counter_value;
			const passcode = await currentClient.generate_hotp(counter_value);
			this.document.querySelector('#pass').textContent = passcode.toString().padStart(6, '0');
			await browser.storage.local.set(storage);
		}
	});
	const reveal = this.document.querySelector('#show');
	reveal.addEventListener('click', () => {
		const secret = this.document.querySelector('#secret');
		const counter = this.document.querySelector('#counter');
		secret.type = secret.type === 'password' ? 'text' : 'password';
		if (secret.type === 'text') {
			reveal.value = 'Hide';
			QRCode.toDataURL(currentClient.export_qrcode(counter.value), (error, url) => {
				if (error) {
					throw error;
				}

				const img = document.querySelector('#qr');
				img.src = url;
			});
		} else {
			reveal.value = 'Show Secret/QR';
			const img = document.querySelector('#qr');
			img.src = '';
		}
	});
});
