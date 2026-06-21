import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (pathname === '/old' || pathname === '/old/') {
    return context.rewrite('/ru/old');
  }

  return next();
});
