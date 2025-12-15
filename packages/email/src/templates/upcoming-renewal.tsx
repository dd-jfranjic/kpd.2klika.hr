import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface UpcomingRenewalEmailProps {
  name: string;
  planName: string;
  amount: string;
  currency?: string;
  renewalDate: string;
  billingUrl?: string;
}

export function UpcomingRenewalEmail({
  name = 'Korisniče',
  planName = 'Pro',
  amount = '9,99',
  currency = 'EUR',
  renewalDate = '1. siječnja 2026.',
  billingUrl = 'https://kpd.2klika.hr/settings/billing',
}: UpcomingRenewalEmailProps) {
  return (
    <BaseLayout preview={`Nadolazeće obnavljanje pretplate - ${renewalDate}`}>
      <Text style={headingStyle}>Nadolazeće obnavljanje pretplate</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Ovo je prijateljski podsjetnik da će se vaša {planName} pretplata
        automatski obnoviti za nekoliko dana.
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section
        style={{
          backgroundColor: '#F0FDF4',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Plan:</strong> {planName}
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Iznos:</strong> {amount} {currency}
        </Text>
        <Text style={{ ...textStyle, margin: '0' }}>
          <strong>Datum obnavljanja:</strong> {renewalDate}
        </Text>
      </Section>

      <Text style={textStyle}>
        Ako želite nastaviti koristiti {planName} plan, ne trebate ništa učiniti
        - pretplata će se automatski obnoviti.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={billingUrl} style={buttonStyle}>
          Upravljaj pretplatom
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Ako želite otkazati ili promijeniti plan, to možete učiniti u postavkama
        računa do datuma obnavljanja.
      </Text>

      <Text style={{ ...mutedTextStyle, marginTop: '16px' }}>
        Za dodatna pitanja, kontaktirajte nas na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>
    </BaseLayout>
  );
}

export default UpcomingRenewalEmail;
