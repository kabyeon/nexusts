# API Reference

> 한국어 버전: [`api-reference.ko.md`](./api-reference.ko.md)

This is a flat reference of every public export. For narrative
documentation, see the guides.

---

## `Application`

```ts
class Application {
  readonly container: ApplicationContainer;
  readonly server: NexusServer;
  readonly inertia: Inertia | null;

  constructor(rootModule: Type<any>, options?: ApplicationOptions);

  setViewAdapter(adapter: ViewAdapter): this;
  render(view: string, data?: Record<string, any>): Promise<string>;
  listen(port?: number): Promise<any>;
  get fetch(): (req: Request, env?: any, ctx?: any) => Promise<Response>;

  static bootstrap(rootModule: Type<any>, options?: ApplicationOptions): Application;
}

interface ApplicationOptions extends NexusServerOptions {
  viewAdapter?: ViewAdapter;
  inertia?: InertiaConfig;
}
```

---

## `Module`

```ts
function Module(options: ModuleOptions): ClassDecorator;

interface ModuleOptions {
  imports?: Type[];
  controllers?: Type[];
  providers?: Provider[];
  exports?: InjectionToken[];
}
```

---

## `Controller` & HTTP methods

```ts
function Controller(prefix: string): ClassDecorator;

const Get:    (path?: string) => MethodDecorator;
const Post:   (path?: string) => MethodDecorator;
const Put:    (path?: string) => MethodDecorator;
const Delete: (path?: string) => MethodDecorator;
const Patch:  (path?: string) => MethodDecorator;
const Options:(path?: string) => MethodDecorator;
const Head:   (path?: string) => MethodDecorator;
```

---

## `Injectable`, `Inject`, `Repository`

```ts
function Injectable(): ClassDecorator;
function Repository(): ClassDecorator;

function Inject<T = any>(token: InjectionToken<T>): ParameterDecorator & PropertyDecorator;
```

---

## Parameter decorators

```ts
const Req:     () => ParameterDecorator;
const Res:     () => ParameterDecorator;
const Next:    () => ParameterDecorator;
const Ctx:     () => ParameterDecorator;
const User:    () => ParameterDecorator;

const Body:    (key?: string) => ParameterDecorator;
const Query:   (key?: string) => ParameterDecorator;
const Param:   (key?: string) => ParameterDecorator;
const Headers: (key?: string) => ParameterDecorator;
```

---

## `Validate`

```ts
function Validate(config: ValidationConfig): MethodDecorator;

interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}
```

---

## DI types

```ts
type InjectionToken<T = any> = Type<T> | string | symbol;

interface Provider<T = any> {
  provide: InjectionToken<T>;
  useClass?: Type<T>;
  useValue?: T;
  useFactory?: (...args: any[]) => T | Promise<T>;
  useExisting?: InjectionToken<T>;
  scope?: 'singleton' | 'transient';
}

type ProviderScope = 'singleton' | 'transient';

class DIContainer {
  createChild(): DIContainer;
  register(providers: Provider | Provider[]): void;
  resolve<T = any>(token: InjectionToken<T>): T;
  has(token: InjectionToken): boolean;
  list(): string[];
}

class ApplicationContainer extends DIContainer {
  registerModule(moduleClass: Type, container: DIContainer): void;
}

class ModuleScanner {
  scan(rootModule: Type): { root: ScanResult; modules: ScanResult[] };
  get(moduleClass: Type): ScanResult | undefined;
}
```

---

## View adapters

```ts
interface ViewAdapter {
  readonly name: string;
  render(
    template: string,
    data: Record<string, any>,
    context?: ViewContext,
    options?: ViewOptions,
  ): Promise<string>;
  compile?(template: string, options?: ViewOptions): (data: Record<string, any>) => Promise<string>;
}

interface ViewContext {
  request?: { url?: string; method?: string; headers?: Record<string, string|string[]>; cookies?: Record<string, string> };
  response?: { cookies?: Array<{ name: string; value: string; options?: any }>; redirect?: string; status?: number };
  globals?: Record<string, any>;
}

interface ViewOptions {
  stream?: boolean;
  raw?: boolean;
  layout?: string;
}

class RenduAdapter implements ViewAdapter {
  readonly name: 'rendu';
}

class EdgeAdapter implements ViewAdapter {
  readonly name: 'edge';
}
```

---

## `Inertia`

```ts
class Inertia implements InertiaAdapter {
  static readonly TOKEN: symbol;

  constructor(config?: InertiaConfig);

  // Rendering
  render(component: string, props: Record<string, any>): InertiaResponse;
  render(component: string, deferred: Record<string, DeferredProp>, props: Record<string, any>): InertiaResponse;
  form(component: string, initialProps?: Record<string, any>): InertiaFormBuilder;

  // Navigation
  location(url: string): Response;
  redirect(url: string, status?: number): Response;     // default 302
  back(): Response;

  // Configuration
  setVersion(version: InertiaVersion): this;
  setSsrAdapter(adapter: SsrAdapter | null): this;
  setTitle(title: string): this;
  setEncryptHistory(encrypt?: boolean): this;
  setSharedProps(shared: InertiaConfig['sharedProps']): this;

  // Shared data
  share(key: string, value: any): void;
  share(values: Record<string, any>): void;
  unshare(key: string): void;
  getShared(): Record<string, any>;

  // InertiaAdapter
  title(): string;
  encryptHistory(): boolean;
  ssr(): SsrAdapter | null;
  resolveVersion(): Promise<string | undefined>;
  getSharedFor(c: Context): Promise<Record<string, any>>;
}

type InertiaVersion = string | (() => string | Promise<string>);

interface InertiaConfig {
  ssr?: SsrAdapter;
  version?: InertiaVersion;
  encryptHistory?: boolean;
  title?: string;
  sharedProps?: Record<string, any> | (() => Record<string, any> | Promise<Record<string, any>>);
}
```

