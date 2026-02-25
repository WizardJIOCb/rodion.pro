import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string().transform((str) => new Date(str)),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    hero: z.string().optional(),
  }),
});

export const collections = {
  'blog-ru': blogCollection,
  'blog-en': blogCollection,
};
