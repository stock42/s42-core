'use strict'

const CONTENT_BASE = './content'

const docsCatalog = [
  {
    id: 'FRAMEWORK',
    category: 'platform',
    file: 'FRAMEWORK.md',
    title: {
      en: 'Framework Overview',
      es: 'Resumen del Framework',
    },
  },
  {
    id: 'MODULES',
    category: 'modules',
    file: 'MODULES.md',
    title: {
      en: 'Modules Loader',
      es: 'Cargador de Modulos',
    },
  },
  {
    id: 'MODULE_AUTH',
    category: 'modules',
    file: 'MODULE_AUTH.md',
    title: {
      en: 'Auth Module (mws)',
      es: 'Modulo Auth (mws)',
    },
  },
  {
    id: 'MODULE_OPERATORS',
    category: 'modules',
    file: 'MODULE_OPERATORS.md',
    title: {
      en: 'Operators Module (full)',
      es: 'Modulo Operators (full)',
    },
  },
  {
    id: 'MODULE_SHARE',
    category: 'modules',
    file: 'MODULE_SHARE.md',
    title: {
      en: 'Share Module',
      es: 'Modulo Share',
    },
  },
  {
    id: 'SERVER',
    category: 'runtime',
    file: 'SERVER.md',
    title: {
      en: 'Server',
      es: 'Server',
    },
  },
  {
    id: 'ROUTECONTROLLERS',
    category: 'runtime',
    file: 'ROUTECONTROLLERS.md',
    title: {
      en: 'RouteControllers',
      es: 'RouteControllers',
    },
  },
  {
    id: 'CONTROLLER',
    category: 'runtime',
    file: 'CONTROLLER.md',
    title: {
      en: 'Controller',
      es: 'Controller',
    },
  },
  {
    id: 'CLUSTER',
    category: 'runtime',
    file: 'CLUSTER.md',
    title: {
      en: 'Cluster',
      es: 'Cluster',
    },
  },
  {
    id: 'EVENTSDOMAIN',
    category: 'events',
    file: 'EVENTSDOMAIN.md',
    title: {
      en: 'EventsDomain',
      es: 'EventsDomain',
    },
  },
  {
    id: 'REDISDB',
    category: 'data',
    file: 'REDISDB.md',
    title: {
      en: 'RedisDB',
      es: 'RedisDB',
    },
  },
  {
    id: 'MONGODB',
    category: 'data',
    file: 'MONGODB.md',
    title: {
      en: 'MongoDB',
      es: 'MongoDB',
    },
  },
  {
    id: 'SQL',
    category: 'data',
    file: 'SQL.md',
    title: {
      en: 'SQL',
      es: 'SQL',
    },
  },
  {
    id: 'SQLITE',
    category: 'data',
    file: 'SQLITE.md',
    title: {
      en: 'SQLite',
      es: 'SQLite',
    },
  },
  {
    id: 'SSE',
    category: 'utilities',
    file: 'SSE.md',
    title: {
      en: 'SSE',
      es: 'SSE',
    },
  },
  {
    id: 'DEPENDENCIES',
    category: 'utilities',
    file: 'DEPENDENCIES.md',
    title: {
      en: 'Dependencies',
      es: 'Dependencies',
    },
  },
  {
    id: 'MAILGUN',
    category: 'utilities',
    file: 'MAILGUN.md',
    title: {
      en: 'Mailgun',
      es: 'Mailgun',
    },
  },
  {
    id: 'VIEWTEMPLATE',
    category: 'utilities',
    file: 'VIEWTEMPLATE.md',
    title: {
      en: 'ViewTemplate',
      es: 'ViewTemplate',
    },
  },
  {
    id: 'TEST',
    category: 'utilities',
    file: 'TEST.md',
    title: {
      en: 'Test Helpers',
      es: 'Helpers de Test',
    },
  },
]

