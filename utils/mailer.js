'use strict';

import { SMTPClient } from 'emailjs';

import CREDS from '../constants/creds.js';

const domain = '@NonPartisanDE.org';
const pollResultEmail = 'non-partisan-delaware-board@googlegroups.com';
// const pollResultEmail = `info${domain}`;
const boardEmail = `board${domain}`;
const botEmail = `no-reply${domain}`;

export default class Mailer {
	static sendChairEmail(to, subj, htmlText, attachments = []) {
		return this.sendMail('Non-Partisan Delaware',
			to,
			boardEmail,
			boardEmail,
			subj, htmlText, attachments
		);
	}

	static sendPollResult(subj, htmlText, attachments = []) {
		return this.sendMail('NPD Bot',
			pollResultEmail,
			botEmail,
			botEmail,
			subj, htmlText, attachments
		);
	}

	static sendMail(name, to, reply, from, subj, htmlText, attachments = []) {
		attachments.splice(0, 0, { 'data': htmlText, 'alternative': true });
		return new Promise((resolve, reject) => {
			new SMTPClient({
				'user': CREDS.zoho.user,
				'password': CREDS.zoho.pass,
				'host': 'smtppro.zoho.com',
				'ssl': true,
				'timeout': 10000
			}).send({
				'from': `${name} <${from}>`,
				'to': `${to}`,
				'reply-to': `${name} <${reply}>`,
				'subject': subj,
				'attachment': attachments
			}, (e, m) => {
				if (e) reject(e);
				resolve(m);
			});
		});
	}
}
