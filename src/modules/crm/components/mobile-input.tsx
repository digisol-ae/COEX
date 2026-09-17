'use client';

import { useState } from 'react';
import { Input, Select } from '@/components/ui';
import { COUNTRIES, DEFAULT_COUNTRY, countryFor } from '../phone';

/**
 * Country beside the number, rather than a guess made from the digits.
 *
 * The dialling code is shown as the user types, so what will be stored is visible before saving.
 */
export function MobileInput({
  name = 'mobile',
  countryName = 'mobileCountry',
  defaultCountry = DEFAULT_COUNTRY,
  defaultValue = '',
}: {
  name?: string;
  countryName?: string;
  defaultCountry?: string;
  defaultValue?: string;
}) {
  const [country, setCountry] = useState(defaultCountry);

  return (
    <div className="flex gap-2">
      <Select
        name={countryName}
        value={country}
        onChange={(event) => setCountry(event.currentTarget.value)}
        className="max-w-36"
        aria-label="Country"
      >
        {COUNTRIES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.flag} {option.code} +{option.dialling}
          </option>
        ))}
      </Select>

      <Input
        name={name}
        defaultValue={defaultValue}
        placeholder={`50 123 4567`}
        inputMode="tel"
        className="flex-1"
        aria-label={`Mobile number in ${countryFor(country).name}`}
      />
    </div>
  );
}
