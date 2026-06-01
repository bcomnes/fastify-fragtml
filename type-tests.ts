import Fastify from 'fastify'
import type { FastifyReply } from 'fastify'
import html, { frag, render } from 'fragtml'
import fastifyFragtml, {
  defineFastifyFragtmlOptions,
  defineFragtmlLayouts,
  raw,
} from './index.js'
import type {
  FastifyFragtml,
  FastifyFragtmlOptionsForLayouts,
  FragmentTemplateTypes,
  FragtmlArgsTemplate,
  FragtmlLayoutName,
  FragtmlRenderable,
  FragtmlReplyDecorators,
  FragtmlRenderOptions,
  FragtmlRuntime,
  FragtmlTemplate,
} from './types.js'

interface PageContext {
  count: number
  title: string
}

type PageFragment = 'main'

const plugin: FastifyFragtml = fastifyFragtml
const layouts = defineFragtmlLayouts<PageContext, PageFragment>()({
  main: (body, context, opts) => {
    const h = frag<PageFragment>(opts.fragmentId)

    return h`
      <!DOCTYPE html>
      <html>
        <head><title>${context.title}</title></head>
        <body>
          ${h.fragment.start('main')}
          ${body}
          ${h.fragment.end}
        </body>
      </html>
    `
  },
  admin: body => html`<main data-layout="admin">${body}</main>`,
})
type PageLayout = FragtmlLayoutName<typeof layouts>
const renderOptions: FragtmlRenderOptions<PageContext, PageLayout, PageFragment> = {
  fragmentId: 'main',
  layout: 'admin',
}
const invalidFragmentOptions: FragtmlRenderOptions<PageContext, PageLayout, PageFragment> = {
  // @ts-expect-error fragment IDs are limited to the template fragment union.
  fragmentId: 'missing',
}
const template: FragtmlTemplate<PageContext, PageLayout, PageFragment> = (context, opts) => {
  const h = frag<PageFragment>(opts.fragmentId)

  return h`
    ${h.fragment.start('main')}
    <h1>${context.title}</h1>
    <p>${context.count}</p>
    ${h.fragment.end}
  `
}
const customRuntime: FragtmlRuntime = {
  default: html,
  frag,
  html,
  raw,
  render,
}
const options = defineFastifyFragtmlOptions<PageContext, typeof layouts, PageFragment>({
  defaultContext: {
    title: 'Default',
  },
  fragtml: customRuntime,
  layout: 'main',
  layouts,
})
const typedOptions: FastifyFragtmlOptionsForLayouts<PageContext, typeof layouts, PageFragment> = options
const invalidRenderOptions: FragtmlRenderOptions<PageContext, PageLayout> = {
  // @ts-expect-error layout names are limited to registered names.
  layout: 'missing',
}
defineFastifyFragtmlOptions<PageContext, typeof layouts, PageFragment>({
  layouts,
  // @ts-expect-error layout names are inferred from the layouts object.
  layout: 'missing',
})
const app = Fastify()

await app.register(plugin, options)

app.get('/', async (_req, reply) => {
  reply.locals = {
    requestId: 'abc',
  }

  const rendered: string = await reply.render(template, {
    count: 1,
    title: 'Home',
  }, renderOptions)

  return reply.type('text/html').send(rendered)
})

type CustomReply = FastifyReply & FragtmlReplyDecorators<'render', PageLayout, PageFragment>

declare const customReply: CustomReply

const customReplyResult: Promise<string> = customReply.render(template, {
  count: 2,
  title: 'Custom',
})
// @ts-expect-error fragment IDs are preserved on custom decorator helpers.
customReply.render(template, {
  count: 2,
  title: 'Bad fragment',
}, { fragmentId: 'missing' })
const trusted = raw('<strong>trusted</strong>')
const renderable: FragtmlRenderable = html`<p>${trusted}</p>`

type InnerPageContext = {
  text: string
}

type OuterPageContext = InnerPageContext & {
  title: string
}

type FullPageContext = OuterPageContext & {
  foo: string
}

type FragmentPage = FragmentTemplateTypes<{
  fragments: {
    inner: InnerPageContext
    outer: OuterPageContext
  }
  full: FullPageContext
}>

type FragmentPageArgs = FragmentPage['args']
type FragmentPageTemplateArgs = FragmentPage['templateArgs']
type FragmentPageFragment = FragmentPage['fragmentId']

const fragmentPageTemplate: FragtmlArgsTemplate<FragmentPageArgs, PageLayout> = ({
  context,
  fragmentId,
}: FragmentPageTemplateArgs) => {
  const h = frag<FragmentPageFragment>(fragmentId)

  return h`
    <div>${context.foo}</div>

    ${h.fragment.start('outer')}
    <section>
      <h2>${context.title}</h2>

      ${h.fragment.start('inner')}
      <button>Inner update target</button>
      <div>${context.text}</div>
      ${h.fragment.end}
    </section>
    ${h.fragment.end}
  `
}

const innerFragmentHtml: Promise<string> = customReply.render(fragmentPageTemplate, {
  fragmentId: 'inner',
  context: {
    text: 'Updated body text',
  },
})
const outerFragmentHtml: Promise<string> = customReply.render(fragmentPageTemplate, {
  fragmentId: 'outer',
  context: {
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
})
const fullFragmentHtml: Promise<string> = customReply.render(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
})
const innerFragmentFromOptions: Promise<string> = customReply.render(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
}, { fragmentId: 'inner' })
// @ts-expect-error render options fragment IDs are inferred from FragmentTemplateTypes.
customReply.render(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
}, { fragmentId: 'missing' })

// @ts-expect-error outer fragments require both title and text.
customReply.render(fragmentPageTemplate, {
  fragmentId: 'outer',
  context: {
    text: 'Missing title',
  },
})

void customReplyResult
void invalidRenderOptions
void invalidFragmentOptions
void typedOptions
void renderable
void innerFragmentHtml
void innerFragmentFromOptions
void outerFragmentHtml
void fullFragmentHtml
