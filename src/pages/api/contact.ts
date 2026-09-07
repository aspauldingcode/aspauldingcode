import type { APIRoute } from 'astro';
import { handleContactPost } from '@/lib/contactApi';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleContactPost(request);
