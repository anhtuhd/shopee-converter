async function test() {
  // Link sản phẩm Shopee dài thực tế (Sữa tắm Lifebuoy 800gr của Unilever - Shop Mall)
  const productUrl = 'https://shopee.vn/S%E1%BB%AFa-T%E1%BA%AFm-Lifebuoy-800gr-i.26947756.24281325893';
  console.log('Testing fetch product metadata for:', productUrl);

  const userAgents = [
    'facebookexternalhit/1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  ];

  for (const ua of userAgents) {
    console.log(`\n--------------------------------------------`);
    console.log(`Using User-Agent: ${ua}`);
    try {
      const res = await fetch(productUrl, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      console.log('Status code:', res.status);
      console.log('Headers:');
      for (const [key, val] of res.headers.entries()) {
        if (['content-type', 'server', 'x-request-id', 'cache-control'].includes(key)) {
          console.log(`  ${key}: ${val}`);
        }
      }

      const html = await res.text();
      console.log('HTML Length:', html.length);

      // Check if Cloudflare is active
      if (html.includes('cloudflare') || html.includes('Cloudflare') || html.includes('captcha') || html.includes('Challenge')) {
        console.log('❌ BLOCKED BY CLOUDFLARE/CAPTCHA');
      } else {
        // Extract og:title, og:image
        const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
        const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);

        console.log('og:title:', titleMatch ? titleMatch[1] : 'NOT FOUND');
        console.log('og:image:', imageMatch ? imageMatch[1] : 'NOT FOUND');
        console.log('HTML <title> tag:', titleTag ? titleTag[1] : 'NOT FOUND');
      }

    } catch (e) {
      console.error('Fetch error:', e.message);
    }
  }
}

test();
