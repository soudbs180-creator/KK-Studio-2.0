import type {
  MobileCanvasOperation,
  MobileCanvasNode,
} from "../core/mobileModel.ts";
export const canvasKindLabels: Record<MobileCanvasNode["kind"], string> = {
  text: "文字",
  image: "图片",
  video: "视频",
  audio: "音频",
  file: "文件",
};
export const canvasOperationLabels: Record<
  MobileCanvasOperation["type"],
  string
> = {
  add_node: "添加节点",
  move_node: "移动节点",
  edit_text: "编辑文字",
  remove_node: "移除节点",
  add_edge: "连接节点",
  remove_edge: "移除连接",
  set_viewport: "设置视口",
};
