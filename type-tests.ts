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
  FragtmlInstanceDecorators,
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

  const sentReply: FastifyReply = reply.view(template, {
    count: 1,
    title: 'Home',
  })
  const rendered: string = await reply.viewAsync(template, {
    count: 1,
    title: 'Home',
  }, renderOptions)

  return sentReply.type('text/html').send(rendered)
})

const renderedOutsideRequest: Promise<string> = app.view(template, {
  count: 1,
  title: 'Outside',
})
// @ts-expect-error fragment IDs are inferred from the template.
app.view(template, {
  count: 1,
  title: 'Bad fragment',
}, { fragmentId: 'missing' })

app.view(template, {
  count: 1,
  title: 'Callback',
}, undefined, (err, rendered) => {
  const callbackError: Error | null = err
  const callbackRendered: string | undefined = rendered

  void callbackError
  void callbackRendered
})

const defaultDecorators = app as typeof app & FragtmlInstanceDecorators
defaultDecorators.view.clearCache()

type CustomReply = FastifyReply & FragtmlReplyDecorators<'render', 'renderAsync', PageLayout, PageFragment>
type CustomInstance = typeof app & FragtmlInstanceDecorators<'render', PageLayout, PageFragment>

declare const customReply: CustomReply
declare const customInstance: CustomInstance

const customReplyResult: FastifyReply = customReply.render(template, {
  count: 2,
  title: 'Custom',
})
const customReplyAsyncResult: Promise<string> = customReply.renderAsync(template, {
  count: 2,
  title: 'Custom',
}, {
  layout: 'admin',
})
// @ts-expect-error fragment IDs are preserved on custom decorator helpers.
customReply.renderAsync(template, {
  count: 2,
  title: 'Bad fragment',
}, { fragmentId: 'missing' })
const customInstanceResult: Promise<string> = customInstance.render(template, {
  count: 3,
  title: 'Custom instance',
})
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

const fragmentPageTemplate: FragtmlArgsTemplate<FragmentPageArgs> = ({
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

const innerFragmentReply: FastifyReply = customReply.view(fragmentPageTemplate, {
  fragmentId: 'inner',
  context: {
    text: 'Updated body text',
  },
})
const outerFragmentHtml: Promise<string> = customReply.viewAsync(fragmentPageTemplate, {
  fragmentId: 'outer',
  context: {
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
})
const fullFragmentHtml: Promise<string> = customInstance.view(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
})
const innerFragmentFromOptions: FastifyReply = customReply.view(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
}, { fragmentId: 'inner' })
// @ts-expect-error render options fragment IDs are inferred from FragmentTemplateTypes.
customReply.view(fragmentPageTemplate, {
  context: {
    foo: 'Full page field',
    title: 'Outer fragment title',
    text: 'Updated body text',
  },
}, { fragmentId: 'missing' })

customInstance.view(fragmentPageTemplate, {
  fragmentId: 'inner',
  context: {
    text: 'Updated body text',
  },
}, undefined, (err, rendered) => {
  const callbackError: Error | null = err
  const callbackRendered: string | undefined = rendered

  void callbackError
  void callbackRendered
})

// @ts-expect-error outer fragments require both title and text.
customReply.view(fragmentPageTemplate, {
  fragmentId: 'outer',
  context: {
    text: 'Missing title',
  },
})

void renderedOutsideRequest
void customReplyResult
void customReplyAsyncResult
void customInstanceResult
void invalidRenderOptions
void invalidFragmentOptions
void typedOptions
void renderable
void innerFragmentReply
void innerFragmentFromOptions
void outerFragmentHtml
void fullFragmentHtml
