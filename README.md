# fastify-fragtml

[![latest version](https://img.shields.io/npm/v/fastify-fragtml.svg)](https://www.npmjs.com/package/fastify-fragtml)
[![Actions Status](https://github.com/bcomnes/fastify-fragtml/workflows/tests/badge.svg)](https://github.com/bcomnes/fastify-fragtml/actions)

[![downloads](https://img.shields.io/npm/dm/fastify-fragtml.svg)](https://npmtrends.com/fastify-fragtml)
![Types in JS](https://img.shields.io/badge/types_in_js-yes-brightgreen)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-7fffff?style=flat&labelColor=ff80ff)](https://github.com/neostandard/neostandard)
[![Socket Badge](https://socket.dev/api/badge/npm/package/fastify-fragtml)](https://socket.dev/npm/package/fastify-fragtml)

Fastify rendering decorators for [`fragtml`](https://github.com/bcomnes/fragtml).

It provides Fastify rendering ergonomics for function-based `fragtml` templates:

- `reply.render()` renders HTML and returns a promise for the rendered string.
- `reply.locals` and `defaultContext` are merged into template data.
- custom decorator names, layouts, charset, and minifier hooks are supported.
- it intentionally does not decorate `reply.view`, `reply.viewAsync`, or `fastify.view`, so it can coexist with `@fastify/view`.

```
npm install fastify-fragtml
```

## Usage

```js
import Fastify from 'fastify'
import html from 'fragtml'
import fastifyFragtml from 'fastify-fragtml'

const fastify = Fastify()

await fastify.register(fastifyFragtml, {
  defaultContext: {
    siteName: 'Example'
  }
})

fastify.get('/', async (request, reply) => {
  const body = await reply.render(context => html`
    <h1>${context.title}</h1>
    <p>${context.siteName}</p>
  `, {
    title: 'Home'
  })

  return reply.send(body)
})
```

## API

### `reply.render(template, data, options)`

Renders the template and returns the HTML string without sending it. It sets `Content-Type` to `text/html; charset=utf-8` unless already set. Rendering errors reject the promise, so `return await reply.render(...)` or `return reply.render(...)` stays in Fastify's normal error handling flow.

```js
const body = await reply.render(context => html`
  <p>${context.message}</p>
`, {
  message: 'Hello'
})

reply.send(body)
```

## Context

Template context is merged in this order:

1. `defaultContext`
2. `reply.locals`
3. render `data`

Later values override earlier values.

```js
fastify.addHook('preHandler', async (request, reply) => {
  reply.locals = {
    requestId: request.id
  }
})
```

## Layouts

Layouts are callbacks. They receive the already-rendered body value, merged context, and render options. This keeps layouts `fragtml`-native and lets them own fragment boundaries.

```js
import { frag } from 'fragtml'

await fastify.register(fastifyFragtml, {
  layout: (body, context, options) => {
    const html = frag(options.fragmentId)

    return html`
      <!DOCTYPE html>
      <html>
        <head><title>${context.title}</title></head>
        <body>
          <main id="main">
            ${html.fragment.start('main')}
            ${body}
            ${html.fragment.end}
          </main>
        </body>
      </html>
    `
  }
})
```

Render only the layout's `main` fragment:

```js
reply.render(pageTemplate, data, { fragmentId: 'main' })
```

Disable a global layout for one render:

```js
reply.render(pageTemplate, data, { layout: false })
```

Register named layouts when routes need to choose from a shared set:

```js
import html from 'fragtml'

await fastify.register(fastifyFragtml, {
  layout: 'main',
  layouts: {
    main: (body, context) => html`
      <!DOCTYPE html>
      <html>
        <head><title>${context.title}</title></head>
        <body>${body}</body>
      </html>
    `,
    admin: body => html`
      <main data-layout="admin">${body}</main>
    `
  }
})

reply.render(pageTemplate, data, { layout: 'admin' })
```

`layout` can be a callback, a registered layout name, `false` in render options to disable the default, or `null` when registering to skip a default layout.

For stricter TypeScript checks, use the helper functions to infer layout names from the layout map:

```ts
import html from 'fragtml'
import fastifyFragtml, {
  defineFastifyFragtmlOptions,
  defineFragtmlLayouts
} from 'fastify-fragtml'
import type { FragtmlLayoutName, FragtmlTemplate } from 'fastify-fragtml'

interface PageContext {
  title: string
}

type PageFragment = 'main'

const layouts = defineFragtmlLayouts<PageContext, PageFragment>()({
  main: (body, context) => html`<body><h1>${context.title}</h1>${body}</body>`,
  admin: body => html`<main data-layout="admin">${body}</main>`
})

type PageLayout = FragtmlLayoutName<typeof layouts>

const pageTemplate: FragtmlTemplate<PageContext, PageLayout, PageFragment> = (
  context,
  options
) => {
  const h = html<PageFragment>(options.fragmentId)

  return h`
    ${h.fragment.start('main')}
    <p>${context.title}</p>
    ${h.fragment.end}
  `
}

await fastify.register(fastifyFragtml, defineFastifyFragtmlOptions<
  PageContext,
  typeof layouts,
  PageFragment
>({
  layout: 'main',
  layouts
}))

reply.render(pageTemplate, data, { layout: 'admin' })
// @ts-expect-error layout names are inferred from `layouts`.
reply.render(pageTemplate, data, { layout: 'missing' })
// @ts-expect-error fragment IDs use the `PageFragment` union.
reply.render(pageTemplate, data, { fragmentId: 'missing' })
```

## Options

```ts
interface FastifyFragtmlOptions {
  charset?: string
  defaultContext?: object
  fragtml?: FragtmlRuntime
  layout?: FragtmlLayout | string | null
  layouts?: Record<string, FragtmlLayout>
  minify?: (html: string, options?: unknown) => string | Promise<string>
  minifyOptions?: unknown
  options?: {
    useHtmlMinifier?: { minify: Function } | Function
    htmlMinifierOptions?: unknown
    pathsToExcludeHtmlMinifier?: string[]
  }
  pathsToExcludeMinify?: string[]
  propertyName?: string
}

interface FragtmlRuntime {
  render: (value: unknown) => string | Promise<string>
  raw?: (value: unknown) => RawHtml
  html?: HtmlTag
  frag?: HtmlTag
  default?: HtmlTag
}
```

`propertyName` defaults to `render`. `fastify-fragtml` deliberately avoids the `view`, `viewAsync`, and `fastify.view` decorator names used by `@fastify/view`.

By default, rendered values are finalized with `fragtml.render()`. Pass `fragtml` when your app uses a custom `fragtml` instance or a wrapped renderer:

```js
import html, { raw, render } from 'fragtml'

await fastify.register(fastifyFragtml, {
  fragtml: {
    html,
    raw,
    render: value => render(value)
  }
})
```

Only `render(value)` is required by the plugin. The optional `html`, `frag`, `default`, and `raw` fields make module-like custom instances type cleanly.

Fastify rejects duplicate decorators in the same encapsulation scope. If `@fastify/view` is registered in the same scope, use custom names:

```js
await fastify.register(fastifyFragtml, {
  propertyName: 'renderHtml'
})

fastify.get('/', async (request, reply) => {
  const body = await reply.renderHtml(template, data)
  return reply.send(body)
})
```

## TypeScript

The package augments Fastify's default types when imported:

```ts
import Fastify from 'fastify'
import html from 'fragtml'
import fastifyFragtml from 'fastify-fragtml'
import type { FragtmlTemplate } from 'fastify-fragtml'

interface PageContext {
  title: string
}

const page: FragtmlTemplate<PageContext> = context => html`
  <h1>${context.title}</h1>
`

const fastify = Fastify()

await fastify.register(fastifyFragtml)

fastify.get('/', (request, reply) => {
  return reply.render(page, { title: 'Home' })
})
```

For custom decorator names, use the exported helper types:

```ts
import type { FastifyReply } from 'fastify'
import type { FragtmlReplyDecorators } from 'fastify-fragtml'

type FragtmlReply = FastifyReply & FragtmlReplyDecorators<'renderHtml'>
```

### Fragment Template Types

`fastify-fragtml` re-exports the public `fragtml/types.js` helpers, including `FragmentTemplateTypes`, `FragmentArgs`, `FragmentIdOf`, `FragmentTemplateArgs`, `HtmlRenderable`, `HtmlTag`, `HtmlResult`, `RawHtml`, and `RenderOptions`.

You can use the same `FragmentTemplateTypes` pattern from `fragtml` with `reply.render()`:

```ts
import { frag } from 'fragtml'
import fastifyFragtml from 'fastify-fragtml'
import type {
  FragmentTemplateTypes,
  FragtmlArgsTemplate
} from 'fastify-fragtml'

type InnerPageContext = {
  text: string
}

type OuterPageContext = InnerPageContext & {
  title: string
}

type FullPageContext = OuterPageContext & {
  foo: string
}

type PageTemplate = FragmentTemplateTypes<{
  fragments: {
    inner: InnerPageContext
    outer: OuterPageContext
  }
  full: FullPageContext
}>

type PageArgs = PageTemplate['args']
type PageTemplateArgs = PageTemplate['templateArgs']
type PageFragment = PageTemplate['fragmentId']

const pageTemplate: FragtmlArgsTemplate<PageArgs> = ({
  context,
  fragmentId
}: PageTemplateArgs) => {
  const html = frag<PageFragment>(fragmentId)

  return html`
    <div>${context.foo}</div>

    ${html.fragment.start('outer')}
    <section>
      <h2>${context.title}</h2>

      ${html.fragment.start('inner')}
      <button>Inner update target</button>
      <div>${context.text}</div>
      ${html.fragment.end}
    </section>
    ${html.fragment.end}
  `
}

await fastify.register(fastifyFragtml)

fastify.get('/inner', (request, reply) => {
  return reply.render(pageTemplate, {
    fragmentId: 'inner',
    context: {
      text: 'Updated body text'
    }
  })
})

fastify.get('/full', (request, reply) => {
  return reply.render(pageTemplate, {
    context: {
      foo: 'Full page field',
      title: 'Outer fragment title',
      text: 'Updated body text'
    }
  })
})
```

`FragtmlTemplate` and `FragtmlRenderOptions` accept a fragment ID union as their third generic parameter. That lets TypeScript catch typos in `opts.fragmentId`:

```ts
import { frag } from 'fragtml'
import type { FragtmlRenderOptions, FragtmlTemplate } from 'fastify-fragtml'

type PageContext = { title: string }
type PageFragment = 'main'

const page: FragtmlTemplate<PageContext, string, PageFragment> = (context, options) => {
  const html = frag<PageFragment>(options.fragmentId)

  return html`
    ${html.fragment.start('main')}
    <h1>${context.title}</h1>
    ${html.fragment.end}
  `
}

const options: FragtmlRenderOptions<PageContext, string, PageFragment> = {
  fragmentId: 'main'
}

reply.render(page, { title: 'Home' }, options)

// @ts-expect-error "missing" is not a known page fragment.
reply.render(page, { title: 'Home' }, { fragmentId: 'missing' })
```

## License

MIT
