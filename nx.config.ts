/**
 * Nexus project configuration.
 * Run `nx info` to see the resolved values.
 */

export default {
  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  /** Routing style used by `make:controller` / `make:crud`. */
  routing: 'nest',

  /** View engine — `inertia`, `rendu`, `edge`, or `none`. */
  view: 'rendu',

  /**
   * Directory searched when a controller returns a view file name
   * (e.g. `about.html`). Empty string = inline templates only.
   * Typical: `'resources/views'`. On edge runtimes
   * (Cloudflare Workers), leave empty and pass inline strings.
   */
  viewPaths: 'resources/views',

  /** ORM driver — `drizzle`, `prisma`, `kysely`, or `none`. */
  orm: 'none',

  // ---------------------------------------------------------------------------
  // Database
  // ---------------------------------------------------------------------------

  database: {
    driver: 'none',
    url: process.env.DATABASE_URL ?? '',
  },

  // ---------------------------------------------------------------------------
  // Inertia (only consulted when `view === 'inertia'`)
  // ---------------------------------------------------------------------------

  inertia: {
    frontend: 'react',
    ssr: true,
    version: '1.0.0',
  },

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------

  paths: {
    app:         'app',
    controllers: 'app/controllers',
    services:    'app/services',
    modules:     'app/modules',
    models:      'app/models',
    migrations:  'app/database/migrations',
    seeds:       'db/seeds',
    middleware:  'app/middleware',
    dto:         'app/dto',
  },
};
