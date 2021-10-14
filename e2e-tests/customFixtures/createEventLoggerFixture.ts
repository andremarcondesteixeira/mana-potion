import { Page } from "@playwright/test";
import { LoadEventDetail, PlaywrightFixtures } from "./sharedTypes";

export default async function createEventLogger(
    { }: PlaywrightFixtures,
    use: (r: (page: Page) => Promise<EventLogger>) => Promise<void>
) {
    await use(async (page: Page): Promise<EventLogger> => {
        const eventLogger = new EventLogger();
        await page.exposeFunction('logEventDetail', (eventDetail: LoadEventDetail) => {
            eventLogger.push(eventDetail);
        });
        await page.addScriptTag({
            content: `
                addEventListener('hlpp:load', event => {
                    logEventDetail(event.detail);
                });
            `
        });
        return eventLogger;
    });
};

export class EventLogger {
    eventDetailLog: LoadEventDetail[] = [];
    subscribers: EventLogObserver[] = [];

    push(eventDetail: LoadEventDetail) {
        this.eventDetailLog.push(eventDetail);
        this.notifyAllSubscribers(eventDetail);
    }

    notifyAllSubscribers(eventDetail: LoadEventDetail) {
        this.subscribers.forEach(subscriber => {
            subscriber.notify(eventDetail);
        });
    }

    subscribe(subscriber: EventLogObserver) {
        this.subscribers.push(subscriber);
        this.eventDetailLog.forEach(eventDetail => {
            subscriber.notify(eventDetail);
        });
    }
}

export type EventLogObserver = {
    notify: (eventDetail: LoadEventDetail) => void;
};

export function waitUntilTargetElementHasReceivedContent(
    targetElementSelector: string,
    loadedFileName: string,
    eventLogger: EventLogger
) {
    return new Promise<void>(resolve => eventLogger.subscribe({
        notify: (eventDetail: LoadEventDetail) => {
            if (
                eventDetail.responseStatusCode === 200
                && eventDetail.targetElementSelector === targetElementSelector
                && eventDetail.url.endsWith(loadedFileName)
            ) {
                resolve();
            }
        },
    }));
}
