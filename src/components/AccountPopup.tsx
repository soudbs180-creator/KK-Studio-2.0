import BrandLogo from "./BrandLogo";
import UiIcon from "./UiIcon";
import type { RefObject } from "react";
import { appPlatform, appVersion } from "../runtime/appInfo";
import { isEnabled } from "../app/featureFlags.ts";
import type { AccountProfile } from "../features/account/index.ts";

export default function AccountPopup({
  onOpenSettings,
  popupRef,
  profile,
}: {
  onOpenSettings: (
    section?: "general" | "updates" | "account" | "usage",
  ) => void;
  popupRef: RefObject<HTMLDivElement>;
  profile: AccountProfile;
}) {
  const showCloudCredits = isEnabled("creditsCloud");
  return (
    <div
      ref={popupRef}
      className="account-popup"
      aria-label="个人信息（本地登录）"
      data-node-id="312:2436"
    >
      <div className="account-identity">
        <span className="account-logo logo" aria-hidden="true">
          {profile.avatarInitials || <BrandLogo variant="app" />}
        </span>
        <div>
          <strong>{profile.displayName}</strong>
          <p>本地登录 · 资料仅保存在本机</p>
        </div>
      </div>
      <div className="account-popup-actions">
        <button
          type="button"
          className="kk-button kk-button--secondary"
          onClick={() => onOpenSettings("account")}
        >
          <UiIcon name="user-round" size={16} />
          个人主页
        </button>
        <button
          type="button"
          className="kk-button kk-button--secondary"
          disabled
          title="本地登录无需退出；云端账号后续版本开放"
        >
          <UiIcon name="log-out" size={16} />
          退出登录
        </button>
      </div>
      <div className="account-credit-panel" aria-label="本地用量">
        <span className="account-credit-balance-label">
          {showCloudCredits ? "余额积分" : "本机用量"}
        </span>
        <div
          className="account-credit-points"
          title={
            showCloudCredits
              ? "云端积分服务"
              : "本地模式不展示云端余额；详见套餐与积分"
          }
        >
          <BrandLogo variant="credit" />
          <b>{showCloudCredits ? "未报告" : "本地模式"}</b>
        </div>
        <div className="account-subscription-row">
          <span>{showCloudCredits ? "订阅" : "无云端套餐"}</span>
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
          <UiIcon name="sun-moon" size={16} />
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
          <UiIcon name="circle-arrow-up" size={16} />
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
          <UiIcon name="refresh-cw" size={16} />
          查看
        </button>
      </div>
    </div>
  );
}
