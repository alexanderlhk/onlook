import { api } from '@/trpc/client';
import { createDefaultUserSettings, fromUserSettings, toUserSettings } from '@onlook/db';
import type { ChatSettings, UserSettings } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from './manager';

export class UserSettingsManager {
    settings: UserSettings = toUserSettings(createDefaultUserSettings(''));

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        this.restoreSettings();
        reaction(
            () => this.userManager.user,
            () => {
                this.restoreSettings();
            }
        );
    }

    async restoreSettings() {
        const user = this.userManager.user;
        if (!user) {
            console.warn('Cannot restore settings: No user found');
            return;
        }
        const settings = await api.user.settings.get.query({ userId: user.id });
        this.settings = settings;
    }

    async update(newSettings: Partial<UserSettings>) {
        const user = this.userManager.user;
        if (!user) {
            console.error('Cannot update settings: No user found');
            return;
        }

        this.settings = {
            ...this.settings,
            ...newSettings,
        };

        await api.user.settings.upsert.mutate({
            userId: user.id,
            settings: fromUserSettings(user.id, this.settings),
        });
    }

    async updateChat(newSettings: Partial<ChatSettings>) {
        await this.update({ ...this.settings, chat: { ...this.settings.chat, ...newSettings } });
    }
}
