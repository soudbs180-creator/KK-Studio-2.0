import { useState } from "react";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type { LibraryImportPlan } from "../application/localWorkflows.ts";
import {
  pickPortableJson,
  sharePortableText,
} from "../application/portableFiles";
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
import { Sheet } from "../ui/Sheet.tsx";
import { libraryLabels } from "../ui/localLabels.ts";
import { useAction } from "../ui/useAction.ts";
import type { MobileLibraryInput } from "../core/mobileModel.ts";
export default function LibraryScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState<MobileLibraryInput["kind"]>(),
    [plan, setPlan] = useState<LibraryImportPlan>();
  const entries = state.snapshot?.library ?? [],
    visible = entries.filter(
      (e) =>
        (!kind || e.kind === kind) &&
        `${e.name}\n${e.content}`.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <Screen>
      <Header
        title="创作库"
        back
        right={
          <Action
            compact
            primary
            label="＋"
            onPress={() => router.push("/library/new")}
          />
        }
      />
      <Content>
        <Label muted small>
          提示词、模板、角色说明和 Skill
          指令保存在此账号设备空间。它们是文字，不带工具执行授权。
        </Label>
        <Field label="搜索创作库" value={query} onChangeText={setQuery} />
        <Row>
          <Action
            compact
            selected={!kind}
            label="全部"
            onPress={() => setKind(undefined)}
          />
          {(Object.keys(libraryLabels) as MobileLibraryInput["kind"][]).map(
            (k) => (
              <Action
                compact
                key={k}
                selected={kind === k}
                label={libraryLabels[k]}
                onPress={() => setKind(k)}
              />
            ),
          )}
        </Row>
        <Row>
          <Action
            label="导入库文件"
            busy={busy}
            onPress={() =>
              void run(async () => {
                const ctx = app.context(),
                  payload = await pickPortableJson();
                if (payload === null) return;
                const checked = await app.local.preflightLibrary(
                  payload,
                  ctx.accountId,
                );
                if (app.valid(ctx)) setPlan(checked);
              })
            }
          />
          <Action
            label="导出整个库"
            disabled={!entries.length}
            busy={busy}
            onPress={() =>
              void run(async () => {
                const ctx = app.context(),
                  payload = await app.local.exportLibrary(
                    undefined,
                    ctx.accountId,
                  );
                if (app.valid(ctx))
                  await sharePortableText(
                    payload,
                    "kk-library.json",
                    () => app.valid(ctx),
                    "application/json",
                  );
              })
            }
          />
        </Row>
        {!visible.length && (
          <Empty
            title={entries.length ? "没有匹配条目" : "创作库为空"}
            description="创建自己的说明，或导入经过预检的独立库文件。"
          />
        )}
        {visible.map((entry) => (
          <Card key={entry.id}>
            <Label title>{entry.name}</Label>
            <Label muted small>
              {libraryLabels[entry.kind]} · 版本 {entry.revision}
            </Label>
            <Label muted>{entry.content.slice(0, 140)}</Label>
            <Action
              label="预览与使用"
              onPress={() => router.push(`/library/${entry.id}`)}
            />
          </Card>
        ))}
      </Content>
      <Sheet
        title="导入创作库"
        open={Boolean(plan)}
        onClose={() => setPlan(undefined)}
      >
        <Label>
          预检通过：{plan?.entryCount}{" "}
          个条目。将创建独立记录，不覆盖原条目或携带连接凭据。
        </Label>
        <Label muted>
          {plan?.kinds.map((k) => libraryLabels[k]).join("、")}
        </Label>
        <Action
          primary
          label="确认导入独立条目"
          busy={busy}
          onPress={() =>
            void run(async () => {
              await app.local.importLibrary(plan!);
              setPlan(undefined);
            })
          }
        />
      </Sheet>
    </Screen>
  );
}
