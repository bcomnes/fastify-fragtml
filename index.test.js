import test from 'node:test'
import assert from 'node:assert'
import Fastify from 'fastify'
import html, { frag, raw, render as renderFragtml } from 'fragtml'
import fastifyFragtml from './index.js'
/** @import { FragtmlArgsTemplate, FragtmlLayout, FragtmlRenderable, FragtmlTemplate } from './types.js' */
/** @import { HtmlTag } from 'fragtml/types.js' */

test('reply.view renders fragtml templates with default context and locals', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    defaultContext: {
      siteName: 'domstack',
      title: 'Default title',
      fromDefault: 'default',
    },
  })

  app.addHook('preHandler', async (_req, reply) => {
    reply.locals = {
      title: 'Local title',
      fromLocal: 'local',
    }
  })

  /** @type {FragtmlTemplate} */
  const page = context => html`
    <h1>${String(context['title'] ?? '')}</h1>
    <p>${String(context['siteName'] ?? '')}</p>
    <p>${String(context['fromDefault'] ?? '')}</p>
    <p>${String(context['fromLocal'] ?? '')}</p>
    <p>${String(context['unsafe'] ?? '')}</p>
  `

  app.get('/', (_req, reply) => {
    return reply.view(page, {
      title: 'Route title',
      unsafe: '<script>alert(1)</script>',
    })
  })

  t.after(() => app.close())
  const response = await app.inject('/')

  assert.strictEqual(response.statusCode, 200)
  assert.strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
  assert.match(response.body, /<h1>Route title<\/h1>/)
  assert.match(response.body, /<p>domstack<\/p>/)
  assert.match(response.body, /<p>default<\/p>/)
  assert.match(response.body, /<p>local<\/p>/)
  assert.match(response.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('reply.viewAsync returns html without sending', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml)

  app.get('/', async (_req, reply) => {
    const body = await reply.viewAsync(
      context => html`<p>${String(context['message'] ?? '')}</p>`,
      { message: 'hello' }
    )

    return reply.type('text/plain').send(body)
  })

  t.after(() => app.close())
  const response = await app.inject('/')

  assert.strictEqual(response.statusCode, 200)
  assert.strictEqual(response.headers['content-type'], 'text/plain')
  assert.strictEqual(response.body, '<p>hello</p>')
})

test('custom fragtml runtime render is used', async (t) => {
  const app = Fastify()
  /** @type {unknown[]} */
  const renderedValues = []

  await app.register(fastifyFragtml, {
    fragtml: {
      raw,
      /**
       * @param {unknown} value
       */
      async render (value) {
        renderedValues.push(value)
        return `custom:${renderFragtml(value)}`
      },
    },
  })

  app.get('/', (_req, reply) => {
    return reply.view(
      () => html`<p>${raw('<strong>trusted</strong>')}</p>`,
      {}
    )
  })

  t.after(() => app.close())
  const response = await app.inject('/')

  assert.strictEqual(response.statusCode, 200)
  assert.strictEqual(response.body, 'custom:<p><strong>trusted</strong></p>')
  assert.strictEqual(renderedValues.length, 1)
})

test('fastify.view renders outside a request and supports callbacks', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    defaultContext: { appName: 'fastify-fragtml' },
  })

  t.after(() => app.close())

  /** @type {FragtmlTemplate} */
  const page = context => html`<p>${String(context['appName'] ?? '')}</p>`

  const rendered = await app.view(page, {})

  assert.strictEqual(rendered, '<p>fastify-fragtml</p>')

  const callbackRendered = await new Promise((resolve, reject) => {
    app.view(
      context => html`<p>${String(context['message'] ?? '')}</p>`,
      { message: 'callback' },
      undefined,
      /**
       * @param {Error | null} err
       * @param {string | undefined} result
       */
      (err, result) => {
        if (err) reject(err)
        else resolve(result)
      }
    )
  })

  assert.strictEqual(callbackRendered, '<p>callback</p>')
})

test('custom decorator names are supported for avoiding view conflicts', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    propertyName: 'fragtml',
    asyncPropertyName: 'fragtmlAsync',
  })

  app.get('/', (_req, reply) => {
    const renderReply = /** @type {{ fragtml: (template: FragtmlTemplate, data?: Record<string, unknown>) => unknown }} */ (
      /** @type {unknown} */ (reply)
    )

    return renderReply.fragtml(
      context => html`<p>${String(context['value'] ?? '')}</p>`,
      { value: 'custom' }
    )
  })

  t.after(() => app.close())
  const response = await app.inject('/')

  assert.strictEqual(response.statusCode, 200)
  assert.strictEqual(response.body, '<p>custom</p>')
})

test('layout callback can own fragment selection', async (t) => {
  const app = Fastify()

  /** @type {FragtmlLayout} */
  const layout = (body, context, opts) => {
    const h = /** @type {HtmlTag<'main'>} */ (
      frag(/** @type {'main' | undefined} */ (opts.fragmentId))
    )

    return h`
      <!DOCTYPE html>
      <html>
        <head><title>${String(context['title'] ?? '')}</title></head>
        <body>
          <main id="main">
            ${h.fragment.start('main')}
            ${body}
            ${h.fragment.end}
          </main>
        </body>
      </html>
    `
  }

  await app.register(fastifyFragtml, {
    layout,
  })

  /** @type {FragtmlTemplate} */
  const page = context => html`
    <article>
      <h1>${String(context['title'] ?? '')}</h1>
    </article>
  `

  app.get('/full', (_req, reply) => {
    return reply.view(page, { title: 'Full' })
  })

  app.get('/fragment', (_req, reply) => {
    return reply.view(page, { title: 'Fragment' }, { fragmentId: 'main' })
  })

  t.after(() => app.close())
  const full = await app.inject('/full')
  const fragment = await app.inject('/fragment')

  assert.match(full.body, /<!DOCTYPE html>/)
  assert.match(full.body, /<main id="main">/)
  assert.match(full.body, /<h1>Full<\/h1>/)
  assert.doesNotMatch(fragment.body, /<!DOCTYPE html>/)
  assert.doesNotMatch(fragment.body, /<main id="main">/)
  assert.match(fragment.body, /<h1>Fragment<\/h1>/)
})

