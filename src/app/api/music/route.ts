import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music');
    if (!fs.existsSync(musicDir)) {
      return NextResponse.json({ tracks: [] });
    }

    const files = fs.readdirSync(musicDir);
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

    const tracks = files
      .filter((file) => audioExtensions.includes(path.extname(file).toLowerCase()))
      .map((file) => ({
        name: file.replace(/\.[^/.]+$/, ''),
        url: `/music/${file}`,
        filename: file,
      }));

    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [] }, { status: 500 });
  }
}
