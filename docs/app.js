'use strict'

const CONTENT_BASE = './content'
const REPOSITORY_BLOB_BASE = 'https://github.com/stock42/s42-core/blob/main'
const REPOSITORY_RAW_BASE = 'https://raw.githubusercontent.com/stock42/s42-core/main'
const DEFAULT_DOCUMENT = 'GETTING_STARTED'

const categoryOrder = [
	'start',
	'examples',
	'http',
	'events',
	'data',
	'operations',
	'reference',
]

const docsCatalog = [
	{
		id: 'GETTING_STARTED',
		category: 'start',
		file: 'GETTING_STARTED.md',
		title: { en: 'Start here', es: 'Empieza aquí' },
		description: {
			en: 'Install, run a route, create a module, write an atomic transaction, and emit an event.',
			es: 'Instala, ejecuta una ruta, crea un módulo, escribe una transacción atómica y emite un evento.',
		},
	},
	{
		id: 'FRAMEWORK',
		category: 'start',
		file: 'FRAMEWORK.md',
		title: { en: 'Framework overview', es: 'Resumen del framework' },
		description: {
			en: 'Architecture, package scope, installation, and the complete framework map.',
			es: 'Arquitectura, alcance del paquete, instalación y mapa completo del framework.',
		},
	},
	{
		id: 'MODULE_AUTH',
		category: 'examples',
		file: 'MODULE_AUTH.md',
		title: { en: 'Auth middleware module', es: 'Módulo middleware Auth' },
		description: {
			en: 'A complete mws module with before/after request behavior.',
			es: 'Un módulo mws completo con comportamiento before/after request.',
		},
	},
	{
		id: 'MODULE_OPERATORS',
		category: 'examples',
		file: 'MODULE_OPERATORS.md',
		title: { en: 'Operators domain module', es: 'Módulo de dominio Operators' },
		description: {
			en: 'A full module with controllers, events, middleware requirements, and initialization.',
			es: 'Un módulo full con controllers, eventos, middleware e inicialización.',
		},
	},
	{
		id: 'MODULE_SHARE',
		category: 'examples',
		file: 'MODULE_SHARE.md',
		title: { en: 'Shared module', es: 'Módulo Share' },
		description: {
			en: 'Reusable module metadata and the boundaries of share loading.',
			es: 'Metadata reutilizable y límites de carga de módulos share.',
		},
	},
	{
		id: 'MODULES',
		category: 'http',
		file: 'MODULES.md',
		title: { en: 'Modules', es: 'Modules' },
		description: {
			en: 'Discovery, manifests, load order, controller metadata, middleware, and event conventions.',
			es: 'Discovery, manifests, orden de carga, metadata, middleware y convenciones de eventos.',
		},
	},
	{
		id: 'SERVER',
		category: 'http',
		file: 'SERVER.md',
		title: { en: 'Server', es: 'Server' },
		description: {
			en: 'Bun.serve bootstrap, options, cluster waiting, helpers, and lifecycle boundaries.',
			es: 'Bootstrap Bun.serve, opciones, espera de cluster, helpers y ciclo de vida.',
		},
	},
	{
		id: 'ROUTECONTROLLERS',
		category: 'http',
		file: 'ROUTECONTROLLERS.md',
		title: { en: 'RouteControllers', es: 'RouteControllers' },
		description: {
			en: 'Native routes, fallback matching, request parsing, global hooks, headers, and CORS.',
			es: 'Rutas nativas, matching fallback, parseo, hooks globales, headers y CORS.',
		},
	},
	{
		id: 'CONTROLLER',
		category: 'http',
		file: 'CONTROLLER.md',
		title: { en: 'Controller', es: 'Controller' },
		description: {
			en: 'Paths, HTTP methods, local middleware ordering, module metadata, and statistics.',
			es: 'Paths, métodos HTTP, orden de middleware, metadata y estadísticas.',
		},
	},
	{
		id: 'RESPONSE',
		category: 'http',
		file: 'RESPONSE.md',
		title: { en: 'Response builder', es: 'Response builder' },
		description: {
			en: 'Status, headers, JSON, text, HTML, redirects, and response snapshots.',
			es: 'Status, headers, JSON, texto, HTML, redirects y snapshots de response.',
		},
	},
	{
		id: 'EVENTSDOMAIN',
		category: 'events',
		file: 'EVENTSDOMAIN.md',
		title: { en: 'EventsDomain', es: 'EventsDomain' },
		description: {
			en: 'Distributed event routing, delivery modes, Redis/SQS adapters, liveness, and guarantees.',
			es: 'Routing distribuido, modos de entrega, Redis/SQS, liveness y garantías.',
		},
	},
	{
		id: 'SQL',
		category: 'data',
		file: 'SQL.md',
		title: { en: 'SQL', es: 'SQL' },
		description: {
			en: 'PostgreSQL, MySQL, and SQLite CRUD, filters, transactions, indexes, errors, and raw SQL.',
			es: 'CRUD PostgreSQL, MySQL y SQLite, filtros, transacciones, índices, errores y SQL raw.',
		},
	},
	{
		id: 'SQLITE',
		category: 'data',
		file: 'SQLITE.md',
		title: { en: 'Direct SQLite', es: 'SQLite directo' },
		description: {
			en: 'The synchronous bun:sqlite wrapper, schema helpers, filters, results, and current limits.',
			es: 'El wrapper sincrónico bun:sqlite, schema, filtros, resultados y límites actuales.',
		},
	},
	{
		id: 'MONGODB',
		category: 'data',
		file: 'MONGODB.md',
		title: { en: 'MongoDB', es: 'MongoDB' },
		description: {
			en: 'Singleton connection, collections, ObjectId, pagination, and internal storage helpers.',
			es: 'Conexión singleton, colecciones, ObjectId, paginación y storage interno.',
		},
	},
	{
		id: 'REDISDB',
		category: 'data',
		file: 'REDISDB.md',
		title: { en: 'Redis / Valkey', es: 'Redis / Valkey' },
		description: {
			en: 'Connections, cache, hashes, counters, pub/sub, serialization, and shutdown.',
			es: 'Conexiones, cache, hashes, contadores, pub/sub, serialización y cierre.',
		},
	},
	{
		id: 'DEPENDENCIES',
		category: 'data',
		file: 'DEPENDENCIES.md',
		title: { en: 'Dependencies', es: 'Dependencies' },
		description: {
			en: 'The process-local static dependency registry and resource ownership.',
			es: 'El registro estático de dependencias por proceso y ownership de recursos.',
		},
	},
	{
		id: 'CLUSTER',
		category: 'operations',
		file: 'CLUSTER.md',
		title: { en: 'Cluster', es: 'Cluster' },
		description: {
			en: 'Bun worker spawning, IPC, broadcasts, signals, and supervision boundaries.',
			es: 'Workers Bun, IPC, broadcasts, señales y límites de supervisión.',
		},
	},
	{
		id: 'SSE',
		category: 'operations',
		file: 'SSE.md',
		title: { en: 'Server-sent events', es: 'Server-sent events' },
		description: {
			en: 'Direct streams, event formatting, abort handling, and routing integration.',
			es: 'Streams directos, formato de eventos, abort y routing.',
		},
	},
	{
		id: 'CORESTATS',
		category: 'operations',
		file: 'CORESTATS.md',
		title: { en: 'CoreStats', es: 'CoreStats' },
		description: {
			en: 'Optional runtime inventory and host metrics endpoint, including its security boundary.',
			es: 'Endpoint opcional de inventario y métricas, incluida su frontera de seguridad.',
		},
	},
	{
		id: 'LOGGER',
		category: 'operations',
		file: 'LOGGER.md',
		title: { en: 'Logger', es: 'Logger' },
		description: {
			en: 'Levels, environment configuration, runtime controls, and custom sinks.',
			es: 'Niveles, configuración de entorno, controles de runtime y sinks.',
		},
	},
	{
		id: 'TEST',
		category: 'operations',
		file: 'TEST.md',
		title: { en: 'Test helpers', es: 'Helpers de test' },
		description: {
			en: 'Console-oriented smoke-test output helpers.',
			es: 'Helpers de output para smoke tests orientados a consola.',
		},
	},
	{
		id: 'ALL_EN',
		category: 'reference',
		file: 'ALL_EN.md',
		localized: false,
		title: { en: 'Master technical reference', es: 'Referencia técnica maestra (EN)' },
		description: {
			en: 'The complete source-audited framework contract in one document.',
			es: 'El contrato completo del framework, auditado contra source, en un documento.',
		},
	},
	{
		id: 'MAILGUN',
		category: 'reference',
		file: 'MAILGUN.md',
		title: { en: 'Mailgun (internal)', es: 'Mailgun (interno)' },
		description: {
			en: 'Repository-only email helper and security behavior.',
			es: 'Helper interno de email y su comportamiento de seguridad.',
		},
	},
	{
		id: 'VIEWTEMPLATE',
		category: 'reference',
		file: 'VIEWTEMPLATE.md',
		title: { en: 'ViewTemplates (internal)', es: 'ViewTemplates (interno)' },
		description: {
			en: 'Repository-only interpolation helper and escaping boundary.',
			es: 'Helper interno de interpolación y frontera de escaping.',
		},
	},
]

