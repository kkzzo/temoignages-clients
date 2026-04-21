import crypto from 'crypto';

// Bunny signed token generator
// Docs: https://docs.bunny.net/docs/stream-embed-token-authentication
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const guid = searchParams.get('guid');
  const referer = request.headers.get('referer') || '';

  // Block requests not coming from our domain
  const allowedOrigins = ['wall.aielio.com', 'localhost'];
  const isAllowed = allowedOrigins.some(o => referer.includes(o));
  if (!isAllowed) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!guid || !/^[a-f0-9-]{36}$/i.test(guid)) {
    return Response.json({ error: 'Invalid guid' }, { status: 400 });
  }

  const tokenKey = process.env.BUNNY_TOKEN_KEY;

  // If no token key configured yet, return unsigned URL (still works)
  if (!tokenKey) {
    return Response.json({
      url: `https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID}/${guid}?autoplay=true&preload=true`,
      protected: false,
    });
  }

  // Generate signed token (expires in 4 hours)
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const expires = Math.floor(Date.now() / 1000) + 4 * 3600;
  const hashableBase = tokenKey + guid + expires;
  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('hex');

  const url = `https://iframe.mediadelivery.net/embed/${libraryId}/${guid}?token=${token}&expires=${expires}&autoplay=true&preload=true`;

  return Response.json({ url, protected: true, expires });
}
