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
import { Injectable } from '@kabyeon/nexusjs';
import { DrizzleRepository } from '@kabyeon/nexusjs/drizzle';
import { {{ tableName }} } from '../models/{{ kebab }}.model.js';
import type { {{ name }}, New{{ name }} } from '../models/{{ kebab }}.model.js';

@Injectable()
export class {{ repository }} extends DrizzleRepository<typeof {{ tableName }}, {{ name }}> {
  constructor() {
    super({{ tableName }});
  }
}
`.trimStart();