const i18n = {
	en: {
		'search.trigger': 'Search documentation',
		'search.placeholder': 'Search examples, methods, concepts…',
		'search.loading': 'Indexing documentation…',
		'search.ready': 'Type to search every guide and code example.',
		'search.results': count => `${count} ${count === 1 ? 'result' : 'results'}`,
		'search.noResults': 'No matching documentation',
		'search.noResultsHint':
			'Try a method name such as transaction, emit, select, or start.',
		'search.navigate': 'Navigate',
		'search.open': 'Open',
		'sidebar.eyebrow': 'Documentation',
		'sidebar.description':
			'Practical examples first. Exact contracts when you need them.',
		'sidebar.feedback': 'Documentation feedback',
		'sidebar.navigation': 'Documentation navigation',
		'language.label': 'Documentation language',
		'toc.title': 'On this page',
		'toc.empty': 'No sections',
		'footer.source': 'Documentation generated from repository Markdown.',
		'footer.edit': 'View source on GitHub',
		'fallback.notice': 'This guide is currently available in English only.',
		'pagination.previous': 'Previous',
		'pagination.next': 'Next',
		'copy.label': 'Copy',
		'copy.done': 'Copied',
		'copy.status': 'Code copied to clipboard.',
		'heading.link': title => `Link to ${title}`,
		'document.errorTitle': 'Documentation could not be loaded',
		'document.errorBody':
			'Check the connection and try again, or open the source on GitHub.',
		skip: 'Skip to documentation',
		'menu.open': 'Open documentation menu',
		'menu.close': 'Close documentation menu',
		'theme.light': 'Use light theme',
		'theme.dark': 'Use dark theme',
		'search.close': 'Close search',
		categories: {
			start: 'Start',
			examples: 'Complete examples',
			http: 'Framework core',
			events: 'Events',
			data: 'Data',
			operations: 'Operations',
			reference: 'Reference',
		},
	},
	es: {
		'search.trigger': 'Buscar en la documentación',
		'search.placeholder': 'Buscar ejemplos, métodos, conceptos…',
		'search.loading': 'Indexando documentación…',
		'search.ready': 'Escribe para buscar en todas las guías y ejemplos.',
		'search.results': count => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
		'search.noResults': 'No encontramos documentación',
		'search.noResultsHint': 'Prueba un método como transaction, emit, select o start.',
		'search.navigate': 'Navegar',
		'search.open': 'Abrir',
		'sidebar.eyebrow': 'Documentación',
		'sidebar.description':
			'Primero ejemplos prácticos. Contratos exactos cuando los necesites.',
		'sidebar.feedback': 'Feedback de documentación',
		'sidebar.navigation': 'Navegación de documentación',
		'language.label': 'Idioma de la documentación',
		'toc.title': 'En esta página',
		'toc.empty': 'Sin secciones',
		'footer.source': 'Documentación generada desde Markdown del repositorio.',
		'footer.edit': 'Ver source en GitHub',
		'fallback.notice': 'Esta guía está disponible solamente en inglés.',
		'pagination.previous': 'Anterior',
		'pagination.next': 'Siguiente',
		'copy.label': 'Copiar',
		'copy.done': 'Copiado',
		'copy.status': 'Código copiado al clipboard.',
		'heading.link': title => `Enlace a ${title}`,
		'document.errorTitle': 'No se pudo cargar la documentación',
		'document.errorBody':
			'Revisa la conexión e intenta otra vez, o abre el source en GitHub.',
		skip: 'Saltar a la documentación',
		'menu.open': 'Abrir menú de documentación',
		'menu.close': 'Cerrar menú de documentación',
		'theme.light': 'Usar tema claro',
		'theme.dark': 'Usar tema oscuro',
		'search.close': 'Cerrar búsqueda',
		categories: {
			start: 'Comenzar',
			examples: 'Ejemplos completos',
			http: 'Core del framework',
			events: 'Eventos',
			data: 'Datos',
			operations: 'Operaciones',
			reference: 'Referencia',
		},
	},
}

