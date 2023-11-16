'use strict';

import DISCORD, { MessageAttachment } from 'discord.js';
import fs from 'fs';
import buffer from 'buffer';
import FormData from 'form-data';

import CREDS from '../constants/creds.js';
import ROLES from '../constants/roles.js';
import USERS from '../constants/users.js';
import CHANS from '../constants/channels.js';

import UTILS from '../utils/utils.js';

const LINK = /https?:\/\/\S*/g;
const FB_LINK_E = /https?:\/\/.*facebook\.com\/events\/\d+/;
const FB_LINK_I = /^https?:\/\/.*facebook\.com\/(\d*)\/posts\/(.*)\/?$/;
const FB_LINK_R = /^https?:\/\/.*facebook\.com\/(.*)\/posts\/(.*)\/?$/;
const FB_LINK_M = /^https?:\/\/.*facebook\.com\/story\.php\?story_fbid=(\d+)&id=(\d+)$/;
const FB_LINK_A = /facebook\.com/;
const FB_SHARE = /https:\/\/.*facebook\.com\/l\.php\?u=(.*)&h=.*/;
const STATUS_LINK = /https?:\/\/(?:www\.)?twitter\.com\/.+\/status\/(\d+)(?:\?s=\d+)?/;

const PAGES = {
    '3c3a6c70643a3831363232333038323732383738333930323e': '209602722401635',    // state
    'f09f87b3': '110759904713194',                                              // ncc
    'f09f87b0': '152735338075471',                                              // kent
    'f09f87b8': '142120825820677',                                              // sussex
    'test': '220378084639110'                                                   // group
};
const PAGE_NAMES = [
    'LPDel',
    'nccnpd',
    'kcdelp',
    'sussexlp'
];
const HASH_MAP = {
    'LPD': '3c3a6c70643a3831363232333038323732383738333930323e',
    'NCC': 'f09f87b3',
    'KENT': 'f09f87b0',
    'SUSSEX': 'f09f87b8'
};
const STATE_ACCESS = CREDS.fb_access['3c3a6c70643a3831363232333038323732383738333930323e'];
const NCC_ACCESS = CREDS.fb_access['f09f87b3'];
const KENT_ACCESS = CREDS.fb_access['f09f87b0'];
const SUSSEX_ACCESS = CREDS.fb_access['f09f87b8'];

