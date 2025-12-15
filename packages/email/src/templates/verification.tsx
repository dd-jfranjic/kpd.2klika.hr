import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface VerificationEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerificationEmail({
  name = 'Korisniče',
  verifyUrl = 'https://kpd.2klika.hr/verify-email?token=xxx',
}: VerificationEmailProps) {
  return (
    <BaseLayout preview="Potvrdite svoju email adresu">
      <Text style={headingStyle}>Potvrdite email adresu</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Hvala što ste se registrirali na AI KPD Klasifikator! Molimo potvrdite
        svoju email adresu klikom na gumb ispod:
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={verifyUrl} style={buttonStyle}>
          Potvrdi email adresu
        </Button>
      </Section>

      <Text style={textStyle}>
        Nakon potvrde moći ćete pristupiti svim značajkama AI KPD Klasifikatora
        i započeti s klasifikacijom vaših proizvoda i usluga.
      </Text>

      <Text style={mutedTextStyle}>
        Ako niste kreirali račun na AI KPD Klasifikatoru, možete sigurno
        ignorirati ovaj email.
      </Text>
    </BaseLayout>
  );
}

export default VerificationEmail;
