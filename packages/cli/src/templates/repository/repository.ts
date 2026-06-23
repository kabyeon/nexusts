/**
 * Repository template.
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
  constructor(
    @Inject(DrizzleService.TOKEN) db: DrizzleService,
  ) {
    super(db, {{ snake }});
  }
}
`.trimStart();
