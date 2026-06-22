import { Module } from 'nexusjs';
import { StaticModule } from 'nexusjs/static';
import { HomeController } from './controllers/home.controller.js';

@Module({
  imports: [
    StaticModule.forRoot({ root: './public', prefix: '/static' }),
  ],
  controllers: [HomeController],
})
export class AppModule {}
