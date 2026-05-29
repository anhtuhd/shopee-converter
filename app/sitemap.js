export default function sitemap() {
  const baseUrl = 'https://pishare.site';
  const routes = ['', '/instructions', '/notes', '/login', '/register'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }));
}
