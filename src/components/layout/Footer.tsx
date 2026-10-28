import { getDictionary } from "@/i18n";

export function Footer() {
  const { footer } = getDictionary();
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p className="site-footer__sales">
          <span className="site-footer__sales-line">{footer.tagline}</span>
          <span className="site-footer__sales-credit">
            {footer.poweredBy} <strong>ScanMenu.</strong>
          </span>
        </p>
      </div>
    </footer>
  );
}
