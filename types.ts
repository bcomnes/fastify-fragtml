import type { FastifyPluginAsync, FastifyReply } from 'fastify'
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
    view<
      Context extends FragtmlContext = FragtmlDefaultContext,
      LayoutName extends string = string,
      FragmentId extends string = string
    >(
      template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
      data: Context,
      opts?: FragtmlRenderOptions<Context, LayoutName, NoInfer<FragmentId>>
    ): FastifyReply
    view<
      Args extends FragtmlContext,
      LayoutName extends string = string,
      FragmentId extends string = FragtmlArgsFragmentId<Args>
    >(
      template: FragtmlArgsTemplate<Args, LayoutName, FragmentId>,
      args: Args,
      opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
    ): FastifyReply
    view(
      template: FragtmlRenderable,
      data?: FragtmlDefaultContext,
      opts?: FragtmlRenderOptions
    ): FastifyReply
    viewAsync<
      Context extends FragtmlContext = FragtmlDefaultContext,
      LayoutName extends string = string,
      FragmentId extends string = string
    >(
      template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
      data: Context,
      opts?: FragtmlRenderOptions<Context, LayoutName, NoInfer<FragmentId>>
    ): Promise<string>
    viewAsync<
      Args extends FragtmlContext,
      LayoutName extends string = string,
      FragmentId extends string = FragtmlArgsFragmentId<Args>
    >(
      template: FragtmlArgsTemplate<Args, LayoutName, FragmentId>,
      args: Args,
      opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
    ): Promise<string>
    viewAsync(
      template: FragtmlRenderable,
      data?: FragtmlDefaultContext,
      opts?: FragtmlRenderOptions
    ): Promise<string>
  }

  interface FastifyInstance {
    view<
      Context extends FragtmlContext = FragtmlDefaultContext,
      LayoutName extends string = string,
      FragmentId extends string = string
    >(
      template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
      data: Context,
      opts: FragtmlRenderOptions<Context, LayoutName, NoInfer<FragmentId>> | undefined,
      done: (err: Error | null, html?: string) => void
    ): void
    view<
      Args extends FragtmlContext,
      LayoutName extends string = string,
      FragmentId extends string = FragtmlArgsFragmentId<Args>
    >(
      template: FragtmlArgsTemplate<Args, LayoutName, FragmentId>,
      args: Args,
      opts: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId> | undefined,
      done: (err: Error | null, html?: string) => void
    ): void
    view<
      Context extends FragtmlContext = FragtmlDefaultContext,
      LayoutName extends string = string,
      FragmentId extends string = string
    >(
      template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
      data: Context,
      opts?: FragtmlRenderOptions<Context, LayoutName, NoInfer<FragmentId>>
    ): Promise<string>
    view<
      Args extends FragtmlContext,
      LayoutName extends string = string,
      FragmentId extends string = FragtmlArgsFragmentId<Args>
    >(
      template: FragtmlArgsTemplate<Args, LayoutName, FragmentId>,
      args: Args,
      opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
    ): Promise<string>
    view(
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

export type FragtmlLayout<
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
  ): FastifyReply
  <Args extends FragtmlContext>(
    template: FragtmlArgsTemplate<Args, LayoutName, FragtmlArgsFragmentId<Args>>,
    args: Args,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragtmlArgsFragmentId<Args>>
  ): FastifyReply
  (
    template: FragtmlRenderable,
    data?: FragtmlDefaultContext,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
  ): FastifyReply
}

export interface FragtmlReplyRenderAsync<
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
    args: Args,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragtmlArgsFragmentId<Args>>
  ): Promise<string>
  (
    template: FragtmlRenderable,
    data?: FragtmlDefaultContext,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
  ): Promise<string>
}

export interface FragtmlInstanceRender<
  LayoutName extends string = string,
  FragmentId extends string = string
> {
  <Context extends FragtmlContext = FragtmlDefaultContext>(
    template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
    data: Context,
    opts: FragtmlRenderOptions<Context, LayoutName, FragmentId> | undefined,
    done: (err: Error | null, html?: string) => void
  ): void
  <Args extends FragtmlContext>(
    template: FragtmlArgsTemplate<Args, LayoutName, FragtmlArgsFragmentId<Args>>,
    args: Args,
    opts: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragtmlArgsFragmentId<Args>> | undefined,
    done: (err: Error | null, html?: string) => void
  ): void
  <Context extends FragtmlContext = FragtmlDefaultContext>(
    template: FragtmlTemplate<Context, LayoutName, FragmentId> | FragtmlRenderable,
    data: Context,
    opts?: FragtmlRenderOptions<Context, LayoutName, FragmentId>
  ): Promise<string>
  <Args extends FragtmlContext>(
    template: FragtmlArgsTemplate<Args, LayoutName, FragtmlArgsFragmentId<Args>>,
    args: Args,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragtmlArgsFragmentId<Args>>
  ): Promise<string>
  (
    template: FragtmlRenderable,
    data?: FragtmlDefaultContext,
    opts?: FragtmlRenderOptions<FragtmlDefaultContext, LayoutName, FragmentId>
  ): Promise<string>
  clearCache: () => void
}

export type FragtmlReplyDecorators<
  PropertyName extends string = 'view',
  AsyncPropertyName extends string = `${PropertyName}Async`,
  LayoutName extends string = string,
  FragmentId extends string = string
> = {
  [Key in PropertyName]: FragtmlReplyRender<LayoutName, FragmentId>
} & {
  [Key in AsyncPropertyName]: FragtmlReplyRenderAsync<LayoutName, FragmentId>
}

export type FragtmlInstanceDecorators<
  PropertyName extends string = 'view',
  LayoutName extends string = string,
  FragmentId extends string = string
> = {
  [Key in PropertyName]: FragtmlInstanceRender<LayoutName, FragmentId>
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
  asyncPropertyName?: string
  charset?: string
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
