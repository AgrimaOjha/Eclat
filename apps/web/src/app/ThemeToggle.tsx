
"use client";

import { useTheme } from "./ThemeProvider";
import styles from "./themeToggle.module.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        isDark ? "Light mode" : "Dark mode"
      }
    >
      <span
        className={styles.icon}
        aria-hidden="true"
      >
        {isDark ? "☀" : "☾"}
      </span>

      <span className={styles.label}>
        {isDark ? "LIGHT" : "DARK"}
      </span>
    </button>
  );
}
