/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'AStream',
  tagline: 'Promise based library for building streams of asynchronous events.',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'robianmcd', // Usually your GitHub org/user name.
  projectName: 'a-stream', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'AStream',
      logo: {
        alt: 'AStream Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'guides/getting-started',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/robianmcd/a-stream',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Github Issues',
              href: 'https://github.com/robianmcd/a-stream/issues',
            },
          ],
        },
      ],
      copyright: ` `, //Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/robianmcd/a-stream/edit/master/docs-site/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
