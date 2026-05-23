import fs from 'fs';
import path from 'path';
import webPush from 'web-push';

const keysFilePath = path.join(process.cwd(), 'src/lib/vapidKeys.json');

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function getVapidKeys(): VapidKeys {
  if (fs.existsSync(keysFilePath)) {
    try {
      const data = fs.readFileSync(keysFilePath, 'utf8');
      return JSON.parse(data) as VapidKeys;
    } catch (e) {
      console.error('Error reading VAPID keys, regenerating...', e);
    }
  }

  const keys = webPush.generateVAPIDKeys();
  const vapidKeys: VapidKeys = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };

  try {
    fs.mkdirSync(path.dirname(keysFilePath), { recursive: true });
    fs.writeFileSync(keysFilePath, JSON.stringify(vapidKeys, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save VAPID keys to disk:', e);
  }

  return vapidKeys;
}

export function configureWebPush() {
  const keys = getVapidKeys();
  webPush.setVapidDetails(
    'mailto:admin@sundra.local',
    keys.publicKey,
    keys.privateKey
  );
}
