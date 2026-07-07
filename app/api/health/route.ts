import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/kotak-neo/client';

export async function GET() {
  try {
    const health = await checkHealth();
    return NextResponse.json(health);
  } catch (error: any) {
    console.error('Next.js API error querying Kotak Neo service health:', error);
    return NextResponse.json(
      { status: 'offline', error: error.message || 'Service is unreachable' },
      { status: 500 }
    );
  }
}
