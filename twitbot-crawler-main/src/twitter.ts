import { HTTPResponse, Page } from "puppeteer";
import { createCursor, GhostCursor } from 'ghost-cursor';
import { EventEmitter } from 'events';

import { request } from "./request";
import { sleep } from "./utils";

export class Twitter extends EventEmitter {
    private cursor: GhostCursor;
    private refreshCount = 0;

    constructor(
        private readonly page: Page,
        private readonly refreshCountReset: number,
        private readonly account: {
            username: string,
            password: string,
            phoneNumber: string
        }
    ) {
        super();

        this.cursor = createCursor(page);
        this.page.setRequestInterception(true);
        this.page.on('request', req => {
            if (req.url() == 'https://api.twitter.com/1.1/onboarding/task.json' && req.method() == 'POST') {
                console.log(JSON.parse(req.postData() as string).subtask_inputs[0]);
            }
            req.continue();
        });
    }

    async newPostsListener(resp: HTTPResponse) {
        const url = resp.url();

        if (!url.includes('home.json')) return;

        const body = await resp.json();
        
        await this.savePosts(Object.values(body.globalObjects.tweets), body.globalObjects.users);
        // await this.saveProfiles(Object.values(body.globalObjects.users));
    }

    async enterPhoneNumber(): Promise<boolean> {
        console.log('typing phone number');

        const { page, account } = this;

        await page.type('input[type="text"]', account.phoneNumber);
        await page.keyboard.press('Enter');

        const resp = await page.waitForResponse('https://api.twitter.com/1.1/onboarding/task.json');
        const body = await resp.json();
        console.log(body);
        
        if (body.errors) {
            const [{ message }] = body.errors;
            if (message == 'Wrong password!') {
                return false;
            }
            return this.enterPhoneNumber();
        }

        return true;
    }

    async enterPhoneNumberOneMoreTime() {
        console.log('enter phone number one more time');

        const { page, account } = this;

        await page.type('input[type="tel"]', account.phoneNumber);
        await page.keyboard.press('Enter');
    }

    async enterUsername() {
        const { page, account } = this;

        console.log('waiting for username input...');
        await Promise.race([
            page.waitForSelector('input[type="text"]'),
            page.waitForSelector('input[name="username"]')
        ]);
        console.log('typing username...');
        await page.type('input[type="text"]', account.username);
        await page.keyboard.press('Enter');
        console.log('waiting for password input...');

        const resp = await page.waitForResponse('https://api.twitter.com/1.1/onboarding/task.json');
        const body = await resp.json();
        console.log('enter username response', body);

        let shouldWaitForPasswordInput = false;

        if (
            body.subtasks.length
            && (body.subtasks[0].subtask_id == 'AccountDuplicationCheck'
            || body.subtasks[0].subtask_id == 'LoginEnterAlternateIdentifierSubtask')
        ) {
            await page.waitForSelector('input[type="text"]');
            shouldWaitForPasswordInput = await this.enterPhoneNumber();
        }

        return shouldWaitForPasswordInput ? page.waitForSelector('input[name="password"]') : null;
    }

    async enterPassword() {
        console.log('typing password...');

        const { page, account } = this;

        await page.type('input[name="password"]', account.password);
        await page.keyboard.press('Enter');
        const resp = await page.waitForResponse('https://api.twitter.com/1.1/onboarding/task.json');
        const body = await resp.json();

        const subtask = body.subtasks?.[0];
        if (subtask.subtask_id == 'LoginAcid') return this.enterPhoneNumberOneMoreTime();
    }

    async login() {
        const { page, account } = this;

        await page.setExtraHTTPHeaders({
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
        });

        console.log('go to login page...');
        await page.goto('https://twitter.com/i/flow/login');
        await this.enterUsername();
        await this.enterPassword();

        console.log('getting tweets');
    }

    listenForNewPosts() {
        this.page.on('response', this.newPostsListener.bind(this));
    }

    removeListeners() {
        this.page.off('response', this.newPostsListener.bind(this));
    }

    async savePosts(posts: any[], users: any) {
        for await (let post of posts) {
            const isShorten = (post.full_text as string).endsWith('…');

            post.profile = users[post.user_id_str];

            if (isShorten) {
                this.emit('shortened-post', post);
                continue;
            }

            await request({
                url: '/tweets',
                method: 'POST',
                data: post
            });
        }
    }

    async saveProfiles(profiles: any[]) {
        for await (let profile of profiles) {
            await request({
                url: '/profiles',
                method: 'POST',
                data: profile
            });
        }
    }

    async keepBrowsing(): Promise<void> {
        if (this.refreshCount >= this.refreshCountReset) {
            console.log('reloading...');
            await this.removeListeners();
            await this.page.reload();
            await this.listenForNewPosts();
            this.refreshCount = 0;
            return this.keepBrowsing();
        }

        await sleep(5000);
        console.log('navigate to explore...');
        await this.cursor.click('a[href="/explore"]');
        console.log('back to home...');
        await sleep(5000);
        await this.cursor.click('a[href="/home"]');
        await sleep(5000);
        this.refreshCount++;
        return this.keepBrowsing();
    }

    async watch() {
        await this.login();
        console.log('logon');
        this.listenForNewPosts();
        await this.keepBrowsing();
    }
}