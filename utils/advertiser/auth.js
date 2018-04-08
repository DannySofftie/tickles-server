"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
const querystring = require("querystring");
async function verifyCaptcha(captcha, clientip) {
    return new Promise((resolve, reject) => {
        let cSecret = '6LdN1FEUAAAAAGHokcf3kHwvrWrfJ5hZfCGtDwE2', post = https_1.request({ method: 'POST', host: 'www.google.com', path: '/recaptcha/api/siteverify', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, (res) => {
            res.on('data', data => resolve(data));
            res.on('error', err => reject(err));
        });
        post.write(querystring.stringify({ secret: cSecret, response: captcha, remoteip: clientip }));
        post.on('error', err => reject(err));
        post.end();
    });
}
async function confirmCredentials(req) {
    return req.body;
}
async function advertiserLogin(req) {
    let captchaResult = await verifyCaptcha(req.body['g-recaptcha-response'], req.ip).then(data => data).catch(err => err);
    if (JSON.parse(captchaResult.toString()).success)
        return await confirmCredentials(req);
    else
        return JSON.parse(captchaResult.toString()).success;
}
exports.advertiserLogin = advertiserLogin;
