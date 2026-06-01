import type { FastifyPluginAsync } from 'fastify'
import { raw } from 'fragtml'
import type { FragmentIdOf, HtmlRenderable, HtmlTag, RenderOptions } from 'fragtml/types.js'
export type {
  FragmentArgs,
  FragmentIdOf,
  FragmentTemplateArgs,
  FragmentTemplateTypes,
  HtmlRenderable,
  HtmlResult,
  HtmlTag,
  RawHtml,
  RenderOptions,
} from 'fragtml/types.js'

declare module 'fastify' {
  interface FastifyReply {
    locals: Record<string, unknown>
    render<
      Context extends FragtmlContext = FragtmlDefaultContext,
      LayoutName extends string = string,
      FragmentId extends string = string
    >(
      template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
      data: Context,
      opts?: FragtmlRenderOptions<Context, LayoutName, NoInfer<FragmentId>>
    ): Promise<string>
    render<
      Args extends FragtmlContext,
      LayoutName extends string = string,
      FragmentId extends string = FragtmlArgsFragmentId<Args>
    >(
      template: FragtmlArgsTemplate<Args, LayoutName, FragmentId>,
      args: NoInfer<Args>,
      opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
    ): Promise<string>
    render(
      template: FragtmlRenderable,
      data?: FragtmlDefaultContext,
      opts?: FragtmlRenderOptions
    ): Promise<string>
  }
}

export type FragtmlRenderable = HtmlRenderable

export type FragtmlTemplateResult = FragtmlRenderable | Promise<FragtmlRenderable>

export type FragtmlContext = object
export type FragtmlDefaultContext = Record<string, unknown>

export type FragtmlTemplate<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> = (
  context: Context,
  opts: FragtmlRenderOptions<Context, LayoutName, FragmentId>
) => FragtmlTemplateResult

export type FragtmlArgsFragmentId<Args> = FragmentIdOf<Args>

export type FragtmlArgsTemplate<
  Args extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = FragtmlArgsFragmentId<Args>
> = (
  args: Args,
  opts: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
) => FragtmlTemplateResult

export type FragtmlContentType = string | false

export type FragtmlLayoutRender<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> = {
  bivarianceHack: (
    body: FragtmlRenderable,
    context: Context,
    opts: FragtmlRenderOptions<Context, LayoutName, FragmentId>
  ) => FragtmlTemplateResult
}['bivarianceHack']

export interface FragtmlLayoutObject<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> {
  contentType?: FragtmlContentType
  render: FragtmlLayoutRender<Context, LayoutName, FragmentId>
}

export type FragtmlLayout<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> =
  | FragtmlLayoutRender<Context, LayoutName, FragmentId>
  | FragtmlLayoutObject<Context, LayoutName, FragmentId>

export type FragtmlLayoutName<Layouts> = Extract<keyof Layouts, string>

export type FragtmlLayoutMap<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> = Record<LayoutName, FragtmlLayout<Context, LayoutName, FragmentId>>

export type FastifyFragtmlOptionsForLayouts<
  Context extends FragtmlContext,
  Layouts extends Record<string, unknown>,
  FragmentId extends string = string
> =
  Omit<FastifyFragtmlOptions<Context, FragtmlLayoutName<Layouts>, FragmentId>, 'layout' | 'layouts'> & {
    layout?: FragtmlLayout<Context, FragtmlLayoutName<Layouts>, FragmentId> | FragtmlLayoutName<Layouts> | null
    layouts: Layouts
  }

export interface FragtmlRenderOptions<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
>
  extends RenderOptions<FragmentId> {
  contentType?: FragtmlContentType
  layout?: FragtmlLayout<Context, LayoutName, FragmentId> | LayoutName | false | null
}

export interface FragtmlReplyRender<
  LayoutName extends string = string,
  FragmentId extends string = string
> {
  <Context extends FragtmlContext = FragtmlDefaultContext>(
    template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
    data: Context,
    opts?: FragtmlRenderOptions<Context, LayoutName, FragmentId>
  ): Promise<string>
  <Args extends FragtmlContext>(
    template: FragtmlArgsTemplate<Args, LayoutName, FragtmlArgsFragmentId<Args>>,
    args: NoInfer<Args>,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragtmlArgsFragmentId<Args>>
  ): Promise<string>
  (
    template: FragtmlRenderable,
    data?: FragtmlDefaultContext,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
  ): Promise<string>
}

export type FragtmlReplyDecorators<
  PropertyName extends string = 'render',
  LayoutName extends string = string,
  FragmentId extends string = string
> = {
  [Key in PropertyName]: FragtmlReplyRender<LayoutName, FragmentId>
}

export interface HtmlMinifierLike {
  minify: (html: string, options?: unknown) => string | Promise<string>
}

export interface FragtmlRuntime {
  default?: HtmlTag
  frag?: HtmlTag
  html?: HtmlTag
  raw?: typeof raw
  render: (value: unknown) => string | Promise<string>
}

export interface FastifyFragtmlEngineOptions {
  useHtmlMinifier?: HtmlMinifierLike | ((html: string, options?: unknown) => string | Promise<string>)
  htmlMinifierOptions?: unknown
  pathsToExcludeHtmlMinifier?: string[]
}

export interface FastifyFragtmlOptions<
  Context extends FragtmlContext = FragtmlDefaultContext,
  LayoutName extends string = string,
  FragmentId extends string = string
> {
  charset?: string
  contentType?: FragtmlContentType
  defaultContext?: Partial<Context>
  fragtml?: FragtmlRuntime
  layout?: FragtmlLayout<Context, LayoutName, FragmentId> | LayoutName | null
  layouts?: Record<LayoutName, FragtmlLayout<Context, LayoutName, FragmentId>>
  minify?: (html: string, options?: unknown) => string | Promise<string>
  minifyOptions?: unknown
  options?: FastifyFragtmlEngineOptions
  pathsToExcludeMinify?: string[]
  propertyName?: string
}

export interface DefineFragtmlLayouts {
  <Context extends FragtmlContext, FragmentId extends string = string>():
    <const Layouts extends Record<string, FragtmlLayout<Context, string, FragmentId>>>(
    layouts: Layouts
  ) => Layouts
  <Context extends FragtmlContext, const Layouts extends Record<string, FragtmlLayout<Context>>>(
    layouts: Layouts
  ): Layouts
}

export interface DefineFastifyFragtmlOptions {
  <
    Context extends FragtmlContext,
    const Layouts extends Record<string, unknown>,
    FragmentId extends string = string
  >(
    options: FastifyFragtmlOptionsForLayouts<Context, Layouts, FragmentId>
  ): FastifyFragtmlOptionsForLayouts<Context, Layouts, FragmentId>
  <
    Context extends FragtmlContext = FragtmlDefaultContext,
    LayoutName extends string = string,
    FragmentId extends string = string
  >(
    options: FastifyFragtmlOptions<Context, LayoutName, FragmentId> & { layouts?: undefined }
  ): FastifyFragtmlOptions<Context, LayoutName, FragmentId>
}

// The plugin itself accepts any context shape; individual templates/layouts can
// still use specific context types at render sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FastifyFragtml = FastifyPluginAsync<FastifyFragtmlOptions<any, any, any>>

declare const fastifyFragtml: FastifyFragtml
declare const defineFragtmlLayouts: DefineFragtmlLayouts
declare const defineFastifyFragtmlOptions: DefineFastifyFragtmlOptions
export { defineFastifyFragtmlOptions, defineFragtmlLayouts }
export { fastifyFragtml }
export { raw }
export default fastifyFragtml
