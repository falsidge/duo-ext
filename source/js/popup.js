import DuoClient from "./client.js"
import optionsStorage from '../options-storage.js';
import browser from 'webextension-polyfill';

// async function main() {
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
    const storage = await browser.storage.local.get({ "site_creds": {} })
    const site_creds = storage["site_creds"]
    console.log(storage)
    if (("test" in site_creds)) {
        const client = new DuoClient(site_creds["test"])
        await client.import_key(site_creds["test"]["key"])
        console.log(client)
        const transactions = await client.get_transactions()
        const table = document.getElementById("transactionlist")
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }
        console.log(transactions)
        for (const tx of transactions["transactions"]) {
            const row = document.createElement("tr")
            row.appendChild(document.createElement("td")).innerText = tx["summary"]
            row.appendChild(document.createElement("td")).innerText = JSON.stringify(tx["attributes"])
            {
                const cell = row.appendChild(document.createElement("td"))
                const button = document.createElement("input")
                button.type = "button"
                button.value = "accept"
                cell.appendChild(button)
                button.addEventListener("click", function()
                {
                    client.reply_transaction(tx["urgid"],"approve")
                    loadTransactions()
                })
            }
            const cell = row.appendChild(document.createElement("td"))
            const button = document.createElement("input")
            button.type = "button"
            button.value = "reject"
            button.addEventListener("click", function()
            {
                client.reply_transaction(tx["urgid"],"reject")
                loadTransactions()
            })
            cell.appendChild(button)
            table.appendChild(row)
        }
    }
}
window.addEventListener('load', function () {
    // main()
    loadTransactions()

    this.document.getElementById("clear").addEventListener("click", function () {
        browser.storage.local.clear()
    })
    this.document.getElementById("activate").addEventListener("click", async function () {
        site_creds = {}
        storage = { "site_creds": site_creds }
        browser.storage.local.clear()
        const client = new DuoClient()
        await client.generate_key()
        client.read_code(document.getElementById("code").value)
        await client.activate()
        site_creds["test"] = { "response": client.export_response(), "key": await client.export_keyPair(), "encrypted": false }
        await browser.storage.local.set(storage)
        // document.getElementById("output").innerText = JSON.stringify({ "response": client.export_response(), "key": await client.export_keyPair() }).replace(/\n/g, "&#13;&#10;")

    })
});

