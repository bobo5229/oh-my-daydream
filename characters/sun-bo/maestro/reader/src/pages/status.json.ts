import type { APIRoute } from 'astro';

export const GET: APIRoute = () => new Response(
  JSON.stringify({ project: 'maestro-reader', status: 'ready' }),
  { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
);
