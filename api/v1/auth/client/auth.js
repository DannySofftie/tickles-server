"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bcrypt = require("bcrypt");
const Advertiser_1 = require("../../../../models/Advertiser");
const send_email_1 = require("../../utils/send-email");
async function confirmCredentials(username, password) {
    return 0;
}
async function advertiserLogin(req, res) {
    // email & password
    return await confirmCredentials('', '');
}
exports.advertiserLogin = advertiserLogin;
async function advertiserSignUp(req, res) {
    let expectedKeys = ['fullnames', 'emailaddress', 'password', 'businessgrouptarget'], incomingKeys = Object.keys(req.body);
    /**
     * ensure incoming body contains all fields as expected
     * @param {Array<string>} d expected keys
     * @param {Array<string>} t incoming body keys
     * @returns {boolean}
     */
    function ensureExpectedBody(d, t) {
        return d.sort().every((a, b, c) => a.trim().toLowerCase() == t.sort()[b].trim().toLowerCase());
    }
    if (!ensureExpectedBody(expectedKeys, incomingKeys))
        return res.status(res.statusCode).json({
            error: 'REQ_BODY_ERROR',
            expectedparams: expectedKeys,
            providedparams: incomingKeys
        });
    let SSID = Buffer.from(req.body['emailaddress'] + ':' + req.body['fullnames']).toString('base64'), hashPassword = await bcrypt.hashSync(req.body['password'], 8), verificationCode = (Number(new Date()) % 7e9).toString(29).toUpperCase(), advertiser = new Advertiser_1.default({
        _id: new mongoose_1.Types.ObjectId(),
        fullNames: req.body['fullnames'],
        emailAddress: req.body['emailaddress'],
        password: hashPassword,
        ssid: SSID,
        verificationCode: verificationCode,
        businessGroupTarget: req.body['businessgrouptarget']
    });
    let emailCheck = await Advertiser_1.default.find({ emailAddress: req.body['emailaddress'] }).exec();
    if (emailCheck.length > 0)
        return res.status(res.statusCode).json({ error: 'EMAIL_EXISTS' });
    // @ts-ignore
    let saveResult = await advertiser.save().then(data => data.emailAddress == req.body['emailaddress']), emailStatus = await send_email_1.sendMail(req.body['emailaddress'], `Verify your account using code: ${verificationCode}`);
    return res.status(res.statusCode).json({ signupStatus: saveResult, emailStatus: emailStatus });
}
exports.advertiserSignUp = advertiserSignUp;
