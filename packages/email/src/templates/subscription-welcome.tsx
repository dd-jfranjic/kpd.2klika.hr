import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface SubscriptionWelcomeEmailProps {
  name: string;
  planName: string;
  queryLimit: number;
  memberLimit: number | string;
  dashboardUrl?: string;
}

export function SubscriptionWelcomeEmail({
  name = 'Korisniče',
  planName = 'Pro',
  queryLimit = 250,
  memberLimit = 10,
  dashboardUrl = 'https://kpd.2klika.hr/dashboard',
}: SubscriptionWelcomeEmailProps) {
  return (
    <BaseLayout preview={`Dobrodošli u KPD ${planName} plan!`}>
      <Text style={headingStyle}>Dobrodošli u KPD {planName}!</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Hvala na nadogradnji na {planName} plan! Vaša pretplata je sada aktivna
        i imate pristup svim naprednim značajkama.
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Text style={{ ...headingStyle, fontSize: '16px' }}>
        Vaš {planName} plan uključuje:
      </Text>

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • {queryLimit} AI upita dnevno
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • {typeof memberLimit === 'number' ? `Do ${memberLimit}` : memberLimit}{' '}
          članova tima
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Prioritetna podrška
        </Text>
        <Text style={{ ...textStyle, margin: '0', paddingLeft: '16px' }}>
          • Pristup povijesti upita
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={dashboardUrl} style={buttonStyle}>
          Otvori Dashboard
        </Button>
      </Section>

      <Text style={textStyle}>
        Ako imate bilo kakvih pitanja o vašoj pretplati, slobodno nas
        kontaktirajte na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>

      <Text style={mutedTextStyle}>
        Vašu pretplatu možete u bilo kojem trenutku pregledati ili promijeniti u
        postavkama računa.
      </Text>
    </BaseLayout>
  );
}

export default SubscriptionWelcomeEmail;
