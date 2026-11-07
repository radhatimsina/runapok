import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const writings = defineCollection({
  // The file name is the id: "2016-06-18-my-poem" -> /2016/06/18/my-poem/
  loader: glob({
    pattern: '*.md',
    base: './src/content/writings',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['poem', 'story']).default('poem'),
    language: z.enum(['en', 'ne']).default('en'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional().or(z.literal('')),
    alsoPublishedAt: z.string().url().optional().or(z.literal('')),
    legacyUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  // The file name is the address: "books.md" -> /books/
  loader: glob({
    pattern: '*.md',
    base: './src/content/pages',
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional().or(z.literal('')),
    showInMenu: z.boolean().default(false),
    menuOrder: z.number().default(50),
    comments: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writings, pages };
