"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * checks if cookie exists and returns all cookies, or cookie value if cookie name is passed
 * @param {string} cookieString
 * @param {string} cookieName
 */
function extractRequestCookies(cookieString, cookieName) {
    if (cookieString == undefined)
        return;
    let c = decodeURIComponent(cookieString), d, e = {};
    if (c.indexOf(';') != -1)
        d = c.split(';');
    else
        d = c;
    if (typeof d == 'string')
        e[d.split('=')[0].trim()] = d.split('=')[1].trim();
    else
        d.map(p => e[p.split('=')[0].trim()] = p.split('=')[1].trim());
    if (typeof cookieName != 'undefined')
        return e[cookieName];
    return e;
}
exports.extractRequestCookies = extractRequestCookies;