export default class FacebookSubmissionResponder {
    static post(content, attachments, locations) {
        const postPromises = [];
        if (locations.includes('3c3a747769747465723a3836313632313332303637323231353036303e')) {
            locations = locations.filter(l => l !== '3c3a747769747465723a3836313632313332303637323231353036303e');
            postPromises.push(new Promise((resolve, reject) => {
                const streamResolver = attachments.map(a => {
                    return new Promise((resolve, reject) => {
                        const buffer = [];
                        a.on('data', chunk => buffer.push(chunk));
                        a.on('end', () => resolve(Buffer.concat(buffer)));
                    });
                });
                Promise.all(streamResolver).then(attachmentBuffers => {
                    const data = {
                        'key': CREDS.webhook,
                        'attachments': attachmentBuffers.map(a => a.toString('base64')),
                        'content': content
                    };
                    UTILS.postHttpsRequest('https://lpdelaware.api.stdlib.com/twitter-hook@dev/postTweet/', data).then(resolve);
                });
            }));
        }
        if (locations.filter(l => Object.keys(PAGES).includes(l)).length) {
            postPromises.push(new Promise((resolve, reject) => {
                // upload any photos and post to the first "location"
                const uploadUri = `https://graph.facebook.com/v11.0/${PAGES[locations[0]]}/photos?access_token=${CREDS.fb_access[locations[0]]}`;
                const postUri = `https://graph.facebook.com/v11.0/${PAGES[locations[0]]}/feed?access_token=${CREDS.fb_access[locations[0]]}`;
                const uploadPromises = attachments.map(a => {
                    const uploadContent = new FormData();
                    uploadContent.append('source', a);
                    fs.writeFileSync(process.cwd()+'/data/copy.txt', `data:image/png;base64,${a.toString('base64')}`);
                    return UTILS.postHttpsRequest(uploadUri+'&temporary=true&published=false', uploadContent, uploadContent.getHeaders());
                });
                Promise.all(uploadPromises).then(uploadResponses => {
                    const postContent = {
                        'message': content
                    };
                    postContent['attached_media'] = uploadResponses.map(r => {
                        return {
                            'media_fbid': r.id
                        };
                    });
                    UTILS.postHttpsRequest(postUri, postContent).then(r => {
                        console.log(r);
                        // loop through the remaining locations (including the group and share the original post there)
                        const sharePromises = locations.map(l => {
                            console.log(l);
                            if (l === locations[0]) return Promise.resolve();
                            if (l === '3c3a747769747465723a3836313632313332303637323231353036303e') return Promise.resolve();
                            const shareContent = {
                                'link': `https://www.facebook.com/${r.id}`
                            };
                            return UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES[l]}/feed?access_token=${CREDS.fb_access[l]}`, shareContent);
                        });
                        Promise.all(sharePromises).then(r => {
                            console.log(r);
                            resolve(r);
                        });
                    });
                });
            }));
        }
        return Promise.all(postPromises);
    }

    static handleMessage(message) {
        if (message.mentions.users.has(USERS.ME) && message.content.toLowerCase().includes('smpost')) {
            message.channel.messages.fetch(message.reference.messageID).then(this.rigMessage.bind(this))
        } else if (message.channel.id === CHANS.FACEBOOK_CHAN && !message.channel.bot && !message.content.startsWith('!!')) {
            this.rigMessage(message);
        }
    }

    static rigMessage(message) {
        message.react(':npd:989704388870291526');
        message.react('🇳');
        message.react('🇰');
        message.react('🇸');
        if (message.content.length < 280) message.react(':twitter:861621320672215060');
        message.react('👍');
        message.react('❌');

        const collector = message.createReactionCollector(() => true, {});
        collector.on('collect', this.fbApproval(collector));
    }

    static fbApproval(collector) {
        const reactions = [];
        return (r, u) => {
            if (u.bot) return;
    
            const guild = r.message.channel.guild;
            const message = r.message;
    
            guild.members.fetch(u.id).then(member => {
                if (!member.roles.cache.intersect(new DISCORD.Collection([ [ROLES.CONTRIBUTORS,] ])).size)
                    return r.users.remove(u).catch();

                const reactHash = Buffer.from(r.emoji.toString()).toString('hex');

                if (reactHash === 'e29d8c') {
                    message.reactions.removeAll();
                    collector.stop();
                    return;
                } else if (Object.keys(PAGES).includes(reactHash) || reactHash === '3c3a747769747465723a3836313632313332303637323231353036303e') {
                    if (reactions.includes(reactHash)) reactions.splice(reactions.indexOf(reactHash), 1);
                    reactions.push(reactHash);
                    return;
                } else if (reactHash !== 'f09f918d') return;
    
                message.reactions.cache.forEach(existingReact => {
                    const currentHash = Buffer.from(existingReact.emoji.toString()).toString('hex');
                    if (currentHash === 'e29d8c') existingReact.remove();
                });
                reactions.forEach((v, i, a) => {
                    if (!message.reactions.cache.find(r => Buffer.from(r.emoji.toString()).toString('hex') === v && r.users.cache.size > 1)) a[i] = '';
                });

                if (reactions.includes('3c3a747769747465723a3836313632313332303637323231353036303e')) {
		            console.log('Posting to Twitter...');
                    const status = message.content.match(STATUS_LINK);
                    const fbLink = FB_LINK_M.exec(message.content)
                            || FB_LINK_I.exec(message.content)
                            || FB_LINK_R.exec(message.content)
                            || FB_LINK_E.exec(message.content)
                            || FB_LINK_A.exec(message.content);
                    if (fbLink && fbLink[0].length === message.content.length && (!isNaN(fbLink[1]) || !PAGE_NAMES.includes(fbLink[1]))) {
                        message.channel.send(`Twitter does not handle FB links well.  Please use Facebook to extract the content or take `+
                                `a screenshot and submit it directly to post to Twitter, or include a caption describing the link as the `+
                                `link will not load a preview of the Facebook post for Twitter.`);
                    } else {
                        const fbInfo = [Promise.resolve()];

                        const postData = {
                            'key': CREDS.webhook,
                            'proposer': message.author.id,
                            'approver': u.id
                        };

                        const fbResolve = [Promise.resolve()];

                        if (fbLink && isNaN(fbLink[1])) {
                            console.log('Resolving Facebook link to extract and share content to Twitter...');
                            console.log(`Found a Facebook profile name (${fbLink[1]}), need to resolve the profile ID...`);
                            console.log(`Running GET request against: https://graph.facebook.com/v11.0/${fbLink[1]}?access_token={{ACCESS_TOKEN}}...`);
                            fbResolve.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${fbLink[1]}?access_token=${STATE_ACCESS}`));
                        }

                        Promise.all(fbResolve).then(resData => {
                            let pageId, storyId;
                            if (resData.length > 1) {
                                console.log(`Resolved Facebook profile name.  Parsing profile ID from JSON response:\n${resData[1].toString()}`);
                                pageId = JSON.parse(resData[1].toString()).id;
                                storyId = fbLink[2];
                                console.log(`Resolved Facebook profile ID: ${pageId}, reading content for story ID: ${storyId}`);
                            } else if (FB_LINK_M.test(message.content)) {
                                console.log(`Facebook profile ID provided as a second query parameter.  Flipping parameters for Graph API request...`);
                                pageId = fbLink[2];
                                storyId = fbLink[1];
                                console.log(`Facebook profile ID: ${pageId}, story ID: ${storyId}`);
                            } else if (FB_LINK_I.test(message.content)) {
                                console.log(`Facebook profile ID provided as first URL parameter.  Extracting for Graph API request...`);
                                pageId = fbLink[1];
                                storyId = fbLink[2];
                                console.log(`Facebook profile ID: ${pageId}, story ID: ${storyId}`);
                            }
                            if (fbLink) {
                                console.log('Extracting Facebook content...');
                                console.log(`Getting content for ${pageId}_${storyId} using GET: https://graph.facebook.com/v11.0/${pageId}_${storyId}?access_token={{ACCESS_TOKEN}}`);
                                fbInfo.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${pageId}_${storyId}?access_token=${STATE_ACCESS}`));
                                console.log(`Getting attachments for ${pageId}_${storyId} using GET: https://graph.facebook.com/v11.0/${pageId}_${storyId}/attachments?access_token={{ACCESS_TOKEN}}`);
                                fbInfo.push(UTILS.getHttpsRequest(`https://graph.facebook.com/v11.0/${pageId}_${storyId}/attachments?access_token=${STATE_ACCESS}`));
                            }
                            Promise.all(fbInfo).then(fbData => {
                                let attachmentList = [], content;
                                if (fbData.length > 1) {
                                    fbData.shift();
                                    fbData = fbData.map(d => JSON.parse(d.toString()));
                                    console.log(`Found Facebook content.  Extracting message and shared URLs from JSON response:\n${fbData[0]}`);
                                    content = fbData[0].message || '';
                                    if (fbData[1].data[0].type === 'share') {
                                        content += `\n${unescape(FB_SHARE.exec(fbData[1].data[0].url)[1])}`;
                                    } else if (fbData[1].data[0].type === 'photo') {
                                        console.log(`Found attached photo, extracting source from JSON response:\n${fbData[1]}`);
                                        content += fbLink[0];
                                        attachmentList = [{ 'url': fbData[1].data[0].media.image.src }];
                                    }
                                } else {
                                    content = message.content;
                                    attachmentList = message.attachments;
                                }
                                console.log('Resolving attachments...');
                                const attachments = attachmentList.map(a => UTILS.getHttpsRequest(a.url));
                                attachments.push(Promise.resolve());
                                
                                Promise.all(attachments).then(buffers => {
                                    if (status && status[0].length === message.content.length) {
                                        postData.rtId = status[1];
                                    } else {
                                        postData['content'] = content;
                                        if (buffers.length > 1) postData['attachments'] = /**attachmentList.map(a => a.url);*/buffers.filter(b => b).map(b => b.toString('base64'));
                                        if (status) {
                                            postData['containsTweet'] = status[1];
                                            postData['content'] = postData['content'].replace(STATUS_LINK, '').trim();
                                        }
                                    }

                                    console.log('Invoking Twitter Middleware...');
                                    UTILS.postHttpsRequest('https://lpdelaware.api.stdlib.com/twitter-hook@dev/postTweet/', postData).then(r => {
                                        if (!r.error) {
                                            message.channel.send(`https://twitter.com/${r.twitter.user.id_str}/status/${r.twitter.id_str}`);
                                        } else {
                                            message.channel.send(`There was an error posting to Twitter.  Please try again later.`);
                                            console.error(r.error);
                                        }
                                    }).catch(console.log);
                                });
                            });
                        });
                        reactions.splice(reactions.findIndex(i => i === '3c3a747769747465723a3836313632313332303637323231353036303e'), 1);
                    }
                }
                
                if (!reactions.filter(i => Object.keys(PAGES).includes(i)).length) return;
                console.log('Posting to Facebook...');
                const urls = [];
                
		        console.log('Searching for links...');
                for (let url; (url=LINK.exec(message.content)) && !message.attachments.length;) {
		            console.log(`Found ${urls.length+1} urls...`, url);
                    urls.push({ 't': url[0], 'i': url.index });
                }
                let replace = false;
                if (urls.length === 1 && !message.attachments.size) {
                    if (!urls[0].i || urls[0].i+urls[0].t.length === message.content.length) replace = true;
                }
                console.log(`Replace: ${replace}`);
                const content = {
                    'message': (!replace?message.content:message.content.replace(urls[0].t, '')).trim()
                };
                if (urls.length === 1 && !message.attachments.size) content['link'] = urls[0].t;
                console.log(`Message Content: ${content}`);
		        console.log('Uploading attachments...');
                const attachments = message.attachments.map(a => {
                    const photoContent = {
                        'url': a.url,
                        'published': false,
                        'temporary': true
                    };
		            console.log(`Uploading attachment using POST to https://graph.facebook.com/11.0/${PAGES[reactions[0]]}/photos?access_token={{ACCESS_TOKEN}}\nPayload:\n${JSON.stringify(photoContent)}`);
                    return UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES[reactions[0]]}/photos?access_token=${CREDS.fb_access[reactions[0]]}`, photoContent);
                });
                attachments.push(Promise.resolve());
                
                Promise.all(attachments).then(buffers => {
                    if (buffers.length > 1) {
                        console.log(`Content uploaded, JSON response:\n${JSON.stringify(buffers)}`);
                        console.log('Attaching media...');
                        content['attached_media'] = buffers.filter(b => b).map(b => {
                            return {
                                'media_fbid': b.id
                            };
                        });
                    }
                    console.log('Invoking Facebook API...');
                    console.log(`Publishing content using POST to: https://graph.facebook.com/v11.0/${PAGES[reactions[0]]}/feed?access_token={{ACCESS_TOKEN}}\nPayload:\n${JSON.stringify(content)}`);
                    UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES[reactions[0]]}/feed?access_token=${CREDS.fb_access[reactions[0]]}`, content)
                            .catch(e => console.log(`ERROR: ${e}`))
                            .then(res => {
				        console.log(`JSON response:\n${JSON.stringify(res)}`);
                        if (res.error && res.error.error_subcode === 1609008 && FB_LINK_E.exec(message.content)) {
                            return message.channel.send(`<@${USERS.ME}> cannot post events that aren't co-hosted by the LPD.  Please contact <@${USERS.WILL}> to share this event.`)
                        } else if (res.error) {
                            return message.channel.send(`There was an error \`${res.error.error_user_title}\` encountered sharing to Facebook.  Please contact <@${USERS.WILL}> to share this post.`);
                        }
                        const groupShare = {
                            'link': `https://www.facebook.com/${res.id}`
                        };
                        UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES['test']}/feed?access_token=${CREDS.fb_access[reactions[0]]}`, groupShare)
                                .catch(e => console.error(`ERROR: ${e}`))
                                .then(groupRes => {
                            message.channel.send(`https://www.facebook.com/${res.id}`);
                            if (reactions.length > 1) {
                                reactions.splice(0, 1);
                                const isLocal = FB_LINK_R.exec(message.content) || [];
                                const shareContent = {
                                    'link': PAGE_NAMES.includes(isLocal[1])?isLocal[0]:`https://www.facebook.com/${res.id}`
                                };
                                const shareCalls = reactions.map(page => {
                                    return UTILS.postHttpsRequest(`https://graph.facebook.com/v11.0/${PAGES[page]}/feed?access_token=${CREDS.fb_access[page]}`, shareContent);
                                });
                                Promise.all(shareCalls).catch(console.log);
                            }
                        });
                    });
                });

                collector.stop();
            });
        }
    }

    static reconnect(client) {
        client.channels.resolve(CHANS.FACEBOOK_CHAN).messages.fetch({ 'cache': true }).then(messages => {
            messages = messages.filter(m => m.reactions.cache.size === 4 || (m.reactions.cache.size === 0 && !m.content.startsWith('!!')));
            messages.forEach(m => {
                const collector = m.createReactionCollector(() => true, {});
                collector.on('collect', this.fbApproval(collector));
                if (m.reactions.cache.size === 0 && !m.author.bot) {
                    m.react(':npd:989704388870291526');
                    if (m.content.length < 280) m.react(':twitter:861621320672215060');
                    m.react('👍');
                    m.react('❌');
                }
            });
        });
    }
}
