import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
} from './base-layout';

interface WelcomeEmailProps {
  name: string;
  loginUrl?: string;
}

export function WelcomeEmail({
  name = 'Korisniče',
  loginUrl = 'https://kpd.2klika.hr/login',
}: WelcomeEmailProps) {
  return (
    <BaseLayout preview="Dobrodošli u AI KPD Klasifikator!">
      <Text style={headingStyle}>Dobrodošli, {name}!</Text>

      <Text style={textStyle}>
        Hvala što ste se registrirali na AI KPD Klasifikator. Sada možete
        koristiti naprednu AI tehnologiju za pronalaženje točnih KPD šifri za
        vašu djelatnost.
      </Text>

      <Text style={textStyle}>Što možete raditi s KPD Klasifikatorom:</Text>

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Pretražujte 5.700+ KPD šifri pomoću AI-a
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Dobijte instant prijedloge za vašu djelatnost
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Pripremite se za Fiskalizaciju 2.0 (1.1.2026.)
        </Text>
        <Text style={{ ...textStyle, margin: '0', paddingLeft: '16px' }}>
          • Upravljajte svojim timom i pretplatom
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={loginUrl} style={buttonStyle}>
          Prijavite se
        </Button>
      </Section>

      <Text style={textStyle}>
        Ako imate bilo kakvih pitanja, slobodno nas kontaktirajte na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>

      <Text style={textStyle}>
        Srdačan pozdrav,
        <br />
        Tim AI KPD Klasifikatora
      </Text>
    </BaseLayout>
  );
}

export default WelcomeEmail;
