import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type { MobileLibraryInput } from "../core/mobileModel.ts";
import type { LibraryEdit } from "../application/libraryEdits.ts";
import {
  Action,
  Card,
  Content,
  Field,
  Header,
  Label,
  Row,
  Screen,
} from "../ui/primitives.tsx";
import { Sheet } from "../ui/Sheet.tsx";
import { libraryLabels } from "../ui/localLabels.ts";
import { useAction } from "../ui/useAction.ts";
import { useUnsavedExit } from "../ui/useUnsavedExit.tsx";

export default function LibraryEditorScreen() {
  const { id = "new" } = useLocalSearchParams<{ id: string }>();
  const { state } = useApplication(),
    scope = state.accountId!;
  return <Editor key={`${scope}/${id}`} id={id} scope={scope} />;
}
function Editor({ id, scope }: { id: string; scope: string }) {
  const { app, state } = useApplication(),
    { busy, run } = useAction();
  const [edit, setEdit] = useState(() => app.local.openLibraryEdit(id, scope));
  const [comparing, setComparing] = useState(false);
  const existing = state.snapshot?.library?.find((e) => e.id === id);
  const changed = Boolean(existing && existing.revision !== edit.baseRevision);
  const dirty = JSON.stringify(edit.input) !== JSON.stringify(edit.baseline);
  const exit = useUnsavedExit(dirty, scope, () =>
    app.local.discardLibraryEdit(id, scope),
  );
  function update(value: LibraryEdit) {
    try {
      app.local.rememberLibraryEdit(id, value, scope);
      setEdit(value);
    } catch (error) {
      app.report(error);
    }
  }
  function field<K extends keyof MobileLibraryInput>(
    key: K,
    value: MobileLibraryInput[K],
  ) {
    update({ ...edit, input: { ...edit.input, [key]: value } });
  }
  return (
    <Screen keyboard>
      <Header title={id === "new" ? "新建库条目" : "编辑库条目"} back />
      <Content>
        {id !== "new" && !existing && (
          <Label danger>原条目已不存在。本次输入可以另存为新的记录。</Label>
        )}
        {changed && (
          <Card>
            <Label danger>
              已保存的条目出现新版本。请先比较，再决定是否用本次输入更新。
            </Label>
            <Action
              label="比较已保存的新版"
              onPress={() => setComparing(true)}
            />
          </Card>
        )}
        <Card>
          <Label>类型</Label>
          <Row>
            {(Object.keys(libraryLabels) as MobileLibraryInput["kind"][]).map(
              (kind) => (
                <Action
                  compact
                  selected={edit.input.kind === kind}
                  key={kind}
                  disabled={busy}
                  label={libraryLabels[kind]}
                  onPress={() => field("kind", kind)}
                />
              ),
            )}
          </Row>
          <Field
            label="名称（最多 200 字符）"
            value={edit.input.name}
            editable={!busy}
            onChangeText={(value) => field("name", value)}
            maxLength={200}
          />
          <Field
            label={`内容（${edit.input.content.length}/20000）`}
            value={edit.input.content}
            onChangeText={(value) => field("content", value)}
            editable={!busy}
            multiline
            maxLength={20000}
            style={{ minHeight: 220, textAlignVertical: "top" }}
          />
          <Label muted small>
            模板变量按原文字保留。角色与 Skill
            指令只有经你确认应用到草稿后才进入生成输入，不会赋予执行权限。
          </Label>
          <Label muted small>
            未保存输入仅保留在当前运行的内存中；重新登录原账号可继续，退出应用前请保存。
          </Label>
        </Card>
        <Action
          primary
          label={id !== "new" && !existing ? "另存新条目" : "保存条目"}
          disabled={
            !edit.input.name.trim() || !edit.input.content.trim() || changed
          }
          reason={changed ? "先比较新版，确认后再更新。" : undefined}
          busy={busy}
          onPress={() =>
            void run(async () => {
              const asNew = id !== "new" && !existing;
              await app.local.saveLibraryEdit(id, edit, scope, asNew);
              exit.allow();
              if (app.getState().accountId === scope)
                router.replace(
                  id === "new" || asNew ? "/library" : `/library/${id}`,
                );
            })
          }
        />
      </Content>
      <Sheet
        title="比较条目版本"
        open={comparing}
        onClose={() => setComparing(false)}
      >
        <Label>已保存 · 版本 {existing?.revision}</Label>
        <Label>{existing?.name}</Label>
        <Label>{existing?.content}</Label>
        <Label>本次未保存输入</Label>
        <Label>{edit.input.name}</Label>
        <Label>{edit.input.content}</Label>
        <Action
          primary
          label="保留本次输入，确认以新版为基础"
          disabled={!existing}
          onPress={() => {
            if (!existing) return;
            update({
              ...edit,
              baseRevision: existing.revision,
              baseline: {
                kind: existing.kind,
                name: existing.name,
                content: existing.content,
              },
            });
            setComparing(false);
          }}
        />
      </Sheet>
      {exit.dialog}
    </Screen>
  );
}
