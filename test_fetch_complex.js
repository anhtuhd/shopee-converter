async function test() {
  const complexUrl = "https://shopee.vn/opaanlp/50508055/19993120616?__mobile__=1&credential_token=8wEwiDL7XpqJqXPs2HFxc3ySFqQkHNcukbthmD52TK&exp_group=rollout&gads_t_sig=gqRjZGVrxHCFomtpsTE0MjUxOnRzc19zZGtfa2V5omt20QABpGFsZ2_SAAAAZKNkZWvAomN0xEAAAAAMRoz0ZUjQw0QlRa--FjB0AKnHQPF7xv4DyGj9-GQwqn4zSdB6gztmw7ebmtsZs9FPJxlVqctc57WUE3IRqmNpcGhlcnRleHTEkQAAAAx4M3MJc0dt6GF9G9bTYHDezVOOqlmAkEsOKkSWmVBJaniQs5Ms6gcNkmpfSvgDODamDo3Yd3GEWJKFKj4qi6-57T9dxf3v5pbrajr7EofD7IDKfdfMGqd8uGyxTPJhIKdo3cn1dGGwZ8iLlSzDmzU_FrERYNlzZ52M2DIZO4Vusp_pRqhdNYBttZfiSu4&mmp_pid=an_17384330546&uls_trackid=55ntqnn600oi&utm_campaign=id_9GwvspflWx&utm_content=----&utm_medium=affiliates&utm_source=an_17384330546&utm_term=ey8faaszz3yz";
  
  console.log('Testing complex product url fetch using facebookexternalhit/1.1...');

  try {
    const res = await fetch(complexUrl, {
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
