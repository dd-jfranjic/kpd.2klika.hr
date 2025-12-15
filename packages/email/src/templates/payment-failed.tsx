import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface PaymentFailedEmailProps {
  name: string;
  planName: string;
  amount: string;
  currency?: string;
  failureReason?: string;
  retryDate?: string;
  updatePaymentUrl?: string;
}

export function PaymentFailedEmail({
  name = 'Korisniče',
  planName = 'Pro',
  amount = '9,99',
  currency = 'EUR',
  failureReason = 'Kartica je odbijena',
  retryDate = '16. prosinca 2025.',
  updatePaymentUrl = 'https://kpd.2klika.hr/settings/billing',
}: PaymentFailedEmailProps) {
  return (
    <BaseLayout preview="Neuspjelo plaćanje - potrebna akcija">
      <Text style={headingStyle}>Plaćanje nije uspjelo</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Nažalost, nismo uspjeli naplatiti vašu {planName} pretplatu u iznosu od{' '}
        {amount} {currency}.
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section
        style={{
          backgroundColor: '#FEF2F2',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            ...textStyle,
            color: '#DC2626',
            margin: '0 0 8px',
            fontWeight: 'bold',
          }}
        >
          Razlog neuspjeha:
        </Text>
        <Text style={{ ...textStyle, color: '#DC2626', margin: '0' }}>
          {failureReason}
        </Text>
      </Section>

      <Text style={textStyle}>
        Molimo ažurirajte podatke o plaćanju kako biste nastavili koristiti sve
        značajke {planName} plana.
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={updatePaymentUrl} style={buttonStyle}>
          Ažuriraj način plaćanja
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Automatski ćemo pokušati ponovo naplatiti {retryDate}. Ako ne ažurirate
        podatke o plaćanju do tada, vaša pretplata može biti obustavljena.
      </Text>

      <Text style={{ ...mutedTextStyle, marginTop: '16px' }}>
        Trebate pomoć? Kontaktirajte nas na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>
    </BaseLayout>
  );
}

export default PaymentFailedEmail;
