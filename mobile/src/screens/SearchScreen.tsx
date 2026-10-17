import { useState } from "react";
import { router } from "expo-router";
import { useApplication } from "../application/AppProvider.tsx";
import type { SearchResult } from "../application/localSearch.ts";
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
import { searchLabels } from "../ui/localLabels.ts";
import { useAction } from "../ui/useAction.ts";
export default function SearchScreen() {
  const { app, state } = useApplication(),
    { busy, run } = useAction(),
    [input, setInput] = useState(""),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState<SearchResult["kind"]>();
  const results = app.local.search(query),
    visible = results.filter((r) => !kind || r.kind === kind),
    scope = state.accountId!;
  async function locate(result: SearchResult) {
    if (app.context().accountId !== scope) throw new Error("会话已变化。");
    if (result.kind === "project") {
      await app.openProject(result.id);
      if (app.getState().accountId === scope) router.push("/");
    } else if (result.kind === "asset") router.push(`/materials/${result.id}`);
    else if (result.kind === "task") router.push(`/tasks/${result.id}`);
    else if (result.kind === "library") router.push(`/library/${result.id}`);
    else router.push(`/messages/${result.id}`);
  }
  return (
    <Screen keyboard>
      <Header title="搜索" back />
      <Content>
        <Field
          label="搜索当前账号的设备内容"
          value={input}
          onChangeText={setInput}
          maxLength={256}
          onSubmitEditing={() => setQuery(input)}
          returnKeyType="search"
        />
        <Action
          primary
          label="搜索"
          disabled={!input.trim()}
          onPress={() => setQuery(input)}
        />
        <Row>
          <Action
            compact
            selected={!kind}
            label="全部"
            onPress={() => setKind(undefined)}
          />
          {(Object.keys(searchLabels) as SearchResult["kind"][]).map((k) => (
            <Action
              key={k}
              compact
              selected={kind === k}
              label={searchLabels[k]}
              onPress={() => setKind(k)}
            />
          ))}
        </Row>
        <Label muted small>
          只检索此账号设备空间，最多显示 100
          条。不会将关键词或库内容发送给服务。
        </Label>
        {!visible.length && (
          <Empty
            title={query ? "没有匹配内容" : "输入关键词开始搜索"}
            description="项目名称、消息、任务输入和结果、素材名称与创作库内容均可定位。"
          />
        )}
        {visible.map((result) => (
          <Card key={`${result.kind}:${result.id}`}>
            <Label title>{result.title}</Label>
            <Label muted small>
              {searchLabels[result.kind]}
            </Label>
            <Label>{result.snippet}</Label>
            <Action
              label="打开此记录"
              busy={busy}
              onPress={() => void run(() => locate(result))}
            />
          </Card>
        ))}
      </Content>
    </Screen>
  );
}
