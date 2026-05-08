import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';

const callOdoo = (client: any, method: string, args: any[]) => {
  return new Promise((resolve, reject) => {
    client.methodCall(method, args, (err: any, value: any) => {
      if (err) reject(err);
      else resolve(value);
    });
  });
};

export async function POST(req: Request) {
  try {
    const { url, db, username, api_key } = await req.json();

    if (!url || !db || !username || !api_key) {
      return NextResponse.json({ success: false, error: 'Missing required fields' });
    }

    const cleanUrl = url.replace(/\/$/, '').replace('https://', '');
    
    const commonClient = xmlrpc.createSecureClient({
      host: cleanUrl,
      port: 443,
      path: '/xmlrpc/2/common'
    });

    const uid = await callOdoo(commonClient, 'authenticate', [db, username, api_key, {}]);

    if (uid) {
      return NextResponse.json({ success: true, message: 'Connection Successful! UID: ' + uid });
    } else {
      return NextResponse.json({ success: false, error: 'Authentication Failed. Please check your Email and API Key.' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Connection Failed: ' + err.message });
  }
}
