function string2ab(string_) {
	const buf = new ArrayBuffer(string_.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, stringLength = string_.length; i < stringLength; i++) {
		bufView[i] = string_.codePointAt(i);
	}

	return buf;
}

function ab2string(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

class DuoClient {
	constructor({akey = '', pkey = '', host = '', code = '', response = ''} = {}) {
		this.pkey = pkey;
		this.akey = akey;
		this.host = host;
		this.response = {};
		if (code) {
			this.read_code(code);
		}

		if (response) {
			this.import_response(response);
		}
	}

	// https://github.com/mdn/dom-examples/blob/master/web-crypto/import-key/pkcs8.js
	async import_private_key(private_key) {
		const pemHeader = '-----BEGIN PRIVATE KEY-----';
		const pemFooter = '-----END PRIVATE KEY-----';
		const pemContents = private_key.trim().slice(pemHeader.length, private_key.length - pemFooter.length).replace(/\n/g, '');
		// Base64 decode the string to get the binary data
		const binaryDerString = window.atob(pemContents);
		// Convert from a binary string to an ArrayBuffer
		const binaryDer = string2ab(binaryDerString);

		return window.crypto.subtle.importKey(
			'pkcs8',
			binaryDer,
			{
				name: 'RSASSA-PKCS1-v1_5',
				hash: 'SHA-512',
			},
			true,
			['sign'],
		);
	}

	async import_public_key(public_key) {
		const pemHeader = '-----BEGIN PUBLIC KEY-----';
		const pemFooter = '-----END PUBLIC KEY-----';
		const pemContents = public_key.trim().slice(pemHeader.length, public_key.length - pemFooter.length).replace(/\n/g, '');
		// Base64 decode the string to get the binary data
		const binaryDerString = window.atob(pemContents);
		// Convert from a binary string to an ArrayBuffer
		const binaryDer = string2ab(binaryDerString);

		return window.crypto.subtle.importKey(
			'spki',
			binaryDer,
			{
				name: 'RSASSA-PKCS1-v1_5',
				hash: 'SHA-512',
			},
			true,
			['verify'],
		);
	}

	async import_key(keyPair) {
		const [privateKey, publicKey] = await Promise.all([this.import_private_key(keyPair.privateKey), this.import_public_key(keyPair.publicKey)]);
		this.keyPair = {privateKey, publicKey};
	}

	async generate_key() {
		this.keyPair = await window.crypto.subtle.generateKey(
			{
				name: 'RSASSA-PKCS1-v1_5',
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: 'SHA-512',
			},
			true,
			['sign', 'verify'],
		);
	}

	async export_private_key() { // Crypto API doesn't support deriving public key from private key with extra params
		// https://github.com/mdn/dom-examples/blob/master/web-crypto/export-key/pkcs8.js

		const exported = await window.crypto.subtle.exportKey(
			'pkcs8',
			this.keyPair.privateKey,
		);
		const exportedAsString = ab2string(exported);
		const exportedAsBase64 = window.btoa(exportedAsString);
		const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;

		return pemExported;
	}

	async export_public_key() {
		// https://github.com/mdn/dom-examples/blob/master/web-crypto/export-key/pkcs8.js

		const exported = await window.crypto.subtle.exportKey(
			'spki',
			this.keyPair.publicKey,
		);
		const exportedAsString = ab2string(exported);
		const exportedAsBase64 = window.btoa(exportedAsString);
		const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

		return pemExported;
	}

	async export_keyPair() {
		const [privateKey, publicKey] = await Promise.all([this.export_private_key(), this.export_public_key()]);
		return {privateKey, publicKey};
	}

	read_code(code) {
		const r = /<(.*)>/;
		const mat = code.match(r);
		if (mat) {
			code = mat[0];
		}

		const [activate_code, host] = code.split('-');
		this.code = activate_code;
		this.host = window.atob(host);
	}

	import_response(response) {
		if ('response' in response && response.response) {
			response = response.response;
		}

		this.response = response;
		if (this.host && !('host' in this.response && this.response.host)) {
			this.response.host = this.host;
		} else if (!this.host && ('host' in this.response && this.response.host)) {
			this.host = this.response.host;
		}

		this.akey = this.response.akey;
		this.pkey = this.response.pkey;
	}

	export_response() {
		if (this.host && !('host' in this.response && this.response.host)) {
			this.response.host = this.host;
		}

		return this.response;
	}

	async activate() {
		if (this.code) {
			const data = {
				pubkey: await this.export_public_key(),
				pkpush: 'rsa-sha512',
			};

			const response = await fetch(`https://${this.host}/push/v2/activation/${this.code}?customer_protocol=1`,
				{
					method: 'POST',
					mode: 'cors',
					body: new URLSearchParams(data),
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				});
			const resp = await response.json();
			if (resp.stat && resp.stat === 'FAIL') {
				throw new Error(resp.message || 'Invalid activation code');
			}

			this.import_response(resp);
		} else {
			throw new Error('Code is null');
		}
	}

	async generate_signature(method, path, time, data) {
		const parameters = new URLSearchParams(data);
		const message = (time + '\n' + method + '\n' + this.host.toLowerCase() + '\n' + path + '\n' + parameters.toString());
		console.log(message);
		const encoder = new TextEncoder();
		const bin = encoder.encode(message);
		const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', this.keyPair.privateKey, bin);
		return 'Basic ' + window.btoa(this.pkey + ':' + window.btoa(ab2string(signature)));
	}

	async get_transactions() {
		const date = new Date();
		const time = date.toUTCString().replace('GMT', '-0000');
		const path = '/push/v2/device/transactions';
		const data = {akey: this.akey, fips_status: '1', hsm_status: 'True', pkpush: 'rsa-sha512'};

		const signature = await this.generate_signature('GET', path, time, data);
		console.log(signature);

		const url = new URL(`https://${this.host}${path}`);
		url.search = new URLSearchParams(data).toString();

		const response = await fetch(url, {
			method: 'GET',
			mode: 'cors',
			credentials: 'include',
			headers: {
				Authorization: signature,
				'x-duo-date': time,
			},
		});
		const resp = await response.json();
		if (resp.stat && resp.stat === 'FAIL') {
			throw new Error(resp.message || 'Failed get_transactions()');
		}

		return resp.response;
	}

	async reply_transaction(transaction_id, answer) {
		const date = new Date();
		const time = date.toUTCString().replace('GMT', '-0000');
		const path = '/push/v2/device/transactions/' + transaction_id;
		const data = {akey: this.akey, answer, fips_status: '1', hsm_status: 'True', pkpush: 'rsa-sha512'};

		const signature = await this.generate_signature('POST', path, time, data);
		console.log(signature);

		const url = new URL(`https://${this.host}${path}`);

		const response = await fetch(url, {
			method: 'POST',
			mode: 'cors',
			body: new URLSearchParams(data),
			credentials: 'include',
			headers: {
				Authorization: signature,
				'x-duo-date': time,
				txId: transaction_id,
			},
		});
		const resp = await response.json();
		if (resp.stat && resp.stat === 'FAIL') {
			throw new Error(resp.message || 'Failed reply_transaction()');
		}

		return resp.response;
	}
}

export default DuoClient;
