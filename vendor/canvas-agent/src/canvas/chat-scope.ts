export interface ChatScope {
    projectId: string;
    chatId: string | null;
    epoch: string;
}

export function parseChatScope(value: unknown): ChatScope {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("聊天 scope 缺失，请更新并重新连接。");
    const scope = value as Record<string, unknown>;
    const id = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 160 && !/[\u0000-\u001f\u007f]/.test(value);
    if (!id(scope.projectId) || !(scope.chatId === null || id(scope.chatId)) || !id(scope.epoch)) throw new Error("聊天 scope 身份无效。");
    return { projectId: scope.projectId as string, chatId: scope.chatId as string | null, epoch: scope.epoch as string };
}

export function sameScope(a: ChatScope | undefined, b: ChatScope | undefined): boolean {
    return Boolean(a && b && a.projectId === b.projectId && a.chatId === b.chatId && a.epoch === b.epoch);
}

export function sameChat(a: ChatScope, b: ChatScope): boolean {
    return a.projectId === b.projectId && a.chatId === b.chatId;
}
