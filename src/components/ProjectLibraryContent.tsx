import { useEffect, useState } from "react";
import type { CreationProject } from "../features/creation/index.ts";
import type { ProjectLibraryActions } from "../features/projects/index.ts";
import { sidebarProjectItem } from "../features/projects/index.ts";
import SidebarProjectEntry from "./SidebarProjectEntry";

export default function ProjectLibraryContent({
  projects,
  actions,
  search,
  trash,
  onOpen,
}: {
  projects: CreationProject[];
  actions?: ProjectLibraryActions;
  search: string;
  trash: boolean;
  onOpen: (id: string) => void;
}) {
  const [groupId, setGroupId] = useState("all");
  const groups =
    actions?.groups.filter((group) => group.deletedAt === undefined) ?? [];
  const selectedGroup = groups.find((group) => group.id === groupId);
  const [groupDraft, setGroupDraft] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const groupName =
    groupDraft?.id === selectedGroup?.id
      ? (groupDraft?.name ?? "")
      : (selectedGroup?.name ?? "");
  useEffect(() => {
    if (groupId !== "all" && groupId !== "ungrouped" && !selectedGroup)
      setGroupId("all");
  }, [groupId, selectedGroup]);
  const visible = projects.filter(
    (project) =>
      (project.trashedAt !== undefined) === trash &&
      `${project.name}${project.prompt}`.toLowerCase().includes(search) &&
      (groupId === "all" ||
        (groupId === "ungrouped"
          ? !project.groupId
          : project.groupId === groupId)),
  );
  return (
    <div className="project-library-content">
      {!trash && (
        <>
          <div className="project-library-actions" aria-label="项目资源操作">
            <button
              type="button"
              className="project-library-action"
              aria-label="新建文件夹"
              disabled={!actions?.canEdit}
              title={!actions?.canEdit ? "项目存储尚未就绪" : undefined}
              onClick={() => actions?.onCreateGroup()}
            >
              <img
                src="/design/figma/library-folder-add.svg"
                width={24}
                height={24}
                alt=""
              />
              <span>
                <strong>新建文件夹</strong>
                <small>持久保存项目分组</small>
              </span>
            </button>
            <button
              type="button"
              className="project-library-action"
              aria-label="上传文件"
              disabled
              title="文件上传将在本地资源服务接入后可用"
            >
              <img
                src="/design/figma/library-upload.svg"
                width={24}
                height={24}
                alt=""
              />
              <span>
                <strong>上传文件</strong>
                <small>支持批量上传</small>
              </span>
            </button>
          </div>
          {actions?.groups
            .filter((group) => group.deletedAt !== undefined)
            .map((group) => (
              <button
                key={group.id}
                className="ui-capsule"
                disabled={!actions.canEdit}
                onClick={() => actions.onRestoreGroup(group.id)}
              >
                恢复项目文件夹：{group.name}
              </button>
            ))}
        </>
      )}
      <div className="project-library-group-controls">
        <label>
          项目分组{" "}
          <select
            aria-label="筛选项目分组"
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
              setGroupDraft(null);
            }}
          >
            <option value="all">全部项目</option>
            <option value="ungrouped">未分组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        {selectedGroup && !trash && (
          <>
            <input
              aria-label="项目组名称"
              maxLength={120}
              value={groupName}
              disabled={!actions?.canEdit}
              onChange={(event) =>
                setGroupDraft({
                  id: selectedGroup.id,
                  name: event.target.value,
                })
              }
            />
            <button
              className="ui-capsule"
              disabled={!actions?.canEdit || !groupName.trim()}
              onClick={() => {
                actions?.onRenameGroup(selectedGroup.id, groupName);
                setGroupDraft(null);
              }}
            >
              保存分组名称
            </button>
            <button
              className="ui-capsule"
              disabled={!actions?.canEdit}
              title="仅解除分组，项目和素材会保留"
              onClick={() => actions?.onDeleteGroup(selectedGroup.id)}
            >
              删除项目组
            </button>
          </>
        )}
      </div>
      <div className="project-grid">
        {visible.map((project) => (
          <div
            className="project-library-card"
            key={project.id}
            data-project-id={project.id}
          >
            <button
              type="button"
              className="project-library-preview"
              aria-label={`打开编辑 ${project.name}`}
              disabled={trash}
              onClick={() => onOpen(project.id)}
            >
              <span className="catalog-folder-mark">▱</span>
            </button>
            <SidebarProjectEntry
              visible
              selected={false}
              defaultTitle={project.name}
              visual={sidebarProjectItem(project).visual}
              canEditProject={actions?.canEdit ?? false}
              trashed={trash}
              moveTargets={groups.map((group) => ({
                id: group.id,
                title: group.name,
              }))}
              onNavigate={() => onOpen(project.id)}
              onRename={(name) => actions?.onRename(project.id, name)}
              onDelete={() => actions?.onTrash(project.id)}
              deleteDisabledReason={actions?.trashDisabledReason(project.id)}
              onRestore={() => actions?.onRestore(project.id)}
              onMoveToFolder={(id) =>
                actions?.onMove(project.id, id || undefined)
              }
              onMoveNewFolder={() =>
                actions?.onCreateGroup(project.name, project.id)
              }
            />
            <span>
              {new Date(project.updatedAt).toLocaleDateString("zh-CN")} ·{" "}
              {trash ? "垃圾箱" : "本地项目"} · {project.items.length}{" "}
              个画布节点
            </span>
          </div>
        ))}
      </div>
      {!visible.length && (
        <div className="catalog-empty" role="status">
          <span className="catalog-empty-mark" aria-hidden="true">
            ⌕
          </span>
          <p>
            {search
              ? "没有找到匹配的项目"
              : trash
                ? "垃圾箱为空，项目移入后可在这里恢复。"
                : "还没有本地项目，点击“新建项目”开始创作。"}
          </p>
        </div>
      )}
    </div>
  );
}