const i18n = {
  en: {
    'nav.architecture': 'Architecture',
    'nav.modules': 'Modules',
    'nav.examples': 'Examples',
    'nav.documentation': 'Documentation',

    'hero.badge': 'Bun-First · Module-Oriented',
    'hero.title': 'Build autonomous backend modules with production-grade velocity.',
    'hero.subtitle':
      'S42-Core v3 is a 100% module-oriented framework: each module includes controllers, services, events and contracts to work independently inside high-performance Bun runtimes.',
    'hero.ctaDocs': 'Explore Documentation',
    'hero.ctaExamples': 'View Examples',
    'hero.stock42': 'Built by Stock42 LLC',
    'hero.metricVersion': 'Current Version',
    'hero.metricModuleTypes': 'Module Types',
    'hero.metricRuntime': 'Native Runtime',
    'hero.metricLang': 'Documentation',
    'hero.diagramTitle': 'Module Runtime Lifecycle',
    'hero.terminalTitle': 'Quickstart Terminal',
    'hero.flow1': 'Load mws modules first',
    'hero.flow2': 'Register share modules',
    'hero.flow3': 'Load full controllers and events',
    'hero.flow4': 'Execute middleware on-demand per route',

    'architecture.eyebrow': 'Platform Design',
    'architecture.title': 'Corporate-grade backend architecture on Bun',
    'architecture.subtitle':
      'S42-Core combines routing, modular loading, events, storage adapters and clustering in a cohesive developer experience.',
    'architecture.http': '`Bun.serve`, native routes and hook pipeline.',
    'architecture.modules': '`full`, `mws`, `share` with convention-based loading.',
    'architecture.events': 'Distributed registry with Redis/SQS adapters.',
    'architecture.data': 'Redis, MongoDB, SQL and SQLite integration utilities.',

    'modules.eyebrow': 'Module Strategy',
    'modules.title': 'One framework, autonomous modules',
    'modules.full': 'Domain modules with controllers, handlers, services and events.',
    'modules.mws': 'Middleware modules with default, beforeRequest and afterRequest contracts.',
    'modules.share': 'Reusable contracts, helpers and shared services without route registration.',

    'examples.eyebrow': 'Implementation Examples',
    'examples.title': 'Production-ready usage patterns',

    'docs.eyebrow': 'Documentation Center',
    'docs.title': 'Complete technical docs in English and Spanish',
    'docs.subtitle':
      'Browse every component reference, architecture note and module contract directly from the site.',
    'docs.viewSource': 'View source',

    'footer.line1': 'S42-Core v3 · 100% module-oriented framework built on Bun.',
    'footer.line2': 'Developed by Cesar Casas, CEO & Head of Engineering at Stock42 LLC.',

    searchPlaceholder: 'Search docs...',
    docUnavailable: 'Document unavailable for this language. Falling back to English...',
  },
  es: {
    'nav.architecture': 'Arquitectura',
    'nav.modules': 'Modulos',
    'nav.examples': 'Ejemplos',
    'nav.documentation': 'Documentacion',

    'hero.badge': 'Bun-First · Module-Oriented',
    'hero.title': 'Construye modulos backend autonomos con velocidad de produccion.',
    'hero.subtitle':
      'S42-Core v3 es un framework 100% orientado a modulos: cada modulo incluye controllers, services, eventos y contratos para trabajar de forma independiente sobre Bun.',
    'hero.ctaDocs': 'Explorar Documentacion',
    'hero.ctaExamples': 'Ver Ejemplos',
    'hero.stock42': 'Desarrollado por Stock42 LLC',
    'hero.metricVersion': 'Version Actual',
    'hero.metricModuleTypes': 'Tipos de Modulo',
    'hero.metricRuntime': 'Runtime Nativo',
    'hero.metricLang': 'Documentacion',
    'hero.diagramTitle': 'Ciclo de Vida de Modulos',
    'hero.terminalTitle': 'Terminal de Inicio Rapido',
    'hero.flow1': 'Cargar primero los modulos mws',
    'hero.flow2': 'Registrar modulos share',
    'hero.flow3': 'Cargar controllers y eventos full',
    'hero.flow4': 'Ejecutar middleware on-demand por ruta',

    'architecture.eyebrow': 'Diseno de Plataforma',
    'architecture.title': 'Arquitectura backend corporativa sobre Bun',
    'architecture.subtitle':
      'S42-Core integra enrutado, carga modular, eventos, adaptadores de datos y cluster en una experiencia coherente.',
    'architecture.http': '`Bun.serve`, rutas nativas y pipeline de hooks.',
    'architecture.modules': '`full`, `mws`, `share` con carga por convencion.',
    'architecture.events': 'Registro distribuido con adaptadores Redis/SQS.',
    'architecture.data': 'Utilidades para Redis, MongoDB, SQL y SQLite.',

    'modules.eyebrow': 'Estrategia Modular',
    'modules.title': 'Un framework, modulos autonomos',
    'modules.full': 'Modulos de dominio con controllers, handlers, servicios y eventos.',
    'modules.mws': 'Modulos middleware con contratos default, beforeRequest y afterRequest.',
    'modules.share': 'Contratos y utilidades compartidas sin registro de rutas.',

    'examples.eyebrow': 'Ejemplos de Implementacion',
    'examples.title': 'Patrones listos para produccion',

    'docs.eyebrow': 'Centro de Documentacion',
    'docs.title': 'Documentacion tecnica completa en ingles y espanol',
    'docs.subtitle':
      'Navega referencias de componentes, notas de arquitectura y contratos de modulos desde el sitio.',
    'docs.viewSource': 'Ver fuente',

    'footer.line1': 'S42-Core v3 · Framework 100% orientado a modulos sobre Bun.',
    'footer.line2': 'Desarrollado por Cesar Casas, CEO y Jefe de Ingenieria de Stock42 LLC.',

    searchPlaceholder: 'Buscar documentacion...',
    docUnavailable: 'Documento no disponible en este idioma. Mostrando version en ingles...',
  },
}

