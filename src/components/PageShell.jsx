export default function PageShell({ children }) {
  return (
    <section className="mx-auto flex w-full flex-col gap-5 px-4 pb-16 pt-6 sm:px-6 lg:gap-6 lg:px-8 lg:pt-0">
      {children}
    </section>
  );
}
