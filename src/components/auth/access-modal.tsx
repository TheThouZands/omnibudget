"use client";

import { type MouseEvent, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";

import { AccessFlow } from "./access-flow";
import styles from "./access-modal.module.scss";

export function AccessModal() {
  const t = useTranslations("Auth");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={t("modalLabel")}
      onClick={handleBackdropClick}
      onClose={() => router.back()}
    >
      <div className={styles.surface}>
        <button
          className={styles.closeButton}
          type="button"
          aria-label={t("close")}
          onClick={closeDialog}
        >
          <span aria-hidden="true" />
        </button>
        <AccessFlow />
      </div>
    </dialog>
  );
}
