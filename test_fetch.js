async function test() {
  const url = 'https://vn.shp.ee/QzzRNzP1';
  const res = await fetch(url, { method: 'HEAD' });
  console.log(res.url);
}
test();
