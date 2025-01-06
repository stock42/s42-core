import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'

import react from '@astrojs/react'

// https://astro.build/config
export default defineConfig({
	site: 'https://s42core.com',
	build: {
		assets: 'assets_astro',
	},
	// base: 's42-core',
	integrations: [
		starlight({
			title: 'S42 Core',
			description:
				's42-core is a powerful and flexible library built on Bun.js, designed to simplify the development of applications, especially those using microservices and cell-based architectures. This library supports the creation of modular and reusable software components and streamlines the implementation of high-performance monorepos.',
			defaultLocale: 'root',
			social: {
				github: 'https://github.com/stock42/s42-core',
				linkedin: 'https://www.linkedin.com/in/cesarcasas/',
				twitter: 'https://x.com/stock42ok',
			},
			locales: {
				root: {
					label: 'Home',
					lang: 'en',
				},
				en: {
					label: 'English',
					lang: 'en',
				},
				es: {
					label: 'Español',
					lang: 'es-ES',
				},
			},
			sidebar: [
				{
					label: 'Guides',
					items: [{ label: 'Example Guide', link: '/guides/example/' }],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
			customCss: ['./src/tailwind.css'],
			logo: {
				src: './public/s42-corefav.png',
			},
			favicon: '/s42-corefav.png',
		}),
		tailwind({ applyBaseStyles: false }),
		react({
			include: ['**/*.jsx', '**/*.tsx'],
			experimentalReactChildren: true,
		}),
	],
})
