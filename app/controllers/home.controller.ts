import { Controller, Get } from 'nexusjs';

@Controller('/')
export class HomeController {
  @Get('/')
  index() {
    return {
      view: 'welcome.html',
      data: { year: new Date().getFullYear() },
    };
  }
}
