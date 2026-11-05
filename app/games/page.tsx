import Link from "next/link";
import type {Metadata} from "next";
import styles from "./lobby/lobby.module.css";

export const metadata: Metadata = {
  title: "Games | Brandon Stryker",
  description: "Host a party or join your friends, then choose a game to play together.",
};

export default function GamesPage() {
  return <main className={styles.page}>
    <div className={styles.wrap}>
      <Link href="/" className={styles.back}>← Back to portfolio</Link>
      <section className={styles.gamesWelcome}>
        <p className={styles.eyebrow}>The play room</p>
        <h1>Do You Want to Play a Game?</h1>
        <p>Gather your people. Start a party or join one with a room key, then choose your next adventure together.</p>
        <div className={styles.entryLinks}>
          <Link href="/games/lobby?mode=host"><span aria-hidden="true">🎉</span><strong>Host a game</strong><span>Create a party and share your key →</span></Link>
          <Link href="/games/lobby?mode=join"><span aria-hidden="true">👋</span><strong>Join a game</strong><span>Meet your friends with a room key →</span></Link>
        </div>
        <Link href="/solo-games" className={styles.soloLink}>Playing on your own? Explore solo games →</Link>
      </section>
    </div>
  </main>;
}
