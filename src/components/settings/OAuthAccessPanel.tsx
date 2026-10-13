export default function OAuthAccessPanel({
  hidden = false,
}: {
  hidden?: boolean;
}) {
  return (
    <section
      className="model-access-config-panel model-access-unavailable"
      aria-label="OAuth 配置"
      id="model-access-panel-oauth"
      hidden={hidden}
    >
      <div className="model-access-config-heading">
        <div>
          <h3>OAuth</h3>
          <p>授权登录会在本机完成，当前授权桥接尚未接入。</p>
        </div>
        <span className="model-access-config-status">待接入</span>
      </div>
      <p>
        账号授权、回调和会话保存由本地运行时统一处理；当前不会打开第三方登录页，也不会伪造已登录状态。
      </p>
      <button
        type="button"
        className="settings-action secondary"
        disabled
        title="OAuth 授权桥接尚未接入"
      >
        开始授权
      </button>
    </section>
  );
}
