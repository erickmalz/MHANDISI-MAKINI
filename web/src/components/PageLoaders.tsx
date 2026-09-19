import Image from "next/image";

import styles from "./PageLoaders.module.css";

type LoaderProps = {
  label?: string;
};

/**
 * Light-surface loader: a measured survey sweep circles the mark while the
 * wordless construction symbol settles into place.
 */
export function SurveySweepLoader({ label = "Loading your site" }: LoaderProps) {
  return (
    <div className={styles.surveyLoader} role="status" aria-live="polite">
      <div className={styles.surveyMark} aria-hidden="true">
        <span className={styles.surveyOrbit} />
        <span className={styles.surveyOrbitInner} />
        <Image
          className={styles.symbol}
          src="/brand/logo-symbol.png"
          alt=""
          width={96}
          height={96}
          priority
        />
      </div>
      <span className="sr-only">{label}. Please wait.</span>
    </div>
  );
}

/**
 * Dark-surface loader: the structure rises in short, steady construction
 * phases while the reversed brand symbol remains fully legible.
 */
export function FoundationRiseLoader({ label = "Preparing your workspace" }: LoaderProps) {
  return (
    <div className={styles.foundationLoader} role="status" aria-live="polite">
      <div className={styles.foundationMark} aria-hidden="true">
        <span className={styles.riseLine} />
        <span className={styles.riseLine} />
        <span className={styles.riseLine} />
        <Image
          className={styles.symbol}
          src="/brand/logo-symbol-reversed.png"
          alt=""
          width={96}
          height={96}
          priority
        />
      </div>
      <div className={styles.foundationProgress} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className={styles.darkLabel}>{label}</p>
      <span className="sr-only">{label}. Please wait.</span>
    </div>
  );
}
