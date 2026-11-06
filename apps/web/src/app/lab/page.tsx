
import Link from "next/link";
import AcousticLab from "../AcousticLab";
import ThemeToggle from "../ThemeToggle";

export default function LaboratoryPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--theme-bg)",
        color: "var(--theme-text)",
        transition:
          "background-color 300ms ease, color 300ms ease",
      }}
    >
      {/* =====================================
          LABORATORY NAVIGATION
      ===================================== */}

      <nav
        aria-label="Laboratory navigation"
        style={{
          position: "relative",
          zIndex: 10,

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",

          gap: 20,
          padding: "18px clamp(20px, 5vw, 80px)",

          background: "var(--theme-bg)",
          borderBottom: "1px solid var(--theme-border)",

          transition:
            "background-color 300ms ease, border-color 300ms ease",
        }}
      >
        {/* ÉCLAT LOGO */}

        <Link
          href="/"
          style={{
            color: "var(--theme-text)",
            fontSize: 26,
            fontFamily: "Georgia, serif",
            fontWeight: 500,
            letterSpacing: "-0.05em",
            textDecoration: "none",
          }}
        >
          ÉCLAT
          <span
            style={{
              color: "var(--theme-accent)",
            }}
          >
            .
          </span>
        </Link>

        {/* NAVIGATION ACTIONS */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* LIGHT / DARK TOGGLE */}

          <ThemeToggle />

          {/* RETURN TO HOMEPAGE */}

          <Link
            href="/"
            style={{
              color: "var(--theme-accent)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← BACK TO EXPLORE
          </Link>
        </div>
      </nav>

      {/* =====================================
          EXISTING ACOUSTIC LAB
      ===================================== */}

      <AcousticLab />
    </main>
  );
}
