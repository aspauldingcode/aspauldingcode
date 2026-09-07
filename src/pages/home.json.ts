export const prerender = true;

import { homeModel } from '@/lib/homeData';

export function GET() {
  return new Response(JSON.stringify(homeModel()), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