### Lazy helpers

```ts
function defer<T>(fn: () => T | Promise<T>, group?: string): DeferredProp<T>;
function always<T>(fn: () => T | Promise<T>): AlwaysProp<T>;
function optional<T>(fn: () => T | Promise<T>, threshold?: number): OptionalProp<T>;
function merge<T>(fn: () => T | Promise<T>, matchPropsOn?: string[][]): MergeProp<T>;
function deepMerge<T>(fn: () => T | Promise<T>): DeepMergeProp<T>;
function once<T>(fn: () => T | Promise<T>): OnceProp<T>;
function lazy<T>(fn: () => T | Promise<T>, tag?: string): LazyProp<T>;

class DeferredProp<T> { readonly __inertiaKind = 'deferred'; readonly group: string; resolve(): T | Promise<T>; }
class AlwaysProp<T>   { readonly __inertiaKind = 'always'; resolve(): T | Promise<T>; }
class OptionalProp<T> { readonly __inertiaKind = 'optional'; readonly threshold: number; resolve(): T | Promise<T>; }
class MergeProp<T>    { readonly __inertiaKind = 'merge'; readonly matchPropsOn: string[][]; resolve(): T | Promise<T>; }
class DeepMergeProp<T>{ readonly __inertiaKind = 'deepMerge'; resolve(): T | Promise<T>; }
class OnceProp<T>     { readonly __inertiaKind = 'once'; resolve(): T | Promise<T>; }
class LazyProp<T>     { readonly __inertiaKind = 'lazy'; readonly tag: string; invocations: number; resolve(): T | Promise<T>; }

function isInertiaHelper(value: unknown): value is InertiaHelper;
```

### `<Form>` helper

```ts
class InertiaFormBuilder {
  withProps(props: Record<string, any>): this;
  with(key: string, value: any): this;
  withErrors(errors: Record<string, string | string[]>): this;
  withError(field: string, message: string): this;
  withErrorBag(name: string): this;
  withValues(values: Record<string, any>): this;
  render(): InertiaResponse;
  redirect(url: string): Response;
  back(to?: string): Response;
}

const INERTIA_RESPONSE_TAG: unique symbol;

function inertiaFormMiddleware(options?: FormMiddlewareOptions): MiddlewareHandler;

interface FormMiddlewareOptions {
  validateCsrf?: boolean;     // default true
  csrfHeader?: string;        // default 'X-CSRF-Token'
  csrfField?: string;         // default '_token'
  csrfSharedKey?: string;     // default 'csrfToken'
}
```

### SSR adapters

```ts
interface SsrAdapter {
  readonly name: string;
  render(component: string, props: Record<string, any>): Promise<SsrRenderResult>;
  head?(): Promise<string[]> | string[];
}

interface SsrRenderResult {
  html: string;
  head?: string[];
  data?: Record<string, any>;
}

class ComponentRegistry {
  register(name: string, component: any): this;
}

function createReactAdapter(opts: { components: ComponentRegistry }): SsrAdapter;
function createVueAdapter(opts:   { components: ComponentRegistry }): SsrAdapter;
function createSvelteAdapter(opts:{ components: ComponentRegistry }): SsrAdapter;
function createSolidAdapter(opts: { components: ComponentRegistry }): SsrAdapter;
```

---

## Router (raw API)

```ts
class Router {
  // Adonis style
  add(method: HttpMethod, path: string, controller: Type, methodName: string): void;

  // Functional style
  raw(method: HttpMethod, path: string, handler: HonoHandler): void;

  // Decorator-driven
  registerController(controller: Type, container: DIContainer): void;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
```

---

## Constants & types

```ts
const METADATA_KEY: {
  MODULE:    string;
  CONTROLLER:string;
  ROUTES:    string;
  PARAMS:    string;
  INJECTABLE:string;
  REPOSITORY:string;
};

const PARAM_TYPES: {
  REQUEST:   number;
  RESPONSE:  number;
  NEXT:      number;
  BODY:      number;
  QUERY:     number;
  PARAM:     number;
  HEADERS:   number;
  CTX:       number;
  USER:      number;
};

const HTTP_METHODS: readonly HttpMethod[];

type MetadataKey = typeof METADATA_KEY[keyof typeof METADATA_KEY];
type ParamType   = typeof PARAM_TYPES[keyof typeof PARAM_TYPES];
```

---

## Runtime adapters

```ts
function detectRuntime(): 'bun' | 'node' | 'cloudflare';

class BunRuntime       { serve(handler: (req: Request) => Promise<Response>, options?: { port?: number }): unknown; }
class NodeRuntime      { serve(handler: (req: Request) => Promise<Response>, options?: { port?: number }): unknown; }
class CloudflareRuntime{ fetch: (req: Request, env?: any, ctx?: any) => Promise<Response>; }
```

---

## ORM (Drizzle adapter)

```ts
interface DrizzleAdapterConfig {
  schema: Record<string, any>;
  driver: 'bun-sqlite' | 'node-sqlite' | 'libsql' | 'postgres' | 'mysql';
}

class DrizzleAdapter {
  constructor(config: DrizzleAdapterConfig);
  // exposes the underlying drizzle instance for queries.
}
```

---

## See also

- [Getting started](./getting-started.md)
- [Controllers & decorators](./controllers.md)
- [Dependency injection](./dependency-injection.md)
- [Validation](./validation.md)
- [View engines](./view-engines.md)
- [Inertia.js adapter](./inertia.md)
- [Runtime & deployment](./runtime-deployment.md)
