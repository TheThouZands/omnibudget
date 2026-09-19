import Image from "next/image";

import styles from "./guilloche-backdrop.module.scss";

type Props = {
  placement?: "hero" | "closing";
};

export function GuillocheBackdrop({ placement = "hero" }: Props) {
  return (
    <div
      className={`${styles.crop} ${placement === "closing" ? styles.closing : ""}`}
      aria-hidden="true"
    >
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
