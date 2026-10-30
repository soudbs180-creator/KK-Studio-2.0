import BrandLogo from "./BrandLogo";
import type { RefObject } from "react";
import { appPlatform, appVersion } from "../runtime/appInfo";

export default function AccountPopup({
  onOpenSettings,
  popupRef,
}: {
  onOpenSettings: (
    section?: "general" | "updates" | "account" | "usage",
  ) => void;
  popupRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={popupRef}
      className="account-popup"
      aria-label="个人信息（本地会话）"
      data-node-id="312:2436"
    >
      <div className="account-identity">
        <span className="account-logo logo">
          <BrandLogo variant="app" />
        </span>
        <div>
          <strong>本地使用</strong>
          <p>未登录 · 账号服务尚未接入</p>
        </div>
      </div>
      <div className="account-popup-actions">
        <button
          type="button"
          className="kk-button kk-button--secondary"
          onClick={() => onOpenSettings("account")}
        >
          <img src="/design/figma/account-user.svg" alt="" />
          个人主页
        </button>
        <button
          type="button"
          className="kk-button kk-button--secondary"
          disabled
          title="退出登录暂未接入"
        >
          <img src="/design/figma/account-logout.svg" alt="" />
          退出登录
        </button>
      </div>
      <div className="account-credit-panel" aria-label="积分与订阅">
        <span className="account-credit-balance-label">余额积分</span>
        <div className="account-credit-points" title="积分服务尚未接入">
          <BrandLogo variant="credit" />
          <b>未报告</b>
        </div>
        <div className="account-subscription-row">
          <span>订阅</span>
        </div>
        <button
          type="button"
          className="account-badge"
          onClick={() => onOpenSettings("usage")}
        >
          套餐与积分
        </button>
      </div>
      <div className="account-popup-row account-theme-row">
        <div className="account-popup-row-label">
          <img src="/design/figma/account-theme-icon.svg" alt="" />
          <span>主题</span>
        </div>
        <button
          type="button"
          className="account-theme-button kk-button kk-button--secondary"
          aria-label="打开主题设置"
          onClick={() => onOpenSettings("general")}
        >
          外观设置
        </button>
      </div>
      <div className="account-popup-row account-version-row">
        <div className="account-popup-row-label">
          <img src="/design/figma/account-update.svg" alt="" />
          <span>
            {appPlatform()} · v{appVersion}
          </span>
        </div>
        <button
          type="button"
          className="kk-button kk-button--secondary"
          title="打开软件更新设置"
          onClick={() => onOpenSettings("updates")}
        >
          <img src="/design/figma/account-refresh.svg" alt="" />
          查看
        </button>
      </div>
    </div>
  );
}