const docsById = new Map(docsCatalog.map(document => [document.id, document]))

const elements = {
	body: document.body,
	navigation: document.querySelector('#docs-navigation'),
	content: document.querySelector('#document-content'),
	toc: document.querySelector('#table-of-contents'),
	categoryBreadcrumb: document.querySelector('#breadcrumb-category'),
	documentBreadcrumb: document.querySelector('#breadcrumb-document'),
	fallbackNotice: document.querySelector('#fallback-notice'),
	pagination: document.querySelector('#document-pagination'),
	editLink: document.querySelector('#edit-link'),
	menuToggle: document.querySelector('#menu-toggle'),
	sidebarBackdrop: document.querySelector('#sidebar-backdrop'),
	themeToggle: document.querySelector('#theme-toggle'),
	searchTrigger: document.querySelector('#search-trigger'),
	searchDialog: document.querySelector('#search-dialog'),
	searchInput: document.querySelector('#search-input'),
	searchClose: document.querySelector('#search-close'),
	searchStatus: document.querySelector('#search-status'),
	searchResults: document.querySelector('#search-results'),
	copyStatus: document.querySelector('#copy-status'),
	metaThemeColor: document.querySelector('meta[name="theme-color"]'),
}

const state = {
	lang: 'en',
	documentId: DEFAULT_DOCUMENT,
	markdownCache: new Map(),
	searchIndexes: new Map(),
	searchResults: [],
	selectedSearchResult: -1,
	headingObserver: null,
	requestVersion: 0,
}

function t(key, value) {
	const translated = i18n[state.lang][key]
	return typeof translated === 'function' ? translated(value) : (translated ?? key)
}

function categoryTitle(category) {
	return i18n[state.lang].categories[category] ?? category
}

function getDocumentTitle(documentDefinition) {
	return documentDefinition.title[state.lang] ?? documentDefinition.title.en
}

function getDocumentDescription(documentDefinition) {
	return documentDefinition.description[state.lang] ?? documentDefinition.description.en
}

function buildDocumentURL(documentId, anchor = '') {
	const url = new URL(window.location.href)
	url.search = ''
	url.searchParams.set('lang', state.lang)
	url.searchParams.set('doc', documentId)
	url.hash = anchor ? `#${anchor}` : ''
	return `${url.pathname}${url.search}${url.hash}`
}

function setLocation(documentId, anchor, replace = false) {
	const url = buildDocumentURL(documentId, anchor)
	window.history[replace ? 'replaceState' : 'pushState'](
		{ documentId, lang: state.lang },
		'',
		url,
	)
}

function readPreference(key) {
	try {
		return window.localStorage.getItem(key)
	} catch {
		return null
	}
}

function writePreference(key, value) {
	try {
		window.localStorage.setItem(key, value)
	} catch {
		// Preferences are optional; navigation remains functional without storage.
	}
}

function resolveInitialState() {
	const params = new URLSearchParams(window.location.search)
	const requestedLanguage = params.get('lang')
	const storedLanguage = readPreference('s42-docs-language')
	const defaultLanguage = document.documentElement.dataset.defaultLang ?? 'en'
	state.lang =
		['en', 'es'].includes(requestedLanguage) ? requestedLanguage
		: ['en', 'es'].includes(storedLanguage) ? storedLanguage
		: defaultLanguage

	const requestedDocument = (params.get('doc') ?? '').toUpperCase()
	state.documentId =
		docsById.has(requestedDocument) ? requestedDocument : DEFAULT_DOCUMENT
}