test('named global layouts can be selected globally and per render', async (t) => {
  const app = Fastify()

  /** @type {FragtmlLayout} */
  const mainLayout = (body, context) => html`
    <main data-layout="main">
      <h1>${String(context['title'] ?? '')}</h1>
      ${body}
    </main>
  `

  /** @type {FragtmlLayout} */
  const adminLayout = body => html`
    <section data-layout="admin">
      ${body}
    </section>
  `

  await app.register(fastifyFragtml, {
    layout: 'main',
    layouts: {
      main: mainLayout,
      admin: adminLayout,
    },
  })

  /** @type {FragtmlTemplate} */
  const page = context => html`<p>${String(context['message'] ?? '')}</p>`

  app.get('/default', (_req, reply) => {
    return reply.view(page, {
      message: 'Default body',
      title: 'Default title',
    })
  })

  app.get('/admin', (_req, reply) => {
    return reply.view(page, {
      message: 'Admin body',
      title: 'Admin title',
    }, { layout: 'admin' })
  })

  app.get('/none', (_req, reply) => {
    return reply.view(page, {
      message: 'Bare body',
      title: 'Bare title',
    }, { layout: false })
  })

  t.after(() => app.close())
  const defaultResponse = await app.inject('/default')
  const adminResponse = await app.inject('/admin')
  const bareResponse = await app.inject('/none')

  assert.match(defaultResponse.body, /data-layout="main"/)
  assert.match(defaultResponse.body, /<h1>Default title<\/h1>/)
  assert.match(defaultResponse.body, /<p>Default body<\/p>/)
  assert.match(adminResponse.body, /data-layout="admin"/)
  assert.doesNotMatch(adminResponse.body, /Default title/)
  assert.match(adminResponse.body, /<p>Admin body<\/p>/)
  assert.strictEqual(bareResponse.body, '<p>Bare body</p>')
  await assert.rejects(
    app.view(page, { message: 'Missing layout' }, { layout: 'missing' }),
    /Unknown layout "missing"/
  )
})

test('reply.view supports fragtml context args objects', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    defaultContext: {
      foo: 'Default foo',
    },
  })

  app.addHook('preHandler', async (_req, reply) => {
    reply.locals = {
      title: 'Local title',
    }
  })

  /**
   * @type {FragtmlArgsTemplate<{
   *   fragmentId?: 'inner' | 'outer'
   *   context: Record<string, unknown>
   * }>}
   */
  const page = ({ context, fragmentId }) => {
    const h = /** @type {HtmlTag<'inner' | 'outer'>} */ (
      frag(fragmentId)
    )

    return h`
      <div>${String(context['foo'] ?? '')}</div>

      ${h.fragment.start('outer')}
      <section>
        <h2>${String(context['title'] ?? '')}</h2>

        ${h.fragment.start('inner')}
        <p>${String(context['text'] ?? '')}</p>
        ${h.fragment.end}
      </section>
      ${h.fragment.end}
    `
  }

  app.get('/full', (_req, reply) => {
    return reply.view(page, {
      context: {
        text: 'Full text',
      },
    })
  })

  app.get('/inner', (_req, reply) => {
    return reply.view(page, {
      fragmentId: 'inner',
      context: {
        text: 'Inner text',
      },
    })
  })

  t.after(() => app.close())
  const full = await app.inject('/full')
  const inner = await app.inject('/inner')

  assert.match(full.body, /<div>Default foo<\/div>/)
  assert.match(full.body, /<h2>Local title<\/h2>/)
  assert.match(full.body, /<p>Full text<\/p>/)
  assert.strictEqual(inner.body, '<p>Inner text</p>')
})

test('layout can be disabled per render and raw output stays explicit', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    /**
     * @param {FragtmlRenderable} body
     */
    layout: body => html`<main>${body}</main>`,
  })

  app.get('/', (_req, reply) => {
    return reply.view(
      () => html`<p>${raw('<strong>trusted</strong>')}</p>`,
      {},
      { layout: false }
    )
  })

  t.after(() => app.close())
  const response = await app.inject('/')

  assert.strictEqual(response.body, '<p><strong>trusted</strong></p>')
})

test('minifier hook supports path exclusions', async (t) => {
  const app = Fastify()

  await app.register(fastifyFragtml, {
    /**
     * @param {string} rendered
     */
    minify: async rendered => rendered.replace(/\s+/g, ' ').trim(),
    pathsToExcludeMinify: ['/raw'],
  })

  const template = () => html`
    <p>
      padded
    </p>
  `

  app.get('/minified', (_req, reply) => reply.view(template, {}))
  app.get('/raw', (_req, reply) => reply.view(template, {}))

  t.after(() => app.close())
  const minified = await app.inject('/minified')
  const rawResponse = await app.inject('/raw')

  assert.strictEqual(minified.body, '<p> padded </p>')
  assert.match(rawResponse.body, /<p>\n\s+padded/)
})
