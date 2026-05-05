import Image from "next/image";
import styles from "./page.module.scss";

export default function Home() {
  return (
      <Image
          src="/omnibudget.svg"
          alt="Omnibudget"
          width={647}
          height={145}
          className={styles.hero}
      />
  );
}
