import { ServiceError } from "../services/httpClient.ts";
const messages: Record<string, string> = {
  AUTH_REQUIRED:
    "服务身份验证失败，请检查登录会话或此连接的凭据。设备草稿和原件保留。",
  HTTPS_REQUIRED: "连接需要 HTTPS。开发构建仅允许本机回环 HTTP 地址。",
  INVALID_SERVICE_URL: "服务地址不正确；地址不能包含凭据、查询参数或片段。",
  IDENTITY_ORIGIN_REQUIRED: "身份服务地址应只包含协议和域名，不带接口路径。",
  INVALID_IDENTITY_RESPONSE:
    "服务返回的数据不符合手机会话协议，请核对身份服务部署。",
  JSON_RESPONSE_REQUIRED:
    "服务未返回所需数据格式。网页能打开不代表手机接口已经部署。",
  REQUEST_TIMEOUT:
    "连接超时，请检查网络与服务。已提交的生成是否受理仍须核对，不会自动重试。",
  REQUEST_ABORTED: "已停止连接。已提交任务是否取消仍须核对。",
  NETWORK_OR_PROTOCOL_ERROR:
    "连接失败或返回格式不受支持，请检查网络与服务地址。已提交请求不会自动重试。",
  CANCELLED_BEFORE_SUBMISSION: "请求在提交前停止，未发起生成。",
  PROVIDER_CREDENTIAL_REQUIRED:
    "此设备没有该连接的 Key，请在模型连接中重新保存。",
  GATEWAY_TOKEN_REQUIRED: "此设备没有 Gateway 应用令牌，请重新保存连接。",
  REFERENCE_INPUT_UNAVAILABLE:
    "当前适配器尚不支持参考素材；不会忽略参考后提交。",
  TEXT_CAPABILITY_UNAVAILABLE: "此连接没有启用可执行的文本端点。",
  IMAGE_CAPABILITY_UNAVAILABLE: "此连接没有启用可执行的图片端点。",
  IMAGE_COUNT_UNAVAILABLE: "请求数量超过此连接支持范围，请检查图片数量。",
  IMAGE_SIZE_UNAVAILABLE: "当前端点不支持这个尺寸。",
  IMAGE_ORIGINAL_RETRIEVAL_FAILED:
    "生成接口已返回，但原图取回失败，尚未自动保存。图片地址可能受跨域限制或已失效；请核对任务，不会自动再次付费生成。",
  SESSION_CHANGED_AFTER_SUBMISSION:
    "会话已变化。回执保留，重新登录提交账号后再恢复。",
  SUBMISSION_ALREADY_STARTED: "这个请求已启动，请先核对任务，避免重复提交。",
};
export function userError(error: unknown): string {
  if (error instanceof ServiceError) {
    if (messages[error.code]) return messages[error.code];
    if (error.code === "HTTP_ERROR")
      return error.status === 404
        ? "服务未提供此接口（404），请核对服务地址与部署。"
        : `服务返回错误${error.status ? `（${error.status}）` : ""}，请检查连接与权限。已提交任务仍须核对。`;
    if (/IMAGE|ORIGINAL|RETRIEVAL/.test(error.code))
      return "图片回执或原件取回失败。已有内容保留，请到任务页核对和恢复。";
    if (/STREAM|SSE|TEXT/.test(error.code))
      return "文字响应没有完整结束。已收到的文字仍保留，提交状态须核对。";
    return "服务请求未完成。请检查连接并在任务详情核对已提交请求。";
  }
  const message = error instanceof Error ? error.message : "";
  if (/conflict/i.test(message))
    return "保存版本冲突，内容保留。请先重新读取设备存储，再继续操作。";
  if (/frozen|readback|corrupt|disk full/i.test(message))
    return "设备存储读取、校验或写入失败，现有内容未清空。请恢复存储后重试归档。";
  if (/unresolved/i.test(message))
    return "项目或连接含未完成及未核对任务，须先处理。";
  if (/referenced/i.test(message))
    return "原件仍被项目、任务、草稿或衍生作品引用，不能删除。";
  return /[\u4e00-\u9fff]/.test(message) && message.length <= 500
    ? message
    : "操作未完成，现有内容保留。请检查权限、连接或设备存储后重试。";
}
