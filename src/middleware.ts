import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  if (pathname === '/old' || pathname === '/old/') {
    return context.rewrite('/ru/old');
  }

  if (pathname.startsWith('/old/en/')) {
    return context.rewrite(pathname.replace(/^\/old\/en/, '/en'));
  }

  if (pathname.startsWith('/old/')) {
    return context.rewrite(pathname.replace(/^\/old/, '/ru'));
  }

  return next();
});
