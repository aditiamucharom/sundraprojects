import fs from 'fs';
import path from 'path';
import webPush from 'web-push';
import { configureWebPush } from './vapid';

const subscriptionsFilePath = path.join(process.cwd(), 'src/lib/pushSubscriptions.json');

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function getSubscriptions(): PushSubscriptionInput[] {
  if (fs.existsSync(subscriptionsFilePath)) {
    try {
      const data = fs.readFileSync(subscriptionsFilePath, 'utf8');
      return JSON.parse(data) as PushSubscriptionInput[];
    } catch (e) {
      console.error('Error reading subscriptions:', e);
    }
  }
  return [];
}

export function saveSubscription(subscription: PushSubscriptionInput): void {
  const subscriptions = getSubscriptions();
  const exists = subscriptions.some((sub) => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    try {
      fs.mkdirSync(path.dirname(subscriptionsFilePath), { recursive: true });
      fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save subscriptions:', e);
    }
  }
}

export function removeSubscription(endpoint: string): void {
  let subscriptions = getSubscriptions();
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  try {
    fs.mkdirSync(path.dirname(subscriptionsFilePath), { recursive: true });
    fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to update subscriptions after removal:', e);
  }
}

export async function sendPushNotification(payload: { title: string; body: string; url?: string }) {
  configureWebPush();
  const subscriptions = getSubscriptions();
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(
        sub as any,
        JSON.stringify(payload)
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Push subscription expired/invalid, removing...', sub.endpoint);
        removeSubscription(sub.endpoint);
      } else {
        console.error('Error sending push notification:', error);
      }
    }
  });

  await Promise.all(sendPromises);
}
