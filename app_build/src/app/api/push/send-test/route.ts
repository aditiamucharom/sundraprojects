import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/pushService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message } = body;

    await sendPushNotification({
      title: title || 'Sundra Test Push',
      body: message || 'This is a test web push notification from Sundra!',
      url: '/dashboard/today'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
