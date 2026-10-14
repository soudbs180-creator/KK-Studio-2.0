import BrandLogo from "./BrandLogo";
import type { RefObject } from "react";
import { appVersion } from "../runtime/appInfo";

export default function AccountPopup({
  onOpenSettings,
  popupRef,
}: {
  onOpenSettings: (section?: "general" | "updates") => void;
  popupRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={popupRef}
      className="account-popup"
      aria-label="个人信息（本地 Prototype）"
      data-node-id="312:2436"
    >
      <div className="account-identity">
        <span className="account-logo logo">
          <BrandLogo variant="app" />
        </span>
        <div>
          <strong>YYYKK</strong>
          <p title="本地演示账号 UID，不代表真实账号">
            UID：308311652306456581
          </p>
        </div>
      </div>
      <div className="account-popup-actions">
        <button
          type="button"
          className="kk-button kk-button--secondary"
          disabled
          title="账号切换暂未接入"
        >
          <img src="/design/figma/account-user.svg" alt="" />
          切换账号
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
      <div
        className="account-credit-panel"
        aria-label="积分与订阅（本地演示数据）"
      >
        <span className="account-credit-balance-label">余额积分</span>
        <div
          className="account-credit-points"
          title="本地演示余额，不代表真实积分"
        >
          <BrandLogo variant="credit" />
          <b>1000</b>
        </div>
        <div className="account-subscription-row">
          <span>订阅</span>
        </div>
        <span className="account-badge">普通用户</span>
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
          <span>版本更新 v{appVersion}</span>
        </div>
        <button
          type="button"
          className="kk-button kk-button--secondary"
          title="打开软件更新设置"
          onClick={() => onOpenSettings("updates")}
        >
          <img src="/design/figma/account-refresh.svg" alt="" />
          检测
        </button>
      </div>
    </div>
  );
}