function applyTranslations() {
	document.documentElement.lang = state.lang
	document.querySelectorAll('[data-i18n]').forEach(element => {
		const key = element.dataset.i18n
		if (key) element.textContent = t(key)
	})

	document.querySelector('.skip-link').textContent = t('skip')
	document
		.querySelector('#docs-sidebar')
		.setAttribute('aria-label', t('sidebar.navigation'))
	document
		.querySelector('.language-switch')
		.setAttribute('aria-label', t('language.label'))
	document.querySelector('.toc').setAttribute('aria-label', t('toc.title'))
	document.querySelector('#search-title').textContent = t('search.trigger')
	elements.searchInput.placeholder = t('search.placeholder')
	elements.searchClose.setAttribute('aria-label', t('search.close'))
	elements.menuToggle.setAttribute(
		'aria-label',
		elements.body.classList.contains('sidebar-open') ? t('menu.close') : t('menu.open'),
	)

	document.querySelectorAll('[data-lang]').forEach(button => {
		button.setAttribute('aria-pressed', String(button.dataset.lang === state.lang))
	})

	updateThemeButtonLabel()
}

function renderNavigation() {
	elements.navigation.replaceChildren()

	for (const category of categoryOrder) {
		const documents = docsCatalog.filter(document => document.category === category)
		if (!documents.length) continue

		const section = document.createElement('section')
		section.className = 'nav-group'
		const heading = document.createElement('h2')
		heading.className = 'nav-group__title'
		heading.textContent = categoryTitle(category)
		section.append(heading)

		const list = document.createElement('ul')
		for (const documentDefinition of documents) {
			const item = document.createElement('li')
			const link = document.createElement('a')
			link.className = 'doc-nav-link'
			link.href = buildDocumentURL(documentDefinition.id)
			link.dataset.documentId = documentDefinition.id
			link.textContent = getDocumentTitle(documentDefinition)
			if (documentDefinition.id === state.documentId) {
				link.classList.add('is-active')
				link.setAttribute('aria-current', 'page')
			}
			link.addEventListener('click', event => {
				event.preventDefault()
				void renderDocument(documentDefinition.id, { push: true })
			})
			item.append(link)
			list.append(item)
		}

		section.append(list)
		elements.navigation.append(section)
	}
}

function updateActiveNavigation() {
	document.querySelectorAll('.doc-nav-link').forEach(link => {
		const active = link.dataset.documentId === state.documentId
		link.classList.toggle('is-active', active)
		if (active) link.setAttribute('aria-current', 'page')
		else link.removeAttribute('aria-current')
	})
}

async function fetchDocument(documentDefinition, language = state.lang) {
	const requestedLanguage = documentDefinition.localized === false ? 'en' : language
	const cacheKey = `${requestedLanguage}:${documentDefinition.id}`
	if (state.markdownCache.has(cacheKey)) return state.markdownCache.get(cacheKey)

	const fetchLanguage = async candidateLanguage => {
		const response = await fetch(
			`${CONTENT_BASE}/${candidateLanguage}/${documentDefinition.file}`,
		)
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		return response.text()
	}

	let resolvedLanguage = requestedLanguage
	let markdown
	try {
		markdown = await fetchLanguage(requestedLanguage)
	} catch (error) {
		if (requestedLanguage === 'en') throw error
		resolvedLanguage = 'en'
		markdown = await fetchLanguage('en')
	}

	const result = {
		markdown,
		language: resolvedLanguage,
		fallback: resolvedLanguage !== language,
	}
	state.markdownCache.set(cacheKey, result)
	return result
}

function renderLoading() {
	elements.content.innerHTML = `
		<div class="document-loading" role="status">
			<span class="sr-only">Loading documentation</span>
			<span class="loading-bar"></span>
			<span class="loading-bar loading-bar--short"></span>
			<span class="loading-block"></span>
		</div>`
}

function renderError() {
	const wrapper = document.createElement('div')
	wrapper.className = 'document-error'
	const heading = document.createElement('h1')
	heading.textContent = t('document.errorTitle')
	const body = document.createElement('p')
	body.textContent = t('document.errorBody')
	wrapper.append(heading, body)
	elements.content.replaceChildren(wrapper)
	elements.toc.replaceChildren()
}

