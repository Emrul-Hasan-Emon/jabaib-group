export function SiteFooter() {
  return (
    <footer className="mt-16 bg-topbar text-topbar-foreground">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <h3 className="mb-2 text-base font-extrabold">Jabaib</h3>
          <p className="text-white/70">
            Clothing brand crafted in Bangladesh — quality wear for everyday
            life.
          </p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Quick links</h4>
          <ul className="space-y-1 text-white/70">
            <li>Home</li>
            <li>Shop</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Support</h4>
          <ul className="space-y-1 text-white/70">
            <li>info@jabaib.com</li>
            <li>+880 1XXX-XXXXXX</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-white/60">
        © {new Date().getFullYear()} Jabaib Clothing Brand. All rights reserved.
      </p>
    </footer>
  );
}
