import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/lib/vapid';

export async function GET() {
  try {
    const keys = getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch public VAPID key' }, { status: 500 });
  }
}
