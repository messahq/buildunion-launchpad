import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Linkedin, Twitter, Youtube, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const socialLinks = [
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Mail, href: "#", label: "Email" },
];

const BuildUnionFooter = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) => {
  const { t } = useTranslation();

  const footerLinks = {
    product: [
      { label: t("footer.pricing"), href: "/buildunion/pricing" },
      { label: t("footer.workspace"), href: "/buildunion/workspace" },
    ],
    company: [
      { label: t("footer.about"), href: "/buildunion/about" },
      { label: t("footer.community"), href: "/buildunion/community" },
      { label: t("footer.members"), href: "/buildunion/members" },
      { label: t("footer.contact"), href: "/buildunion/contact" },
    ],
    legal: [
      { label: t("footer.privacy"), href: "/buildunion/privacy" },
      { label: t("footer.terms"), href: "/buildunion/terms" },
      { label: t("footer.security"), href: "/buildunion/security" },
    ],
  };

  return (
    <footer ref={ref} {...props} className="bg-secondary text-foreground border-t border-border transition-colors">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/buildunion" className="inline-block mb-4">
              <span className="text-2xl font-display font-light tracking-tight">
                <span className="text-foreground">Build</span>
                <span className="text-amber-500">Union</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-full bg-muted hover:bg-amber-500 hover:text-white text-muted-foreground flex items-center justify-center transition-colors duration-200"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
              {t("footer.product")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
              {t("footer.company")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-foreground font-semibold text-sm uppercase tracking-wider mb-4">
              {t("footer.legal")}
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-amber-500 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BuildUnion. {t("footer.copyright")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("footer.craftedWith")}
          </p>
        </div>
      </div>
    </footer>
  );
});

BuildUnionFooter.displayName = "BuildUnionFooter";

export default BuildUnionFooter;