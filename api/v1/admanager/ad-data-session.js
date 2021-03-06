"use strict";
/*

MIT License

Copyright (c) 2018 Danny Sofftie

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const Publisher_1 = require("../../../models/Publisher");
const mongoose_1 = require("mongoose");
const Advertisers_1 = require("../../../models/Advertisers");
const PublisherAdSession_1 = require("../../../models/PublisherAdSession");
const origin_cookies_1 = require("../utils/origin-cookies");
class AdDataSession {
    constructor(req, res) {
        this.device = req['client-session']['client-device'];
        this.request = req;
        this.response = res;
        this.determineAdClient();
    }
    async determineAdClient() {
        let adsIdsToServe = await this.retrieveRawAdData();
        if (adsIdsToServe.length < 1) {
            // serve company ad, with
            // company data,
            // this behaviour is a fallback when no ads meet defined criteria
            // ad data will be provided from company's own data
        }
        switch (this.device.trim().toLowerCase()) {
            case 'desktop':
                this.generateDesktopAd(adsIdsToServe);
                break;
            case 'mobile':
                this.generateMobileAd(adsIdsToServe);
                break;
            default:
                this.generateSubStandardAd(adsIdsToServe);
                break;
        }
        // writeFileSync('./campaigns.json', JSON.stringify(adsIdsToServe))
    }
    /**
     * desktop devices, large screen monitors
     * @param data - specifications:
     *     -  raw data with ads, as found using request details, including device size, ip address
     *     -  incoming request's publisher business category group and other specification
     * @returns {boolean} - build status
     */
    async generateDesktopAd(data) {
        // build desktop ad and respond with build status
        // use 'data' passed to complete session, which will be used during subsequent requests for ad data, to be served to the client
        try {
            // reuse existing session data 
            // for sessions created in the past two day
            let sessionId = origin_cookies_1.extractRequestCookies(this.request.headers.cookie, 'tickles-session');
            if (sessionId != undefined) {
                let existingSession = await PublisherAdSession_1.default.aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    visitorSessionId: { $eq: sessionId }
                                }, {
                                    sessionDate: { $gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000) }
                                }
                            ]
                        }
                    },
                    { $project: { visitorSessionId: 1, _id: 0 } }
                ]);
                // update suggestedAds array to give priority to new ads under 
                // the same businessCatgeroy as the publisher making request
                await PublisherAdSession_1.default.findOneAndUpdate({ visitorSessionId: { $eq: sessionId } }, { $set: { suggestedAds: data } }).exec();
                this.response.cookie('tickles-session', existingSession[0]['visitorSessionId'], { httpOnly: true, maxAge: 2 * 24 * 60 * 60 * 1000 });
                return this.response.status(200).json({ status: true, ref: existingSession[0]['visitorSessionId'] });
            }
        }
        catch (_a) { }
        // create new session data
        let pubSession = new PublisherAdSession_1.default({
            _id: new mongoose_1.Types.ObjectId(),
            clientIpAddress: this.request['client-session']['client-ip'],
            visitorSessionId: Buffer.from(this.request['client-session']['site-visited'] + '||' + this.request['client-session']['client-ip']).toString('base64'),
            incomingUrl: this.request['client-session']['site-visited'],
            incomingUrlPath: this.request['client-session']['site-section'],
            clientCookies: this.request['client-session']['client-cookies'],
            clientDevice: this.request['client-session']['client-device'],
            clientBrowser: this.request['client-session']['client-browser'],
            clientBrowserVersion: this.request['client-session']['client-browser-version'],
            clientOperatingSystem: this.request['client-session']['client-operating-system'],
            visitorLocation: {
                country_short: this.request['client-location']['country_short'],
                country_long: this.request['client-location']['country_long'],
                region: this.request['client-location']['region'],
                city: this.request['client-location']['city']
            },
            suggestedAds: data
        }), sessionStatus = await pubSession.save().then(doc => doc['visitorSessionId']).catch(err => []);
        this.response.cookie('tickles-session', sessionStatus, { httpOnly: true });
        return this.response.status(200).json({ status: true, ref: sessionStatus });
    }
    /**
     * smartphone devices ad generator
     * @param data - specifications:
     *     -  raw data with ads, as found using request details, including device size, ip address
     *     -  incoming request's publisher business category group and other specification
     * @returns {boolean} - build status
     */
    async generateMobileAd(data) {
        // build desktop ad and respond with build status
        // use 'data' passed to complete session, which will be used during subsequent requests for ad data, to be served to the client
        this.response.status(200).json({ status: true });
    }
    /**
     * fallback for unrecognized devices
     * @param data - specifications:
     *     -  raw data with ads, as found using request details, including device size, ip address
     *     -  incoming request's publisher business category group and other specification
     * @returns {boolean} - build status
     *
     */
    async generateSubStandardAd(data) {
        // use 'data' passed to complete session, which will be used during subsequent requests
        // for ad data, to be served to the client
        this.response.status(200).json({ status: true });
    }
    async retrieveRawAdData() {
        var e_1, _a;
        let publisher = await Publisher_1.default.find({ publisherAppUrl: this.request['client-session']['site-visited'] }).select('-_id ssid').exec();
        let campaigns;
        // get all campaigns scheduled in the range of current date of request, 
        // filter out campaigns where domain of the incoming request is banned by the advertiser
        if (publisher.length < 1 || publisher[0]['id'] == null)
            campaigns = await Advertisers_1.default.find({ accountBalance: { $gte: 5 } }).select('_id ssid joinedAs').populate({
                path: 'advertiserCampaigns',
                model: 'Campaigns',
                match: {
                    $and: [{
                            campaignBeginDate: { $lte: Date() }
                        }, {
                            campaignEndDate: { $gte: Date() }
                        }, {
                            campaignBannedDomains: { $ne: this.request['client-session']['site-visited'] }
                        }]
                },
                populate: {
                    path: 'campaignAdvertisements',
                    model: 'Advertisements',
                    match: {
                        adVerificationStatus: { $eq: true }
                    }
                }
            }).exec();
        else
            campaigns = await Advertisers_1.default.find({ businessGroupTarget: publisher[0]['businessCategory'], accountBalance: { $gte: 5 } }).select('_id ssid joinedAs').populate({
                path: 'advertiserCampaigns',
                model: 'Campaigns',
                match: {
                    $and: [{
                            campaignBeginDate: { $lte: Date() }
                        }, {
                            campaignEndDate: { $gte: Date() }
                        }, {
                            campaignBannedDomains: { $ne: this.request['client-session']['site-visited'] }
                        }]
                },
                populate: {
                    path: 'campaignAdvertisements',
                    model: 'Advertisements',
                    match: {
                        adVerificationStatus: { $eq: true }
                    }
                }
            }).exec();
        // exit after no ads have been found that match defined criteria
        if (campaigns[0]['advertiserCampaigns'].length < 1) {
            return [];
        }
        // filter business owners from affiliates
        let businessOwnersCampaigns = [], affiliatesCampaigns = [];
        try {
            for (var campaigns_1 = __asyncValues(campaigns), campaigns_1_1; campaigns_1_1 = await campaigns_1.next(), !campaigns_1_1.done;) {
                const campaign = campaigns_1_1.value;
                if (campaign['joinedAs'] == 'owner')
                    businessOwnersCampaigns.push(campaign);
                else
                    affiliatesCampaigns.push(campaign);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (campaigns_1_1 && !campaigns_1_1.done && (_a = campaigns_1.return)) await _a.call(campaigns_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // prioritize business owners when a match is found
        if (businessOwnersCampaigns.length > 0)
            return await filterUnservedAds(businessOwnersCampaigns);
        // fallback when business owners' ads has been served before
        else
            return await filterUnservedAds(affiliatesCampaigns);
        async function filterUnservedAds(mixedAds) {
            var e_2, _a, e_3, _b;
            let allCampaignsAds = mixedAds.map(doc => doc['advertiserCampaigns']), allAds = [], allFilteredAds = [];
            if (allCampaignsAds.length < 1 || allCampaignsAds[0] == null) {
                return [];
            }
            try {
                for (var allCampaignsAds_1 = __asyncValues(allCampaignsAds), allCampaignsAds_1_1; allCampaignsAds_1_1 = await allCampaignsAds_1.next(), !allCampaignsAds_1_1.done;) {
                    const doc = allCampaignsAds_1_1.value;
                    doc.map(value => allAds.push(value['campaignAdvertisements']));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (allCampaignsAds_1_1 && !allCampaignsAds_1_1.done && (_a = allCampaignsAds_1.return)) await _a.call(allCampaignsAds_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var allAds_1 = __asyncValues(allAds), allAds_1_1; allAds_1_1 = await allAds_1.next(), !allAds_1_1.done;) {
                    const doc = allAds_1_1.value;
                    doc.map(value => allFilteredAds.push(value));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (allAds_1_1 && !allAds_1_1.done && (_b = allAds_1.return)) await _b.call(allAds_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                return allFilteredAds.map(ad => ad['_id']);
            }
            catch (_c) {
                return [];
            }
        }
        // define filtering criteria, campaign bid amount,
        // publisher preffered bid amount and related filters, always return one instance of a particular campaign
        // check targeted location for a particular campaign, and serve when incoming request location matches
        // with priority, else fallback to a heuristic selection, based on bid amount, whether the ad has been served 
        // the day of this request. Previously unserved ads are prioritized for selection.
    }
}
/**
 *
 * Builds possible ads from estimated device size, and updates current visitor's session
 * @param {Request} req request object
 * @param {Response} res response object
 */
async function estimatedDeviceSizeAdsBuilder(req, res) {
    console.log(req['client-location']);
    await new AdDataSession(req, res);
}
exports.estimatedDeviceSizeAdsBuilder = estimatedDeviceSizeAdsBuilder;