const exampleSets = {
  en: [
    {
      id: 'bootstrap',
      label: 'Bootstrap',
      code: `import { Modules, RouteControllers, Server } from 's42-core'\n\nconst modules = new Modules('./modules')\nawait modules.load()\n\nconst server = new Server()\nawait server.start({\n  port: 5678,\n  RouteControllers: new RouteControllers(modules.getControllers()),\n  hooks: modules.getHooks(),\n})`,
    },
    {
      id: 'mws',
      label: 'mws module',
      code: `// modules/auth/mws/index.ts\nexport default async () => {\n  // one-time init\n}\n\nexport const beforeRequest = async (req, res) => {\n  return async (req, res, next) => {\n    if (!req.headers.get('authorization')) {\n      throw new Error('Token required')\n    }\n    return next(req, res)\n  }\n}\n\nexport const afterRequest = async (req, res) => res`,
    },
    {
      id: 'full',
      label: 'full controller',
      code: `export default {\n  name: 'operatorList',\n  version: '1.0.0',\n  method: 'GET',\n  path: '/operators/list',\n  requireBefore: ['auth'],\n  handler: async (req, res) => {\n    return res.json({ ok: true, docs: [] })\n  },\n  handleError: async (req, res, err) => {\n    return res.status(500).json({ ok: false, error: String(err) })\n  },\n}`,
    },
    {
      id: 'events',
      label: 'events',
      code: `import { EventsDomain, RedisClient } from 's42-core'\n\nconst redis = RedisClient.getInstance('redis://localhost:6379')\nawait redis.connect()\n\nconst events = EventsDomain.getInstance(redis)\nevents.registerEmitter('OPERATORS.CREATED', 'OPERATORS')\n\nevents.listen({ eventName: 'OPERATORS.CREATED' }, async (event) => {\n  console.info(event.payload)\n})`,
    },
  ],
  es: [
    {
      id: 'bootstrap',
      label: 'Bootstrap',
      code: `import { Modules, RouteControllers, Server } from 's42-core'\n\nconst modules = new Modules('./modules')\nawait modules.load()\n\nconst server = new Server()\nawait server.start({\n  port: 5678,\n  RouteControllers: new RouteControllers(modules.getControllers()),\n  hooks: modules.getHooks(),\n})`,
    },
    {
      id: 'mws',
      label: 'Modulo mws',
      code: `// modules/auth/mws/index.ts\nexport default async () => {\n  // inicializacion unica\n}\n\nexport const beforeRequest = async (req, res) => {\n  return async (req, res, next) => {\n    if (!req.headers.get('authorization')) {\n      throw new Error('Token requerido')\n    }\n    return next(req, res)\n  }\n}\n\nexport const afterRequest = async (req, res) => res`,
    },
    {
      id: 'full',
      label: 'Controller full',
      code: `export default {\n  name: 'operatorList',\n  version: '1.0.0',\n  method: 'GET',\n  path: '/operators/list',\n  requireBefore: ['auth'],\n  handler: async (req, res) => {\n    return res.json({ ok: true, docs: [] })\n  },\n  handleError: async (req, res, err) => {\n    return res.status(500).json({ ok: false, error: String(err) })\n  },\n}`,
    },
    {
      id: 'events',
      label: 'Eventos',
      code: `import { EventsDomain, RedisClient } from 's42-core'\n\nconst redis = RedisClient.getInstance('redis://localhost:6379')\nawait redis.connect()\n\nconst events = EventsDomain.getInstance(redis)\nevents.registerEmitter('OPERATORS.CREATED', 'OPERATORS')\n\nevents.listen({ eventName: 'OPERATORS.CREATED' }, async (event) => {\n  console.info(event.payload)\n})`,
    },
  ],
}

