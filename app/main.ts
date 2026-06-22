import 'reflect-metadata';
import { Application } from 'nexusjs';
import { StaticModule } from 'nexusjs/static';
import { AppModule } from './app.module.js';

const app = new Application(AppModule);
// Serve ./public files under /static/*
app.server.app.use('/static/*', StaticModule.mount({ root: './public', prefix: '/static' }));

await app.listen(3000);
console.log('[nexusjs] Listening on http://localhost:3000');
