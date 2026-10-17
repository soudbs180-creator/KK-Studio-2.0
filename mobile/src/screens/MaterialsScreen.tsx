import { useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import { importImage, importDocument } from "../storage/media";
import {
  Action,
  Card,
  Empty,
  Field,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { useAction } from "../ui/useAction.ts";
import { OriginalPreview } from "../ui/OriginalPreview.tsx";
import {
  MaterialFilters,
  materialMatches,
  type MaterialKind,
} from "./MaterialFilters.tsx";
import { MaterialBatchSheet } from "./MaterialBatchSheet.tsx";
export default function MaterialsScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [search, setSearch] = useState(""),
    [kind, setKind] = useState<MaterialKind>("all"),
    [favorites, setFavorites] = useState(false),
    [gridRequested, setGrid] = useState(false),
    [selecting, setSelecting] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [batch, setBatch] = useState(false);
  const dimensions = useWindowDimensions(),
    gridAllowed = dimensions.width >= 360 && dimensions.fontScale <= 1.35;
  const grid = gridRequested && gridAllowed,
    scope = state.accountId!;
  const selectedIds = selected.filter((id) =>
    state.snapshot?.assets.some((a) => a.id === id && !a.hidden && !a.deleting),
  );
  const assets =
    state.snapshot?.assets
      .filter(
        (a) =>
          !a.hidden &&
          !a.deleting &&
          materialMatches(a.mime, kind) &&
          (!favorites || a.favorite) &&
          `${a.name} ${a.mime}`.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => b.createdAt - a.createdAt) ?? [];
  async function importAsset(image: boolean) {
    const ctx = app.context();
    if (ctx.accountId !== scope) throw new Error("会话已变化。");
    await (image ? importImage(ctx.repo) : importDocument(ctx.repo));
    await app.mutate(ctx, (repo) => repo.load());
  }
  return (
    <Screen>
      <Header title="素材" back />
      <View style={{ padding: 16, gap: 12 }}>
        <Field label="搜索素材" value={search} onChangeText={setSearch} />
        <Row>
          <Action
            compact
            primary
            label="导入图片"
            busy={busy}
            onPress={() => void run(() => importAsset(true))}
          />
          <Action
            compact
            label="导入文件"
            busy={busy}
            onPress={() => void run(() => importAsset(false))}
          />
        </Row>
        <MaterialFilters
          kind={kind}
          onKind={setKind}
          favorites={favorites}
          onFavorites={() => setFavorites(!favorites)}
          grid={grid}
          onGrid={() => setGrid(!gridRequested)}
          gridReason={
            gridAllowed ? undefined : "屏幕或系统字号较大时，列表便于完整阅读。"
          }
        />
        <Row>
          <Action
            compact
            selected={selecting}
            label={selecting ? "结束多选" : "多选管理"}
            onPress={() => {
              setSelecting(!selecting);
              setSelected([]);
            }}
          />
          {selecting && (
            <>
              <Action
                compact
                label="选择当前筛选全部"
                onPress={() => setSelected(assets.map((a) => a.id))}
              />
              <Action
                compact
                label={`管理所选 ${selectedIds.length} 件`}
                disabled={!selectedIds.length}
                onPress={() => setBatch(true)}
              />
            </>
          )}
        </Row>
      </View>
      <FlatList
        key={grid ? "grid" : "list"}
        data={assets}
        numColumns={grid ? 2 : 1}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        keyExtractor={(asset) => asset.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 16 }}
        columnWrapperStyle={grid ? { gap: 12 } : undefined}
        ListEmptyComponent={
          <Empty
            title="没有匹配素材"
            description="导入不会编辑或缩小原件。文件字节会在设备上校验后保存。"
          />
        }
        renderItem={({ item: asset }) => (
          <View style={{ flex: 1, maxWidth: grid ? "50%" : undefined }}>
            <Card>
              <OriginalPreview asset={asset} />
              <Label>{asset.name}</Label>
              <Label muted small>
                {asset.mime} · {(asset.size / 1024).toFixed(1)} KB
              </Label>
              <Action
                compact
                selected={asset.favorite}
                label="收藏"
                busy={busy}
                onPress={() =>
                  void run(() =>
                    app.materials.favorite([asset.id], !asset.favorite, scope),
                  )
                }
              />
              {selecting && (
                <Action
                  selected={selectedIds.includes(asset.id)}
                  label={
                    selectedIds.includes(asset.id) ? "已选择" : "选择此素材"
                  }
                  onPress={() =>
                    setSelected(
                      selected.includes(asset.id)
                        ? selected.filter((id) => id !== asset.id)
                        : [...selected, asset.id],
                    )
                  }
                />
              )}
              <Action
                label="查看素材"
                onPress={() =>
                  router.push({
                    pathname: "/materials/[id]",
                    params: { id: asset.id },
                  })
                }
              />
            </Card>
          </View>
        )}
      />
      {batch && (
        <MaterialBatchSheet
          ids={selectedIds}
          onClose={() => setBatch(false)}
          onRemoved={() => {
            setBatch(false);
            setSelected([]);
          }}
        />
      )}
    </Screen>
  );
}
