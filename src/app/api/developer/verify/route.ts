import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const devPassword = process.env.DEVELOPER_PASSWORD || 'itsmyappdev2026';
    
    if (password === devPassword) {
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
