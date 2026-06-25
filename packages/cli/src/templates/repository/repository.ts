/**
 * Repository template (standard decorator mode).
 *
 * Uses field injection (@Inject on fields) instead of constructor params.
 * The parent DrizzleRepository accepts optional constructor args, so
 * `super()` is safe with no arguments — fields are injected by the DI
 * container after construction.
 *
 * Context:
 *   name          — PascalCase class name
 *   camel         — camelCase variable
 *   kebab         — kebab-case
 *   tableName     — plural snake_case table name
 *   repository    — PascalCase repository name
 */

export default `
import { Injectable, Inject } from '@nexusts/core';
import { DrizzleRepository, DrizzleService } from '@nexusts/drizzle';
import { {{ snake }} } from '../models/{{ kebab }}.model.js';
import type { {{ name }}, New{{ name }} } from '../models/{{ kebab }}.model.js';

@Injectable()
export class {{ repository }} extends DrizzleRepository<typeof {{ snake }}, {{ name }}> {
  @Inject(DrizzleService.TOKEN) declare db: DrizzleService;
  protected readonly table = {{ snake }};
}
`.trimStart();
