function standardizeShopeeUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 1. Dạng -i.shopId.itemId
    const matchI = pathname.match(/-i\.(\d+)\.(\d+)/);
    if (matchI) {
      return `https://shopee.vn/product/${matchI[1]}/${matchI[2]}`;
    }

    // 2. Dạng /product/shopId/itemId
    const matchProduct = pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (matchProduct) {
      return `https://shopee.vn/product/${matchProduct[1]}/${matchProduct[2]}`;
    }

    // 3. Dạng /anything/shopId/itemId
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const itemId = parts[parts.length - 1];
      const shopId = parts[parts.length - 2];
      if (/^\d+$/.test(shopId) && /^\d+$/.test(itemId)) {
        return `https://shopee.vn/product/${shopId}/${itemId}`;
      }
    }

    // Fallback
    urlObj.search = '';
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

const testUrls = [
  "https://shopee.vn/S%E1%BB%AFa-T%E1%BA%AFm-Lifebuoy-800gr-i.26947756.24281325893?smtt=0.0.9",
  "https://shopee.vn/opaanlp/50508055/19993120616?__mobile__=1&credential_token=8wEwiD...",
  "https://shopee.vn/product/12345/67890",
  "https://shopee.vn/something-else?query=123"
];

console.log("=== KIỂM THỬ CHUẨN HÓA URL SHOPEE ===");
testUrls.forEach(url => {
  console.log(`\nInput : ${url}`);
  console.log(`Output: ${standardizeShopeeUrl(url)}`);
});
