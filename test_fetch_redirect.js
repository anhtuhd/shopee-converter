async function test() {
  const currentUrl = 'https://s.shopee.vn/3ILF0NvM';
  console.log('Testing url:', currentUrl);

  try {
    console.log('\n--- Test Method 1: Fetch with redirect: manual ---');
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    console.log('Response status:', res.status);
    console.log('Response headers:');
    for (const [key, val] of res.headers.entries()) {
      console.log(`  ${key}: ${val}`);
    }
    const location = res.headers.get('location');
    console.log('Location header:', location);

  } catch (err) {
    console.error('Error in method 1:', err);
  }

  try {
    console.log('\n--- Test Method 2: Fetch with redirect: follow ---');
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      }
    });

    console.log('Response status:', res.status);
    console.log('Response URL:', res.url);

  } catch (err) {
    console.error('Error in method 2:', err);
  }
}

test();
