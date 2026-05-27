async function test() {
  const url1 = "https://shopee.vn/product/50508055/19993120616";
  console.log('Testing standardized URL format:', url1);

  try {
    const res = await fetch(url1, {
      method: 'GET',
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
      }
    });

    console.log('Status code:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);

    if (html.includes('cloudflare') || html.includes('Cloudflare') || html.includes('captcha') || html.includes('Challenge')) {
      console.log('❌ BLOCKED BY CLOUDFLARE');
    } else {
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
    console.error('Error:', e.message);
  }
}

test();
