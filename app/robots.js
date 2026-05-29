export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/admin', '/api/auth'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'Google-Extended',
          'PerplexityBot',
          'anthropic-ai',
          'cohere-ai'
        ],
        allow: '/',
        disallow: ['/admin', '/api/admin', '/api/auth'],
      }
    ],
    sitemap: 'https://pishare.site/sitemap.xml',
  }
}
