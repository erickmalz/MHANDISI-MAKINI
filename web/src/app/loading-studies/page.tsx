import type { Metadata } from "next";

import { FoundationRiseLoader, SurveySweepLoader } from "@/components/PageLoaders";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Loading animation studies — Mhandisi Makini",
  description: "Two Mhandisi Makini page-loading animation concepts.",
};

export default function LoadingStudiesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="page-title">
        <p className={styles.eyebrow}>Motion studies</p>
        <h1 className={styles.title} id="page-title">
          Page loading loops
        </h1>
        <p className={styles.intro}>
          Two distinct loading directions that preserve the Mhandisi Makini mark
          and use calm, site-inspired movement.
        </p>

        <div className={styles.grid}>
          <article className={styles.study}>
            <header className={styles.studyHeader}>
              <h2 className={styles.studyTitle}>1. Survey sweep</h2>
              <p className={styles.studyCopy}>
                A precise circular scan for light, everyday workspace screens.
              </p>
            </header>
            <div className={styles.studyDemo}>
              <SurveySweepLoader />
            </div>
          </article>

          <article className={styles.study}>
            <header className={styles.studyHeader}>
              <h2 className={styles.studyTitle}>2. Foundation rise</h2>
              <p className={styles.studyCopy}>
                A phased build-up for charcoal splash screens and transitions.
              </p>
            </header>
            <div className={styles.studyDemo}>
              <FoundationRiseLoader />
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
