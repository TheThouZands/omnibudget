"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";
import { splitPhoneInput } from "@/modules/auth/client/phone-field";
import styles from "./access-flow.module.scss";

type Props = {
  country: CountryCode | "";
  countries: { code: CountryCode; name: string }[];
  disabled: boolean;
};

export function PhoneField({ country, countries, disabled }: Props) {
  const t = useTranslations("Auth.register");
  const [phone, setPhone] = useState("");
  const [override, setOverride] = useState<CountryCode | "">();
  // Follow the profile country only until a phone region is explicitly chosen.
  const region = override ?? country;

  return (
    <div className={styles.phoneField}>
      <div className={styles.phonePrefix}>
        <span aria-hidden="true">
          {region ? `+${getCountryCallingCode(region)}` : "+"}
          <span className={styles.pickerArrow}>▾</span>
        </span>
        <select
          id="access-phone-country"
          name="phoneCountry"
          aria-label={t("phoneCountry")}
          autoComplete="off"
          value={region}
          disabled={disabled}
          onChange={(event) => setOverride(event.target.value as CountryCode | "")}
        >
          <option value="">{t("noPhoneCountry")}</option>
          {countries.map(({ code, name }) => (
            <option key={code} value={code}>{name} (+{getCountryCallingCode(code)})</option>
          ))}
        </select>
      </div>
      <input
        id="access-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={40}
        disabled={disabled}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        onBlur={(event) => {
          const next = splitPhoneInput(event.target.value, region);
          setPhone(next.number);
          if (next.country !== region || next.number !== event.target.value) setOverride(next.country);
        }}
      />
    </div>
  );
}
