import { ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { MobileAsset } from "../core/mobileModel.ts";
import { useApplication } from "../application/AppProvider.tsx";
import { OriginalPreview } from "../ui/OriginalPreview.tsx";
import { useImageDerivativeEditor } from "../ui/useImageDerivativeEditor.ts";
import { radii } from "../ui/geometry.ts";
import {
  Action,
  Card,
  Content,
  Empty,
  Field,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { useTheme } from "../ui/theme.tsx";
export default function ImageEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { state } = useApplication();
  const asset = state.snapshot?.assets.find((a) => a.id === id && !a.deleting);
  if (!asset || !asset.mime.startsWith("image/"))
    return (
      <Screen>
        <Header title="图片编辑" back />
        <Content>
          <Empty
            title="图片原件不可用"
            description="返回素材列表重新读取；现有项目和原件保留。"
          />
        </Content>
      </Screen>
    );
  return <ImageEditor key={`${state.accountId}:${asset.id}`} asset={asset} />;
}
function ImageEditor({ asset }: { asset: MobileAsset }) {
  const editor = useImageDerivativeEditor(asset),
    t = useTheme();
  const {
    size,
    error,
    loading,
    busy,
    rotation,
    width,
    cropping,
    crop,
    preview,
    source,
    previewError,
    saved,
    disabled,
    buildPreview,
    save,
  } = editor;
  return (
    <Screen keyboard>
      <Header title="图片编辑" back />
      <Content>
        <Label muted>
          裁剪 → 旋转 → 按比例缩放。预览完成后才可另存为 PNG，父原件的字节和
          SHA-256 保留。
        </Label>
        {loading && (
          <ActivityIndicator
            color={t.accent}
            accessibilityLabel="正在读取图片尺寸"
          />
        )}
        {error && <Label danger>{error}</Label>}
        {size && (
          <>
            <Card>
              <Label title>
                原图 · {size.width} × {size.height}
              </Label>
              <OriginalPreview asset={asset} />
            </Card>
            <Card>
              <Label title>编辑参数</Label>
              <Label small muted>
                旋转角度
              </Label>
              <Row>
                {[0, 90, 180, 270].map((value) => (
                  <Action
                    key={value}
                    label={`${value}°`}
                    compact
                    selected={rotation === value}
                    disabled={disabled}
                    onPress={() => editor.setRotation(value)}
                  />
                ))}
              </Row>
              <Field
                label="输出宽度（像素，留空保持尺寸）"
                keyboardType="number-pad"
                value={width}
                editable={!disabled}
                onChangeText={editor.setWidth}
              />
              <Action
                label={cropping ? "关闭裁剪" : "启用裁剪"}
                selected={cropping}
                disabled={disabled}
                onPress={editor.toggleCrop}
              />
              {cropping && (
                <>
                  <Label muted small>
                    使用原图坐标，从左上角开始；保留范围不能超出原图。
                  </Label>
                  {(
                    [
                      ["x", "左侧起点 X"],
                      ["y", "顶部起点 Y"],
                      ["width", "裁剪宽度"],
                      ["height", "裁剪高度"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      keyboardType="number-pad"
                      value={crop[key]}
                      editable={!disabled}
                      onChangeText={(value) => editor.setCrop(key, value)}
                    />
                  ))}
                </>
              )}
              <Action
                label="生成本地编辑预览"
                disabled={disabled}
                busy={busy === "preview"}
                onPress={() => void buildPreview()}
              />
              {busy === "preview" && (
                <Action label="取消本次预览" onPress={editor.cancelPreview} />
              )}
            </Card>
          </>
        )}
        {preview && source && (
          <Card>
            <Label title>
              派生预览 · {preview.width} × {preview.height}
            </Label>
            <Image
              accessibilityLabel="本地编辑派生预览"
              source={{ uri: source.uri }}
              resizeMode="contain"
              style={{
                width: "100%",
                aspectRatio: preview.width / preview.height,
                borderRadius: radii.card,
              }}
              onError={() => editor.reportPreviewError(source)}
            />
            <Label muted small>
              {preview.bytes.length} 字节 · 尚未保存时仅存在本次编辑内存。
            </Label>
          </Card>
        )}
        <Action
          primary
          label={saved ? "派生图片已保存" : "保存为独立派生图片"}
          busy={busy === "save"}
          disabled={
            !preview ||
            !source ||
            previewError ||
            Boolean(saved) ||
            Boolean(busy)
          }
          onPress={() => void save()}
        />
        {saved && (
          <Card>
            <Label>已保存独立原件，父原图保留。</Label>
            <Label muted small>
              SHA-256：{saved.sha256}
            </Label>
            <Action label="查看派生原件" onPress={editor.openSaved} />
          </Card>
        )}
        <Action
          label="遮罩 / 局部重绘"
          disabled
          reason="当前生成接口未报告可验证的遮罩重绘能力；此页仅执行本地裁剪、旋转和缩放。"
        />
        {busy === "save" && (
          <Label muted>
            正在保存到当前账号设备存储；写入开始后不可取消，失败时预览与原件保留。
          </Label>
        )}
      </Content>
      {editor.exitDialog}
    </Screen>
  );
}