const categoryOrder = ['platform', 'modules', 'runtime', 'events', 'data', 'utilities']
const categoryLabels = {
  en: {
    platform: 'Platform',
    modules: 'Modules',
    runtime: 'Runtime',
    events: 'Events',
    data: 'Data',
    utilities: 'Utilities',
  },
  es: {
    platform: 'Plataforma',
    modules: 'Modulos',
    runtime: 'Runtime',
    events: 'Eventos',
    data: 'Datos',
    utilities: 'Utilidades',
  },
}

const state = {
  lang: 'en',
  activeDocId: 'FRAMEWORK',
  search: '',
  activeExampleId: 'bootstrap',
}

const fileToDocId = new Map(docsCatalog.map((doc) => [doc.file.toLowerCase(), doc.id]))
const terminalCommands = [
  'bun init',
  'bun add s42-core',
  'bunx s42-core-modules install auth operators',
  'bun run dev',
]

function getInitialLang() {
  const url = new URL(window.location.href)
  const byQuery = url.searchParams.get('lang')
  if (byQuery === 'en' || byQuery === 'es') {
    return byQuery
  }

  const path = window.location.pathname.toLowerCase()
  if (path.startsWith('/es/')) {
    return 'es'
  }
  if (path.startsWith('/en/')) {
    return 'en'
  }

  const cached = window.localStorage.getItem('s42-lang')
  return cached === 'es' ? 'es' : 'en'
}

function setLanguage(lang, pushQuery = true) {
  state.lang = lang
  window.localStorage.setItem('s42-lang', lang)

  if (pushQuery) {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', lang)
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  document.documentElement.lang = lang
  document.title =
    lang === 'es'
      ? 'S42-Core | Framework Backend Bun-first orientado a modulos'
      : 'S42-Core | Bun-First Modular Backend Framework'

  const dict = i18n[lang]
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key && dict[key]) {
      el.textContent = dict[key]
    }
  })

  const searchInput = document.getElementById('doc-search')
  if (searchInput) {
    searchInput.setAttribute('placeholder', dict.searchPlaceholder)
  }

  document.getElementById('lang-en')?.classList.toggle('active', lang === 'en')
  document.getElementById('lang-es')?.classList.toggle('active', lang === 'es')

  renderExamples()
  renderDocList()
  void renderDocContent()
}

function getFilteredDocs() {
  const term = state.search.trim().toLowerCase()
  if (!term) {
    return docsCatalog
  }

  return docsCatalog.filter((doc) => {
    const title = doc.title[state.lang] || doc.title.en
    return title.toLowerCase().includes(term) || doc.id.toLowerCase().includes(term)
  })
}

function renderDocList() {
  const host = document.getElementById('doc-list')
  if (!host) return

  const docs = getFilteredDocs()
  const grouped = new Map()

  for (const category of categoryOrder) {
    grouped.set(category, [])
  }

  for (const doc of docs) {
    if (!grouped.has(doc.category)) {
      grouped.set(doc.category, [])
    }
    grouped.get(doc.category).push(doc)
  }

  host.innerHTML = ''

  for (const category of categoryOrder) {
    const items = grouped.get(category) || []
    if (!items.length) continue

    const title = document.createElement('p')
    title.className = 'text-[11px] uppercase tracking-[0.15em] text-cyan-200/80 px-2 mt-3 mb-1'
    title.textContent = categoryLabels[state.lang][category]
    host.appendChild(title)

    for (const doc of items) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'doc-item'
      btn.textContent = doc.title[state.lang] || doc.title.en
      btn.dataset.docId = doc.id
      btn.classList.toggle('active', doc.id === state.activeDocId)
      btn.addEventListener('click', () => {
        state.activeDocId = doc.id
        renderDocList()
        void renderDocContent()
      })
      host.appendChild(btn)
    }
  }
}

function getActiveDoc() {
  return docsCatalog.find((doc) => doc.id === state.activeDocId) || docsCatalog[0]
}

async function fetchDoc(lang, filename) {
  const response = await fetch(`${CONTENT_BASE}/${lang}/${filename}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${filename} (${lang})`)
  }
  return response.text()
}

