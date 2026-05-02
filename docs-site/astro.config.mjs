// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const repoUrl = 'https://github.com/seekseep/ai-webapp-security-handson-2026';

export default defineConfig({
  site: 'https://seekseep.github.io',
  base: '/ai-webapp-security-handson-2026',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'AI Webapp Security ハンズオン 2026',
      description:
        'Web アプリケーションのセキュリティとパフォーマンスを手を動かして学ぶハンズオン教材',
      defaultLocale: 'root',
      locales: {
        root: { label: '日本語', lang: 'ja' },
      },
      social: [
        { icon: 'github', label: 'GitHub', href: repoUrl },
      ],
      sidebar: [
        { label: '01. 環境構築', autogenerate: { directory: '01-environment' } },
        { label: '02. 認証・認可', autogenerate: { directory: '02-auth' } },
        { label: '03. インジェクション', autogenerate: { directory: '03-injection' } },
        { label: '04. パフォーマンス', autogenerate: { directory: '04-performance' } },
      ],
      editLink: {
        baseUrl: `${repoUrl}/edit/main/docs-site/`,
      },
      lastUpdated: true,
    }),
  ],
});
