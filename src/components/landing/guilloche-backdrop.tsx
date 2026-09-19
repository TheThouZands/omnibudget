import Image from "next/image";

import styles from "./guilloche-backdrop.module.scss";

export function GuillocheBackdrop() {
  return (
    <div className={styles.crop} aria-hidden="true">
      <Image
        src="/guilloche.svg"
        alt=""
        width={240}
        height={500}
        sizes="(max-aspect-ratio: 1/1) 300vw, 120vw"
        className={styles.artwork}
        preload
        unoptimized
      />
    </div>
  );
}
