import Link from "next/link";
import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "Games | Brandon Stryker",
  description: "A little learning, a little luck, and lots of play. Pick a game for your next adventure.",
};

const games = [
  {title: "Tiny Learners", icon: "ABC", description: "Eight playful activities for letters, numbers, shapes, and sounds.", color: "from-emerald-100 to-sky-100", href: "/games/tiny-learners", detail: "Learn & explore"},
  {title: "Candy Land", icon: "🍭", description: "A sweet adventure along a rainbow of colors.", color: "from-pink-100 to-purple-100", detail: "A colorful adventure"},
  {title: "Chutes and Ladders", icon: "🪜", description: "Climb up, slide down, and enjoy the journey.", color: "from-amber-100 to-orange-100", href: "/games/lobby", detail: "A little luck"},
  {title: "Tic Tac Toe", icon: "✕ ○", description: "Two players. Nine squares. Can you get three in a row?", color: "from-sky-100 to-indigo-100", detail: "Think ahead"},
  {title: "Connect Four", icon: "🔴 🟡", description: "Drop a disc and plan your path to four in a row.", color: "from-yellow-100 to-rose-100", detail: "Make your move"},
];

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#fef9c3,transparent_60%),linear-gradient(to_bottom,#ecfdf5,#eff6ff)] pb-16" style={{fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif'}}>
      <div className="container">
        <nav className="py-6" aria-label="Back navigation">
          <Link href="/" className="inline-flex rounded-full border border-slate-300 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-sky-600">← Back to portfolio</Link>
        </nav>
        <header className="pb-10 pt-6 sm:pt-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-600">The play room</p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">Pick your next adventure.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">A little learning, a little luck, and lots of play. Find a favorite and let the fun begin.</p>
        </header>
        <Link href="/games/lobby" className="mb-8 inline-flex rounded-full bg-blue-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Host or join a game →</Link>
        <section aria-label="Choose a game" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const content = <>
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden="true" className="flex h-20 min-w-20 items-center justify-center rounded-2xl border-2 border-white bg-white/60 px-3 text-3xl font-black tracking-tight shadow-sm">{game.icon}</span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">{game.href ? "Play now" : "Coming soon"}</span>
              </div>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">{game.detail}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">{game.title}</h2>
              <p className="mt-3 flex-1 leading-relaxed text-slate-700">{game.description}</p>
              <span className="mt-7 text-sm font-bold text-slate-700">{game.href ? "Let’s play →" : "More fun on the way"}</span>
            </>;
            const className = `flex flex-col rounded-3xl border-2 border-white bg-gradient-to-br ${game.color} p-7 text-left shadow-[0_8px_0_rgba(15,23,42,0.07),0_16px_30px_rgba(15,23,42,0.06)]`;
            return game.href ? (
              <Link key={game.title} href={game.href} className={`${className} transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-sky-600 motion-reduce:transform-none motion-reduce:transition-none`}>{content}</Link>
            ) : (
              <article key={game.title} className={className}>{content}</article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
