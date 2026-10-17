function selectInitialWebEntry({ href, userAgent, width }) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["/", "/index.html"].includes(url.pathname) ||
    url.searchParams
      .getAll("view")
      .some((value) => value.toLowerCase() === "desktop")
  )
    return null;
  const phone =
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|webOS|BlackBerry/i.test(
      userAgent ?? "",
    );
  const narrow = Number.isFinite(width) && width > 0 && width <= 767;
  return phone || narrow ? `/mobile/${url.search}${url.hash}` : null;
}

// Decide before the Desktop module starts; never redirect a live editor on resize.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const target = selectInitialWebEntry({
    href: window.location.href,
    userAgent: window.navigator.userAgent,
    width: document.documentElement.clientWidth || window.innerWidth,
  });
  if (target) window.location.replace(target);
}
