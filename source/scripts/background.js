import browser from "webextension-polyfill";
import DuoClient from "./client.js";

// Import '../options-storage.js';
browser.webNavigation.onBeforeNavigate.addListener(
	() => {
		browser.webRequest.onCompleted.addListener(
			async (details) => {
				console.log(details);

				const href = new URL(details.url);
				const storage = await browser.storage.local.get({ site_creds: {} });
				const site_creds = storage.site_creds;
				console.log(href.hostname, site_creds);
				if (
					href.hostname in site_creds &&
					(site_creds[href.hostname].notification ||
						site_creds[href.hostname].autoapprove)
				) {
					const client = new DuoClient(site_creds[href.hostname]);
					await client.import_key(site_creds[href.hostname].key);

					const transactions = await client.get_transactions();
					if (transactions.transactions.length > 0) {
						const tx = transactions.transactions[0];

						if (site_creds[href.hostname].notification) {
							browser.notifications.create(href.hostname + ":" + tx.urgid, {
								type: "basic",
								iconUrl: browser.runtime.getURL("assets/icons/favicon-128.png"),
								title: "Duo Push",
								message:
									"Click to accept push \n" +
									tx.summary +
									"\n" +
									JSON.stringify(tx.attributes),
							});
							console.log("notification created");
						}

						if (
							site_creds[href.hostname].autoapprove &&
							transactions.transactions.length === 1
						) {
							client.reply_transaction(tx.urgid, "approve");
						}
					}
				}
			},
			{ urls: ["https://*.duosecurity.com/frame/prompt"] }
		);
	},
	{ urls: ["https://*.duosecurity.com/frame/prompt"] }
);

browser.notifications.onClicked.addListener(async (notificationId) => {
	browser.notifications.clear(notificationId);
	const [host, urgId] = notificationId.split(":");

	const storage = await browser.storage.local.get({ site_creds: {} });
	const site_creds = storage.site_creds;

	const client = new DuoClient(site_creds[host]);
	await client.import_key(site_creds[host].key);

	client.reply_transaction(urgId, "approve");
});
