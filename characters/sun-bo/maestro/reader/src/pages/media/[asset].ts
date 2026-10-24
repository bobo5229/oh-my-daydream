import { extname } from 'node:path';
import { loadReaderContent } from '../../content/index.ts';
import { loadLore } from '../../metadata/lore.ts';
import { loadAssets } from '../../metadata/assets.ts';
import type { VisualAsset } from '../../metadata/assets.ts';
import type { APIRoute } from 'astro';
export async function getStaticPaths() {
  const assets = await loadAssets(await loadReaderContent(), await loadLore());
  return assets.assets.filter(asset => asset.available).map(asset => ({ params: { asset: `${asset.id}${extname(asset.file).toLowerCase()}` }, props: { asset } }));
}
export const GET: APIRoute = ({ props }) => {
  const asset = props['asset'] as VisualAsset;
  return new Response(asset.bytes ? new Uint8Array(asset.bytes) : null, { headers: { 'Content-Type': asset.mime, 'X-Content-Type-Options': 'nosniff' } });
};