async function renderDocument(documentId, options = {}) {
	const documentDefinition = docsById.get(documentId) ?? docsById.get(DEFAULT_DOCUMENT)
	const requestVersion = ++state.requestVersion
	state.documentId = documentDefinition.id
	updateActiveNavigation()
	closeSidebar()
	renderLoading()
	elements.fallbackNotice.hidden = true
	elements.categoryBreadcrumb.textContent = categoryTitle(documentDefinition.category)
	elements.documentBreadcrumb.textContent = getDocumentTitle(documentDefinition)

	const anchor = options.anchor ?? ''
	if (options.push) setLocation(documentDefinition.id, anchor)

	try {
		const result = await fetchDocument(documentDefinition)
		if (requestVersion !== state.requestVersion) return
		if (!window.marked?.parse) throw new Error('Markdown renderer unavailable')

		elements.content.innerHTML = window.marked.parse(result.markdown, {
			gfm: true,
			breaks: false,
		})
		enhanceArticle()
		renderPagination()
		updateSourceLink(documentDefinition, result.language)
		updateDocumentMetadata(documentDefinition)

		elements.fallbackNotice.hidden = !result.fallback
		elements.fallbackNotice.textContent = result.fallback ? t('fallback.notice') : ''

		window.requestAnimationFrame(() => {
			const requestedAnchor = anchor || safeDecode(window.location.hash.slice(1))
			if (requestedAnchor) {
				const target = document.getElementById(requestedAnchor)
				target?.scrollIntoView({ block: 'start' })
				if (options.push && target) {
					target.tabIndex = -1
					target.focus({ preventScroll: true })
				}
			} else {
				window.scrollTo({ top: 0, behavior: 'auto' })
				const title = elements.content.querySelector('h1')
				if (options.push && title) {
					title.tabIndex = -1
					title.focus({ preventScroll: true })
				}
			}
		})
	} catch (error) {
		console.error('Unable to load documentation:', error)
		if (requestVersion === state.requestVersion) renderError()
	}
}

function updateDocumentMetadata(documentDefinition) {
	const title = getDocumentTitle(documentDefinition)
	const description = getDocumentDescription(documentDefinition)
	const canonicalURL = new URL(
		buildDocumentURL(documentDefinition.id),
		window.location.origin,
	).href
	document.title = `${title} · S42-Core Docs`
	document.querySelector('meta[name="description"]')?.setAttribute('content', description)
	document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalURL)
	document
		.querySelector('meta[property="og:title"]')
		?.setAttribute('content', document.title)
	document
		.querySelector('meta[property="og:description"]')
		?.setAttribute('content', description)
	document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalURL)
}

function updateSourceLink(documentDefinition, resolvedLanguage) {
	const sourceFile =
		resolvedLanguage === 'es' ?
			`DOCUMENTATION/${documentDefinition.file.replace(/\.md$/, '.es.md')}`
		:	`DOCUMENTATION/${documentDefinition.file}`
	elements.editLink.href = `${REPOSITORY_BLOB_BASE}/${sourceFile}`
}

