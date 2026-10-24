import type { AssetIndex } from './assets.ts';
import type { Illustration } from './illustrations.ts';
import type { VisualModule } from './enhancements.ts';

/** 将已校验的插图／档案关联加入派生索引，保留输入索引及既有关联顺序。 */
export function withAssetRelations(index: AssetIndex, placements: readonly Illustration[], modules: readonly VisualModule[]): AssetIndex {
  return {
    diagnostics: [...index.diagnostics],
    assets: index.assets.map(asset => {
      const chapterIds = [...asset.chapterIds];
      const interludeIds = [...asset.interludeIds];
      for (const placement of placements) {
        if (placement.assetId === asset.id && !chapterIds.includes(placement.chapterId)) chapterIds.push(placement.chapterId);
      }
      for (const module of modules) {
        if ('assetId' in module && module.assetId === asset.id && !interludeIds.includes(module.interludeId)) interludeIds.push(module.interludeId);
      }
      return { ...asset, entityIds: [...asset.entityIds], chapterIds, interludeIds };
    }),
  };
}
