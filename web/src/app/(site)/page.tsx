export default function CommonHomePage() {
  return (
    <section className="bg-gradient-to-br from-[hsl(var(--hero-gradient-start))] to-[hsl(var(--hero-gradient-end))]">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-4 py-24">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          New collection
        </span>
        <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-foreground">
          Everyday clothing, crafted in Bangladesh.
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Homepage sections, banners and product browsing will be built here in
          the user-panel phases.
        </p>
        <div className="flex gap-3">
          <a
            href="/user/login"
            className="rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90"
          >
            Shop now
          </a>
        </div>
      </div>
    </section>
  );
}