function slugify(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function safeDecode(value) {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

function assignHeadingIds() {
	const counts = new Map()
	const headings = Array.from(elements.content.querySelectorAll('h1, h2, h3'))
	for (const heading of headings) {
		if (heading.tagName === 'H1') {
			heading.id = 'document-title'
			continue
		}
		const base = slugify(heading.textContent) || 'section'
		const count = counts.get(base) ?? 0
		counts.set(base, count + 1)
		heading.id = count === 0 ? base : `${base}-${count + 1}`

		const anchor = document.createElement('a')
		anchor.className = 'heading-anchor'
		anchor.href = `#${heading.id}`
		anchor.setAttribute('aria-label', t('heading.link', heading.textContent))
		anchor.textContent = '#'
		heading.prepend(anchor)
	}
	return headings
}

function renderTableOfContents(headings) {
	state.headingObserver?.disconnect()
	elements.toc.replaceChildren()
	const sections = headings.filter(
		heading => heading.tagName === 'H2' || heading.tagName === 'H3',
	)
	if (!sections.length) {
		const empty = document.createElement('span')
		empty.textContent = t('toc.empty')
		empty.className = 'search-result__document'
		elements.toc.append(empty)
		return
	}

	const list = document.createElement('ul')
	for (const heading of sections) {
		const item = document.createElement('li')
		const link = document.createElement('a')
		link.href = `#${heading.id}`
		link.dataset.headingId = heading.id
		link.dataset.level = heading.tagName.slice(1)
		link.textContent = heading.textContent.replace(/^#/, '')
		link.addEventListener('click', event => {
			event.preventDefault()
			heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
			setLocation(state.documentId, heading.id, true)
		})
		item.append(link)
		list.append(item)
	}
	elements.toc.append(list)

	state.headingObserver = new IntersectionObserver(
		entries => {
			const visible = entries
				.filter(entry => entry.isIntersecting)
				.sort(
					(left, right) => left.boundingClientRect.top - right.boundingClientRect.top,
				)[0]
			if (!visible) return
			elements.toc.querySelectorAll('a').forEach(link => {
				link.classList.toggle('is-active', link.dataset.headingId === visible.target.id)
			})
		},
		{ rootMargin: '-15% 0px -72% 0px', threshold: [0, 1] },
	)
	sections.forEach(heading => state.headingObserver.observe(heading))
}

function resolveDocumentFromMarkdownLink(href) {
	if (!href || /^(https?:|mailto:|tel:)/i.test(href)) return null
	const [path, rawAnchor = ''] = href.split('#')
	if (!path.toLowerCase().endsWith('.md')) return null

	const filename = safeDecode(path.split('/').pop() ?? '')
	const normalized = filename.replace(/\.es\.md$/i, '.md').toUpperCase()
	if (normalized === 'README.MD' || normalized === 'README.ES.MD') {
		return { documentId: 'FRAMEWORK', anchor: rawAnchor }
	}
	const definition = docsCatalog.find(
		document => document.file.toUpperCase() === normalized,
	)
	return definition ? { documentId: definition.id, anchor: rawAnchor } : null
}

function enhanceLinks() {
	elements.content.querySelectorAll('a[href]').forEach(link => {
		const href = link.getAttribute('href')
		const internal = resolveDocumentFromMarkdownLink(href)
		if (internal) {
			link.href = buildDocumentURL(internal.documentId, internal.anchor)
			link.addEventListener('click', event => {
				event.preventDefault()
				void renderDocument(internal.documentId, {
					push: true,
					anchor: internal.anchor,
				})
			})
			return
		}

		if (href?.startsWith('#')) {
			link.addEventListener('click', () => {
				setLocation(state.documentId, href.slice(1), true)
			})
			return
		}

		if (href && href.split('#')[0].toLowerCase().endsWith('.md')) {
			const [rawPath, rawAnchor = ''] = href.split('#')
			const repositoryPath = rawPath.replace(/^\.\//, '').replace(/^\.\.\//, '')
			link.href = `${REPOSITORY_BLOB_BASE}/${repositoryPath}${rawAnchor ? `#${rawAnchor}` : ''}`
			link.target = '_blank'
			link.rel = 'noreferrer'
			return
		}

		if (/^https?:/i.test(href ?? '')) {
			link.target = '_blank'
			link.rel = 'noreferrer'
		}
	})
}

function enhanceImages() {
	elements.content.querySelectorAll('img[src]').forEach(image => {
		const source = image.getAttribute('src') ?? ''
		const assetMatch = source.match(
			/(?:DOCUMENTATION\/assets|\.\.\/assets|\.\/assets)\/(.+)$/,
		)
		if (assetMatch)
			image.src = `${REPOSITORY_RAW_BASE}/DOCUMENTATION/assets/${assetMatch[1]}`
		image.loading = 'lazy'
		image.decoding = 'async'
	})
}

async function copyText(value) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value)
		return
	}
	const textarea = document.createElement('textarea')
	textarea.value = value
	textarea.style.position = 'fixed'
	textarea.style.opacity = '0'
	document.body.append(textarea)
	textarea.select()
	document.execCommand('copy')
	textarea.remove()
}

function enhanceCodeBlocks() {
	elements.content.querySelectorAll('pre').forEach(pre => {
		if (pre.parentElement?.classList.contains('code-block')) return
		const code = pre.querySelector('code')
		const languageClass = Array.from(code?.classList ?? []).find(name =>
			name.startsWith('language-'),
		)
		const language = languageClass?.replace('language-', '') ?? 'text'

		const wrapper = document.createElement('div')
		wrapper.className = 'code-block'
		const toolbar = document.createElement('div')
		toolbar.className = 'code-block__toolbar'
		const label = document.createElement('span')
		label.className = 'code-block__language'
		label.textContent = language
		const copyButton = document.createElement('button')
		copyButton.className = 'copy-button'
		copyButton.type = 'button'
		copyButton.textContent = t('copy.label')
		copyButton.addEventListener('click', async () => {
			try {
				await copyText(code?.textContent ?? pre.textContent ?? '')
				copyButton.textContent = t('copy.done')
				elements.copyStatus.textContent = t('copy.status')
				window.setTimeout(() => {
					copyButton.textContent = t('copy.label')
				}, 1_600)
			} catch (error) {
				console.error('Unable to copy code:', error)
			}
		})

		toolbar.append(label, copyButton)
		pre.replaceWith(wrapper)
		wrapper.append(toolbar, pre)
	})
}

function enhanceArticle() {
	const headings = assignHeadingIds()
	enhanceLinks()
	enhanceImages()
	enhanceCodeBlocks()
	renderTableOfContents(headings)
}

function renderPagination() {
	elements.pagination.replaceChildren()
	const index = docsCatalog.findIndex(document => document.id === state.documentId)
	const previous = docsCatalog[index - 1]
	const next = docsCatalog[index + 1]

	if (previous) elements.pagination.append(createPaginationLink(previous, 'previous'))
	else elements.pagination.append(document.createElement('span'))
	if (next) elements.pagination.append(createPaginationLink(next, 'next'))
}

function createPaginationLink(documentDefinition, direction) {
	const link = document.createElement('a')
	link.className = `pagination-link pagination-link--${direction}`
	link.href = buildDocumentURL(documentDefinition.id)
	const label = document.createElement('span')
	label.className = 'pagination-link__direction'
	label.textContent = t(`pagination.${direction}`)
	const title = document.createElement('span')
	title.className = 'pagination-link__title'
	title.textContent = getDocumentTitle(documentDefinition)
	link.append(label, title)
	link.addEventListener('click', event => {
		event.preventDefault()
		void renderDocument(documentDefinition.id, { push: true })
	})
	return link
}

function openSidebar() {
	elements.body.classList.add('sidebar-open')
	elements.sidebarBackdrop.hidden = false
	elements.menuToggle.setAttribute('aria-expanded', 'true')
	elements.menuToggle.setAttribute('aria-label', t('menu.close'))
}

function closeSidebar() {
	elements.body.classList.remove('sidebar-open')
	elements.sidebarBackdrop.hidden = true
	elements.menuToggle.setAttribute('aria-expanded', 'false')
	elements.menuToggle.setAttribute('aria-label', t('menu.open'))
}

function setLanguage(language) {
	if (!['en', 'es'].includes(language) || language === state.lang) return
	state.lang = language
	writePreference('s42-docs-language', language)
	applyTranslations()
	renderNavigation()
	setLocation(state.documentId, '', true)
	void renderDocument(state.documentId)
	if (elements.searchDialog.open) void prepareSearch()
}

function resolveTheme() {
	const stored = readPreference('s42-docs-theme')
	if (stored === 'light' || stored === 'dark') return stored
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
	document.documentElement.dataset.theme = theme
	elements.metaThemeColor?.setAttribute(
		'content',
		theme === 'dark' ? '#0d1119' : '#f7f8fb',
	)
	updateThemeButtonLabel()
}

function updateThemeButtonLabel() {
	const current = document.documentElement.dataset.theme
	elements.themeToggle.setAttribute(
		'aria-label',
		t(current === 'dark' ? 'theme.light' : 'theme.dark'),
	)
}

function toggleTheme() {
	const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
	writePreference('s42-docs-theme', next)
	applyTheme(next)
}

function stripMarkdown(markdown) {
	return markdown
		.replace(/```[^\n]*\n?/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[*_>#|~-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function normalizeSearch(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
}

function sectionsFromMarkdown(documentDefinition, markdown) {
	const lines = markdown.split('\n')
	const sections = []
	const counts = new Map()
	let current = {
		heading: getDocumentTitle(documentDefinition),
		anchor: '',
		lines: [],
	}

	const pushCurrent = () => {
		const content = stripMarkdown(current.lines.join('\n'))
		if (content || !sections.length) {
			sections.push({
				documentId: documentDefinition.id,
				documentTitle: getDocumentTitle(documentDefinition),
				category: documentDefinition.category,
				heading: stripMarkdown(current.heading),
				anchor: current.anchor,
				content,
				description: getDocumentDescription(documentDefinition),
			})
		}
	}

	for (const line of lines) {
		const headingMatch = line.match(/^(#{2,3})\s+(.+)$/)
		if (!headingMatch) {
			current.lines.push(line)
			continue
		}

		pushCurrent()
		const headingText = stripMarkdown(headingMatch[2])
		const base = slugify(headingText) || 'section'
		const count = counts.get(base) ?? 0
		counts.set(base, count + 1)
		current = {
			heading: headingText,
			anchor: count === 0 ? base : `${base}-${count + 1}`,
			lines: [],
		}
	}
	pushCurrent()
	return sections
}

async function buildSearchIndex() {
	if (state.searchIndexes.has(state.lang)) return state.searchIndexes.get(state.lang)

	const sections = (
		await Promise.all(
			docsCatalog.map(async documentDefinition => {
				try {
					const result = await fetchDocument(documentDefinition, state.lang)
					return sectionsFromMarkdown(documentDefinition, result.markdown)
				} catch (error) {
					console.error(`Unable to index ${documentDefinition.id}:`, error)
					return []
				}
			}),
		)
	).flat()

	state.searchIndexes.set(state.lang, sections)
	return sections
}

function scoreSearchEntry(entry, tokens) {
	const documentTitle = normalizeSearch(entry.documentTitle)
	const heading = normalizeSearch(entry.heading)
	const description = normalizeSearch(entry.description)
	const content = normalizeSearch(entry.content)
	let score = 0

	for (const token of tokens) {
		const present =
			documentTitle.includes(token) ||
			heading.includes(token) ||
			description.includes(token) ||
			content.includes(token)
		if (!present) return 0

		if (documentTitle === token) score += 18
		else if (documentTitle.startsWith(token)) score += 12
		else if (documentTitle.includes(token)) score += 8
		if (heading === token) score += 14
		else if (heading.startsWith(token)) score += 9
		else if (heading.includes(token)) score += 6
		if (description.includes(token)) score += 3
		if (content.includes(token)) score += 1
	}
	return score
}

function createSnippet(content, token) {
	if (!content) return ''
	const normalized = normalizeSearch(content)
	const index = normalized.indexOf(token)
	const start = Math.max(0, index < 0 ? 0 : index - 55)
	const end = Math.min(content.length, start + 150)
	return `${start > 0 ? '…' : ''}${content.slice(start, end).trim()}${end < content.length ? '…' : ''}`
}

function searchIndex(index, query) {
	const normalizedQuery = normalizeSearch(query)
	if (!normalizedQuery) return []
	const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
	return index
		.map(entry => ({
			...entry,
			score: scoreSearchEntry(entry, tokens),
			snippet: createSnippet(entry.content || entry.description, tokens[0]),
		}))
		.filter(entry => entry.score > 0)
		.sort(
			(left, right) =>
				right.score - left.score || left.documentTitle.localeCompare(right.documentTitle),
		)
		.slice(0, 12)
}

function recommendedSearchResults() {
	return ['GETTING_STARTED', 'MODULES', 'SQL', 'EVENTSDOMAIN', 'SERVER'].map(
		documentId => {
			const documentDefinition = docsById.get(documentId)
			return {
				documentId,
				documentTitle: getDocumentTitle(documentDefinition),
				category: documentDefinition.category,
				heading: getDocumentTitle(documentDefinition),
				anchor: '',
				snippet: getDocumentDescription(documentDefinition),
			}
		},
	)
}

function renderSearchResults(results) {
	state.searchResults = results
	state.selectedSearchResult = results.length ? 0 : -1
	elements.searchResults.replaceChildren()

	if (!results.length) {
		const empty = document.createElement('div')
		empty.className = 'search-empty'
		const content = document.createElement('p')
		const title = document.createElement('strong')
		title.textContent = t('search.noResults')
		const hint = document.createElement('span')
		hint.textContent = t('search.noResultsHint')
		content.append(title, hint)
		empty.append(content)
		elements.searchResults.append(empty)
		return
	}

	results.forEach((result, index) => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = `search-result${index === 0 ? ' is-selected' : ''}`
		button.setAttribute('role', 'option')
		button.setAttribute('aria-selected', String(index === 0))
		button.dataset.resultIndex = String(index)

		const icon = document.createElement('span')
		icon.className = 'search-result__icon'
		icon.textContent = result.documentId.slice(0, 1)
		const content = document.createElement('span')
		content.className = 'search-result__content'
		const title = document.createElement('span')
		title.className = 'search-result__title'
		title.textContent = result.heading
		content.append(title)
		if (result.heading !== result.documentTitle) {
			const documentName = document.createElement('span')
			documentName.className = 'search-result__document'
			documentName.textContent = result.documentTitle
			content.append(documentName)
		}
		const snippet = document.createElement('span')
		snippet.className = 'search-result__snippet'
		snippet.textContent = result.snippet
		content.append(snippet)
		const category = document.createElement('span')
		category.className = 'search-result__category'
		category.textContent = categoryTitle(result.category)

		button.append(icon, content, category)
		button.addEventListener('mouseenter', () => selectSearchResult(index))
		button.addEventListener('click', () => openSearchResult(index))
		elements.searchResults.append(button)
	})
}

function selectSearchResult(index) {
	if (!state.searchResults.length) return
	const normalized = (index + state.searchResults.length) % state.searchResults.length
	state.selectedSearchResult = normalized
	elements.searchResults
		.querySelectorAll('.search-result')
		.forEach((result, resultIndex) => {
			const selected = resultIndex === normalized
			result.classList.toggle('is-selected', selected)
			result.setAttribute('aria-selected', String(selected))
			if (selected) result.scrollIntoView({ block: 'nearest' })
		})
}

function openSearchResult(index = state.selectedSearchResult) {
	const result = state.searchResults[index]
	if (!result) return
	elements.searchDialog.close()
	void renderDocument(result.documentId, {
		push: true,
		anchor: result.anchor,
	})
}

async function prepareSearch() {
	elements.searchStatus.textContent = t('search.loading')
	renderSearchResults(recommendedSearchResults())
	const index = await buildSearchIndex()
	if (!elements.searchDialog.open) return
	const query = elements.searchInput.value
	if (query.trim()) {
		const results = searchIndex(index, query)
		elements.searchStatus.textContent = t('search.results', results.length)
		renderSearchResults(results)
	} else {
		elements.searchStatus.textContent = t('search.ready')
		renderSearchResults(recommendedSearchResults())
	}
}

function openSearch() {
	if (!elements.searchDialog.open) elements.searchDialog.showModal()
	elements.searchInput.value = ''
	elements.searchStatus.textContent = t('search.loading')
	renderSearchResults(recommendedSearchResults())
	window.requestAnimationFrame(() => elements.searchInput.focus())
	void prepareSearch()
}

function bindEvents() {
	elements.menuToggle.addEventListener('click', () => {
		if (elements.body.classList.contains('sidebar-open')) closeSidebar()
		else openSidebar()
	})
	elements.sidebarBackdrop.addEventListener('click', closeSidebar)
	elements.themeToggle.addEventListener('click', toggleTheme)
	elements.searchTrigger.addEventListener('click', openSearch)
	elements.searchClose.addEventListener('click', () => elements.searchDialog.close())

	document.querySelectorAll('[data-lang]').forEach(button => {
		button.addEventListener('click', () => setLanguage(button.dataset.lang))
	})

	document.querySelectorAll('[data-doc-link]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault()
			void renderDocument(link.dataset.docLink, { push: true })
		})
	})

	elements.searchInput.addEventListener('input', async () => {
		const index = await buildSearchIndex()
		const query = elements.searchInput.value
		if (!query.trim()) {
			elements.searchStatus.textContent = t('search.ready')
			renderSearchResults(recommendedSearchResults())
			return
		}
		const results = searchIndex(index, query)
		elements.searchStatus.textContent = t('search.results', results.length)
		renderSearchResults(results)
	})

	elements.searchInput.addEventListener('keydown', event => {
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			selectSearchResult(state.selectedSearchResult + 1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			selectSearchResult(state.selectedSearchResult - 1)
		} else if (event.key === 'Enter') {
			event.preventDefault()
			openSearchResult()
		}
	})

	elements.searchDialog.addEventListener('click', event => {
		if (event.target !== elements.searchDialog) return
		const rect = elements.searchDialog.getBoundingClientRect()
		const inside =
			event.clientX >= rect.left &&
			event.clientX <= rect.right &&
			event.clientY >= rect.top &&
			event.clientY <= rect.bottom
		if (!inside) elements.searchDialog.close()
	})

	document.addEventListener('keydown', event => {
		const target = event.target
		const isTyping =
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target?.isContentEditable
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault()
			openSearch()
		} else if (event.key === '/' && !isTyping && !elements.searchDialog.open) {
			event.preventDefault()
			openSearch()
		} else if (
			event.key === 'Escape' &&
			elements.body.classList.contains('sidebar-open')
		) {
			closeSidebar()
			elements.menuToggle.focus()
		}
	})

	window.addEventListener('popstate', () => {
		resolveInitialState()
		applyTranslations()
		renderNavigation()
		void renderDocument(state.documentId, {
			anchor: safeDecode(window.location.hash.slice(1)),
		})
	})

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
		if (!readPreference('s42-docs-theme')) applyTheme(event.matches ? 'dark' : 'light')
	})
}

function initialize() {
	resolveInitialState()
	applyTheme(resolveTheme())
	applyTranslations()
	renderNavigation()
	bindEvents()
	document.querySelector('.platform-key').textContent =
		/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
	setLocation(state.documentId, safeDecode(window.location.hash.slice(1)), true)
	void renderDocument(state.documentId, {
		anchor: safeDecode(window.location.hash.slice(1)),
	})
}

initialize()
