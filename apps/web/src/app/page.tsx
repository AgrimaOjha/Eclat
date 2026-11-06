
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./landing.module.css";
import ThemeToggle from "./ThemeToggle";
const experiments = [
  {
    number: "01",
    name: "THE WAVEFORM",
    subtitle: "See what you hear.",
    description:
      "Explore the physical shape of a recording through interactive waveforms.",
    symbol: "∿",
    color: "#dba4c0",
  },
  {
    number: "02",
    name: "FREQUENCY WORLD",
    subtitle: "Beyond the visible.",
    description:
      "Reveal hidden frequencies through real Fourier analysis.",
    symbol: "≋",
    color: "#8fddc8",
  },
  {
    number: "03",
    name: "SOUND DNA",
    subtitle: "Two sounds. One story.",
    description:
      "Compare the acoustic signatures of two recordings.",
    symbol: "◎",
    color: "#e3b3ff",
  },
  {
    number: "04",
    name: "THE DIFFERENCE",
    subtitle: "Find what changes.",
    description:
      "Discover differences in signal level, spectral patterns, and texture.",
    symbol: "∆",
    color: "#f0b69c",
  },
  {
    number: "05",
    name: "ACOUSTIC INSIGHTS",
    subtitle: "Listen differently.",
    description:
      "Translate signal measurements into interpretable observations.",
    symbol: "✳",
    color: "#a9c5ef",
  },
];

export default function Home() {
  const [active, setActive] = useState(2);
  const [menuOpen, setMenuOpen] = useState(false);

  const selected = experiments[active];

  function move(direction: number) {
    setActive((previous) => (
      previous + direction + experiments.length
    ) % experiments.length);
  }

  function getPosition(index: number) {
    const count = experiments.length;
    const distance =
      (index - active + count) % count;

    if (distance === 0) return "center";
    if (distance === 1) return "right";
    if (distance === count - 1) return "left";
    if (distance === 2) return "farRight";
    return "farLeft";
  }

  return (
    <main className={styles.site}>
      <div className={styles.ambientGlow} />

      {/* NAVIGATION */}
      <header className={styles.nav}>
        <Link href="/" className={styles.logo}>
          ÉCLAT<span>.</span>
        </Link>

        <nav
          className={
            menuOpen
              ? `${styles.links} ${styles.linksOpen}`
              : styles.links
          }
          aria-label="Primary navigation"
        >
          <Link href="/" onClick={() => setMenuOpen(false)}>
            EXPLORE
          </Link>
          <Link href="/lab" onClick={() => setMenuOpen(false)}>
            THE LAB
          </Link>
          <a
            href="#experiments"
            onClick={() => setMenuOpen(false)}
          >
            EXPERIMENTS
          </a>
        </nav>

        <div className={styles.navActions}>
          <ThemeToggle />
          <Link href="/lab" className={styles.enterButton}>
            ENTER THE LAB <span>↗</span>
          </Link>

          <button
            className={styles.menuButton}
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroTopline}>
          <span>AN EXPERIMENT IN LISTENING</span>
          <span>CREATIVE AUDIO INTELLIGENCE / 001</span>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.heroLabel}>
            WELCOME TO THE OTHER SIDE OF SOUND
          </p>

          <h1>
            SOUND IS
            <span className={styles.heroSecondLine}>
              <em>ALIVE.</em>
            </span>
          </h1>

          <p className={styles.heroDescription}>
            Every frequency has a fingerprint.
            Every recording has a hidden world.
            An interactive laboratory for
            discovering the science inside sound.
          </p>

          <Link
            href="/lab"
            className={styles.primaryLink}
          >
            START EXPLORING
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* DECORATIVE SOUND SCULPTURE */}
        <div
          className={styles.sculpture}
          aria-hidden="true"
        >
          <div className={styles.sculptureOuter} />
          <div className={styles.sculptureMiddle} />
          <div className={styles.sculptureInner} />
          <div className={styles.sculptureCore} />
        </div>

        <div className={styles.heroBottom}>
          <span>01 / THE ARRIVAL</span>
          <a href="#experiments">
            DISCOVER THE EXPERIMENTS ↓
          </a>
        </div>
      </section>

      {/* INTERACTIVE EXPERIMENT CAROUSEL */}
      <section
        className={styles.experimentSection}
        id="experiments"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              02 / THE COLLECTION
            </p>
            <h2>
              Choose your
              <br />
              <em>frequency.</em>
            </h2>
          </div>

          <p>
            Five ways to explore the
            invisible architecture of sound.
          </p>
        </div>

        <div
          className={styles.carousel}
          aria-label="Sound experiments"
        >
          <div className={styles.carouselStage}>
            {experiments.map((item, index) => {
              const position = getPosition(index);

              return (
                <button
                  type="button"
                  key={item.number}
                  onClick={() => setActive(index)}
                  className={`${styles.experimentCard} ${
                    styles[position]
                  }`}
                  style={{
                    borderColor:
                      position === "center"
                        ? item.color
                        : undefined,
                  }}
                  aria-pressed={index === active}
                  aria-label={`Select ${item.name}`}
                >
                  <span className={styles.cardNumber}>
                    ÉCLAT / {item.number}
                  </span>

                  <div
                    className={styles.cardArtwork}
                    style={{
                      color: item.color,
                    }}
                  >
                    <span>{item.symbol}</span>
                  </div>

                  <div className={styles.cardInfo}>
                    <span>{item.name}</span>
                    <h3>{item.subtitle}</h3>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous experiment"
            >
              ←
            </button>

            <div className={styles.carouselCounter}>
              <span>
                {String(active + 1).padStart(2, "0")}
              </span>
              <span> / 05</span>
            </div>

            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next experiment"
            >
              →
            </button>
          </div>
        </div>

        <div className={styles.selectedInfo}>
          <div>
            <span className={styles.eyebrow}>
              SELECTED EXPERIMENT
            </span>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
          </div>

          <Link href="/lab" className={styles.exploreLink}>
            EXPERIENCE THIS ↗
          </Link>
        </div>
      </section>

      {/* FINAL INVITATION */}
      <section className={styles.outro}>
        <p className={styles.eyebrow}>
          THE LABORATORY IS OPEN
        </p>

        <h2>
          LISTEN.
          <br />
          <em>DIFFERENTLY.</em>
        </h2>

        <Link href="/lab" className={styles.outroButton}>
          ENTER ÉCLAT ↗
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>© ÉCLAT — THE SOUND LABORATORY</span>
        <span>MADE FOR CURIOUS EARS</span>
      </footer>
    </main>
  );
}