async function renderDocContent() {
  const doc = getActiveDoc()
  if (!doc) return

  const titleEl = document.getElementById('doc-title')
  const sourceEl = document.getElementById('doc-source')
  const renderEl = document.getElementById('doc-render')
  if (!titleEl || !sourceEl || !renderEl) return

  titleEl.textContent = doc.title[state.lang] || doc.title.en
  sourceEl.href = `${CONTENT_BASE}/${state.lang}/${doc.file}`

  let markdown = ''
  try {
    markdown = await fetchDoc(state.lang, doc.file)
  } catch {
    markdown = `${i18n[state.lang].docUnavailable}\n\n`
    markdown += await fetchDoc('en', doc.file)
    sourceEl.href = `${CONTENT_BASE}/en/${doc.file}`
  }

  renderEl.innerHTML = parseMarkdown(markdown)
  bindDocJumpLinks(renderEl)
}

function parseMarkdown(markdown) {
  const renderer = new marked.Renderer()
  const defaultLink = renderer.link.bind(renderer)

  renderer.link = (href, title, text) => {
    const raw = String(href || '')
    const match = raw.match(/DOCUMENTATION\/([A-Z]+)(?:\.es)?\.md$/i)

    if (match && match[1]) {
      const file = `${match[1].toUpperCase()}.md`
      const docId = fileToDocId.get(file.toLowerCase())
      if (docId) {
        return `<a href=\"#\" class=\"doc-jump\" data-doc-id=\"${docId}\">${text}</a>`
      }
    }

    return defaultLink(href, title, text)
  }

  const cleaned = markdown.replace(/!\[[^\]]*\]\(\.\/DOCUMENTATION\/assets\/[^)]+\)/g, '')
  return marked.parse(cleaned, { renderer })
}

function bindDocJumpLinks(scope) {
  scope.querySelectorAll('.doc-jump').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      const target = event.currentTarget
      const docId = target?.dataset?.docId
      if (!docId) return

      state.activeDocId = docId
      renderDocList()
      void renderDocContent()
      document.getElementById('documentation')?.scrollIntoView({ behavior: 'smooth' })
    })
  })
}

function renderExamples() {
  const tabHost = document.getElementById('example-tabs')
  const codeHost = document.getElementById('example-code')
  if (!tabHost || !codeHost) return

  const list = exampleSets[state.lang]
  tabHost.innerHTML = ''

  for (const sample of list) {
    const btn = document.createElement('button')
    btn.textContent = sample.label
    btn.classList.toggle('active', sample.id === state.activeExampleId)
    btn.addEventListener('click', () => {
      state.activeExampleId = sample.id
      renderExamples()
    })
    tabHost.appendChild(btn)
  }

  const active = list.find((it) => it.id === state.activeExampleId) || list[0]
  codeHost.textContent = active.code
}

function bindEvents() {
  document.getElementById('lang-en')?.addEventListener('click', () => setLanguage('en'))
  document.getElementById('lang-es')?.addEventListener('click', () => setLanguage('es'))

  document.getElementById('doc-search')?.addEventListener('input', (event) => {
    const target = event.target
    state.search = target.value || ''
    renderDocList()
  })
}

function initRevealAnimations() {
  const revealNodes = document.querySelectorAll('.reveal')
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.12 },
  )

  revealNodes.forEach((node) => observer.observe(node))
}

function initHeroTypewriter() {
  const historyEl = document.getElementById('hero-terminal-history')
  const textEl = document.getElementById('hero-terminal-text')
  if (!historyEl || !textEl) return

  const history = []
  let commandIndex = 0
  let charIndex = 0

  const typeDelay = 44
  const lineDelay = 650
  const loopDelay = 1000

  const run = () => {
    const command = terminalCommands[commandIndex]
    charIndex += 1
    textEl.textContent = command.slice(0, charIndex)

    if (charIndex < command.length) {
      setTimeout(run, typeDelay)
      return
    }

    history.push(`$ ${command}`)
    while (history.length > 4) {
      history.shift()
    }
    historyEl.textContent = history.join('\n')

    textEl.textContent = ''
    charIndex = 0
    commandIndex = (commandIndex + 1) % terminalCommands.length

    setTimeout(run, commandIndex === 0 ? loopDelay : lineDelay)
  }

  setTimeout(run, 420)
}

async function init() {
  const initialLang = getInitialLang()
  state.lang = initialLang
  bindEvents()
  initRevealAnimations()
  initHeroTypewriter()
  setLanguage(initialLang, true)
}

void init()
