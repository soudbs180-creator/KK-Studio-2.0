// automatic JSX 运行时:esbuild/tsc 的 `jsxImportSource` 指向本包时,
// TSX 会被编译成对本模块 jsx()/jsxs() 的调用。这里统一转发到宿主 React.createElement,
// 让插件写纯 TSX、无需手动 `const { React } = runtime`,同时 react 全程 external。

import type * as React from "react";

import { getReact } from "./runtime";

// Fragment 哨兵:渲染时才解析为宿主 React.Fragment,避免模块顶层触碰运行时。
export const Fragment = Symbol.for("infinite-canvas.jsx.fragment") as unknown as React.ExoticComponent<{ children?: React.ReactNode }>;

function createElement(type: unknown, props: Record<string, unknown> | null, key?: unknown, staticChildren = false): React.ReactElement {
    const react = getReact();
    const resolvedType = type === Fragment ? react.Fragment : type;
    // automatic 运行时已把 children 放进 props;key 单独传入以避免展开 key 警告。
    const config = key === undefined ? props : { ...(props ?? {}), key };
    // React validates positional static siblings; a single array remains a
    // dynamic list and correctly requires keys during DOM reconciliation.
    if (staticChildren && Array.isArray(props?.children)) {
        return react.createElement(resolvedType as never, config as never, ...props.children as React.ReactNode[]);
    }
    return react.createElement(resolvedType as never, config as never);
}

export function jsx(type: unknown, props: Record<string, unknown> | null, key?: unknown): React.ReactElement {
    return createElement(type, props, key);
}

// jsxs 用于编译器确定的静态多子节点,保留 React 的静态校验语义。
export function jsxs(type: unknown, props: Record<string, unknown> | null, key?: unknown): React.ReactElement {
    return createElement(type, props, key, true);
}

// 让 `jsxImportSource` 指向本包的编译器能从这里取到 JSX 内建标签类型(复用 @types/react)。
export namespace JSX {
    export type Element = React.JSX.Element;
    export type ElementType = React.JSX.ElementType;
    export type ElementClass = React.JSX.ElementClass;
    export type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    export type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    export type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    export type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    export type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    export type IntrinsicElements = React.JSX.IntrinsicElements;
}
