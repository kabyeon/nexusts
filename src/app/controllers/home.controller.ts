/**
 * HomeController demonstrating:
 * - Functional style: Hono-native `(c) => ...` handlers.
 * - View rendering via the Rendu adapter.
 * - HTML responses with the framework's view engine.
 *
 * Controllers don't have to use Nest decorators — Hono functions and
 * class decorators are interchangeable.
 */
import { Controller } from '../../core/decorators/controller.js';
import { Get } from '../../core/decorators/http-methods.js';
import { Param } from '../../core/decorators/params.js';
import { RenduAdapter } from '../../view/rendu.js';

@Controller('/')
export class HomeController {
  private rendu = new RenduAdapter();

  /** GET / — JSON greeting. */
  @Get('/')
  async index() {
    return { message: 'Welcome to Nexus', version: '0.1.0' };
  }

  /** GET /hello/:name — string response. */
  @Get('/hello/:name')
  async hello(@Param('name') name: string) {
    return { greeting: `Hello, ${name}!` };
  }

  /** GET /view — render a Rendu template inline. */
  @Get('/view')
  async view() {
    const html = await this.rendu.render(
      `<h1>Hello, <?= name ?>!</h1>
       <p>You have <?= count ?> messages.</p>
       <? if (count > 5) { ?>
         <p><strong>Inbox is full.</strong></p>
       <? } ?>`,
      { name: 'Nexus', count: 3 }
    );
    return html;
  }
}