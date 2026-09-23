import { useEffect, useRef, useState } from "react";
import { promptLibrary, type Prompt } from "../features/prompts/promptLibrary";

const PAGE_SIZE = 12;

export default function PromptLibraryPanel({
  onApply,
  onClose,
  target,
}: {
  onApply: (text: string) => string | undefined;
  onClose: () => void;
  target: string;
}) {
  const [sourceId, setSourceId] = useState(promptLibrary.sources[0].id);
  const [items, setItems] = useState<Prompt[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(
    "尚未加载来源，点击加载后访问所选公开目录。",
  );
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const source = promptLibrary.sources.find((item) => item.id === sourceId)!;
  useEffect(() => {
    const run = ++revision.current;
    controller.current?.abort();
    setLoading(false);
    setSelected(null);
    setItems([]);
    setPage(0);
    setError("");
    setStatus("尚未加载来源，点击加载后访问所选公开目录。");
    void promptLibrary
      .readCachedSource(sourceId)
      .then((cached) => {
        if (run !== revision.current) return;
        setItems(cached);
        if (cached.length)
          setStatus(`显示本地缓存 · ${cached.length} 条；可重新加载获取更新。`);
      })
      .catch(() => {
        if (run === revision.current)
          setError("本地缓存无法读取，请重新加载来源。");
      });
    return () => {
      revision.current++;
      controller.current?.abort();
    };
  }, [sourceId]);
  async function refresh() {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const run = ++revision.current;
    setLoading(true);
    setError("");
    try {
      const result = await promptLibrary.refreshSource(sourceId, {
        signal: abort.signal,
      });
      const next = await promptLibrary.readCachedSource(sourceId);
      if (run !== revision.current) return;
      setItems(next);
      setPage(0);
      setSelected(null);
      setStatus(`来源加载完成 · ${result.count} 条`);
    } catch (cause) {
      if (run !== revision.current) return;
      if (abort.signal.aborted) setStatus("已取消加载，保留现有列表。");
      else
        setError(
          `来源加载失败，${items.length ? "保留本地缓存。" : "可检查网络后重试。"} ${cause instanceof Error ? cause.message : "请稍后重试"}`,
        );
    } finally {
      if (run === revision.current) setLoading(false);
    }
  }
  const query = keyword.trim().toLowerCase();
  const filtered = items.filter((item) =>
    [item.title, item.prompt, ...item.tags]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  return (
    <section className="prompt-library-panel">
      <header className="prompt-library-header">
        <div>
          <h2>提示词库</h2>
          <p>选用公开提示词，加入{target}后继续编辑。</p>
        </div>
        <button
          className="ui-icon-button"
          type="button"
          aria-label="关闭提示词库"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="prompt-library-source">
        <label>
          提示词来源
          <select
            className="settings-select"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
          >
            {promptLibrary.sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ui-button"
          type="button"
          onClick={() =>
            loading ? controller.current?.abort() : void refresh()
          }
        >
          {loading ? "取消加载" : "加载来源"}
        </button>
        <a href={source.homepage} target="_blank" rel="noreferrer noopener">
          来源主页 ↗
        </a>
      </div>
      <p className="prompt-library-note">
        加载时仅访问所选公开目录；不会发送你的草稿、项目或密钥。应用仅加入文字，不会自动生成或导入参考图。
      </p>
      <p role="status">{loading ? "正在加载来源…" : status}</p>
      {error && (
        <p className="prompt-library-error" role="alert">
          {error}
        </p>
      )}
      <label className="prompt-library-search">
        搜索提示词
        <input
          className="ui-input"
          type="search"
          aria-label="搜索提示词"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(0);
          }}
          placeholder="搜索标题、正文或标签"
        />
      </label>
      <div className="prompt-library-content">
        <div className="prompt-library-results">
          <div
            className="prompt-library-list"
            aria-label="提示词列表"
            aria-busy={loading}
          >
            {filtered
              .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
              .map((item) => (
                <button
                  className="prompt-library-item"
                  type="button"
                  key={item.id}
                  aria-pressed={selected?.id === item.id}
                  aria-label={item.title}
                  onClick={() => {
                    setSelected(item);
                    setError("");
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>{item.tags.join(" · ") || source.name}</span>
                </button>
              ))}
            {!filtered.length && (
              <p>
                {items.length
                  ? "没有匹配的提示词，试试其他关键词。"
                  : "暂无提示词，选择来源后加载。"}
              </p>
            )}
          </div>
          <div className="prompt-library-pagination">
            <button
              className="ui-button"
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              上一页
            </button>
            <span>
              {currentPage + 1} / {pages} · {filtered.length} 条
            </span>
            <button
              className="ui-button"
              type="button"
              disabled={currentPage + 1 === pages}
              onClick={() => setPage((current) => current + 1)}
            >
              下一页
            </button>
          </div>
        </div>
        <article className="prompt-library-detail" aria-label="提示词预览">
          {selected ? (
            <>
              <h3>{selected.title}</h3>
              <p>{selected.prompt}</p>
              <span>{selected.prompt.length} 字符</span>
            </>
          ) : (
            <p>选择一条提示词，查看完整内容。</p>
          )}
        </article>
      </div>
      <footer>
        <span>加入{target}，保留现有文字、模型和附件。</span>
        <button
          className="ui-button is-primary"
          type="button"
          disabled={!selected || loading}
          onClick={() => {
            if (!selected) return;
            const issue = onApply(selected.prompt);
            if (issue) setError(issue);
            else onClose();
          }}
        >
          加入草稿
        </button>
      </footer>
    </section>
  );
}
