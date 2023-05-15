import puppeteer from 'puppeteer';

import { config } from './config';
import { TweetCrawling } from './tweet-crawling';
import { Twitter } from './twitter';

(async () => {
    const browser = await puppeteer.launch({
        // executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        // headless: false,
        slowMo: 100,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            // '--user-data-dir=/Users/user_name/Library/Application Support/Google/Chrome',
            // '--new-window',
            // '--profile-directory=Profile 7',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote', // <- this one should be used with --no--sandbox
            '--disable-gpu'
        ],
        defaultViewport: {
            width: 1280,
            height: 720
        }
    });
    
    const [page] = await browser.pages();
    const secondPage = await browser.newPage();

    await page.bringToFront();
    
    const twitter = new Twitter(page, config.refreshCountReset, {
        username: config.username,
        password: config.password,
        phoneNumber: config.phoneNumber
    });

    const tweetCrawling = new TweetCrawling(secondPage);

    twitter.on('shortened-post', post => tweetCrawling.queue(post));

    await twitter.watch();
})();