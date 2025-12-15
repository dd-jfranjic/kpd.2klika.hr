import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresIn?: string;
}

export function PasswordResetEmail({
  name = 'Korisniče',
  resetUrl = 'https://kpd.2klika.hr/reset-password?token=xxx',
  expiresIn = '1 sat',
}: PasswordResetEmailProps) {
  return (
    <BaseLayout preview="Zahtjev za reset lozinke">
      <Text style={headingStyle}>Reset lozinke</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Primili smo zahtjev za promjenu lozinke vašeg računa na AI KPD
        Klasifikatoru. Kliknite na gumb ispod za postavljanje nove lozinke:
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={resetUrl} style={buttonStyle}>
          Postavi novu lozinku
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Ovaj link vrijedi {expiresIn}. Nakon toga ćete morati zatražiti novi
        link za reset lozinke.
      </Text>

      <Text style={{ ...textStyle, marginTop: '24px' }}>
        Ako niste zatražili promjenu lozinke, možete sigurno ignorirati ovaj
        email. Vaša lozinka ostaje nepromijenjena.
      </Text>

      <Text style={mutedTextStyle}>
        Iz sigurnosnih razloga, nikada nikome ne prosljeđujte ovaj email niti
        dijelite link za reset lozinke.
      </Text>
    </BaseLayout>
  );
}

export default PasswordResetEmail;
