'use strict';

import cheerio from 'cheerio';
import nodeHtmlToImage from 'node-html-to-image';
import DiscordJS from 'discord.js';

import Blogger from '../../utils/google/blogger..js';
import Drive from "../../utils/google/drive.js";

import BaseCommand from "../baseCommand.js";

export default class PostDocCommand extends BaseCommand {
    execute(params) {
        const site = params[1], title = params[2], url = params[3];
        const fileId = /https:\/\/docs\.google\.com\/document\/d\/([\d\w\-]+)\/edit\?usp=sharing/.exec(params)[1];
        this.ack();
        
        Drive.getDocHTML(fileId).then(html => {
            const $ = cheerio.load(html);
            const bodyAttribs = $('body')[0].attribs;
            bodyAttribs.style = bodyAttribs.style.replace(/0pt/, '72pt');
            const imgContainer = $('span > img');
            if (imgContainer.length) {
                imgContainer[0].parent.attribs.style = imgContainer[0].parent.attribs.style.replace(/width: ?[\d\.]+px;/, '').replace(/height: ?[\d\.]+px;/, '');
            }
            html = $.html().replace(/\u25CF/g,'\\25CF').replace(/\u25CB/g, '\\25CB').replace(/\u25A0/g, '\\25A0');
            
            Blogger.createPost({
                'county': site,
                'title': title,
                'html': html
            }).catch(console.error).then(r => {
                nodeHtmlToImage({ 'html': html }).then(pngData => {
                    // const allSocialMedia = [
                    //     // '3c3a747769747465723a3836313632313332303637323231353036303e',   // twitter
                    //     '3c3a6c70643a3831363232333038323732383738333930323e',           // state fb
                    //     // 'f09f87b3',                                                     // ncc fb
                    //     // 'f09f87b0',                                                     // kent fb
                    //     // 'f09f87b8'                                                      // sussex fb
                    //     'test'                                                          // fb group
                    // ];
                    // const content = `The US Dollar has had an explicitly inflationary monetary policy since at least 2008.  `+
                    //         `Several global economic factors that US policymakers take for granted have mostly kept inflation `+
                    //         `in check despite "quantitative easing" essentially printing new money to finance astronomical `+
                    //         `government deficits.  COVID not only resulted in an exhorbitant amount of deficit financed spending as well, `+
                    //         `but also severely hampered the global economy due to reduced production and interruptions in the supply `+
                    //         `chain.  Now throw in more global uncertainty following Putin's invasion of Ukraine, plus the bite of `+
                    //         `sanctions that are seeing Russia and China using other currencies for trade, and it's not entirely untrue `+
                    //         `that recent inflation may well be at least partially that "Putin did it!", but this far too easily lets `+
                    //         `American policymakers off the hook for decades of prolifigate spending.  Also, if corporate greed is going to `+
                    //         `explain inflation, there should probably be an explanation as to why corporations suddenly became greedy `+
                    //         `as if they weren't before.`;
                    // FacebookSubmissionResponder.post(content, [ pngData ], allSocialMedia).then(r => {
                    //     console.log(r);
                    //     GMailer.sendChairEmail('Will McVay <mcvay.will@gmail.com', 'Resolution', fixedHtmlData, [
                    //         { 'data': pngData, 'type': 'image/png', 'name': 'Resolution.png' }
                    //     ]).catch(console.error).then(r => {
                    //             console.log('Email Sent')
                    //         });

                        this.channel.send(r.data.url, new DiscordJS.MessageAttachment(pngData)).then(r => this.complete());
                    // });
                });
            });
        });
    }
}