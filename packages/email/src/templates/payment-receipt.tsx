import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface PaymentReceiptEmailProps {
  name: string;
  planName: string;
  amount: string;
  currency?: string;
  invoiceNumber: string;
  invoiceDate: string;
  nextBillingDate?: string;
  invoiceUrl?: string;
}

export function PaymentReceiptEmail({
  name = 'Korisniče',
  planName = 'Pro',
  amount = '9,99',
  currency = 'EUR',
  invoiceNumber = 'INV-2025-001',
  invoiceDate = '13. prosinca 2025.',
  nextBillingDate = '13. siječnja 2026.',
  invoiceUrl = 'https://kpd.2klika.hr/settings/billing',
}: PaymentReceiptEmailProps) {
  return (
    <BaseLayout preview={`Potvrda plaćanja - ${invoiceNumber}`}>
      <Text style={headingStyle}>Potvrda plaćanja</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Hvala na plaćanju! Vaša uplata je uspješno obrađena.
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Broj računa:</strong> {invoiceNumber}
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Datum:</strong> {invoiceDate}
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Plan:</strong> {planName}
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px' }}>
          <strong>Iznos:</strong> {amount} {currency}
        </Text>
        {nextBillingDate && (
          <Text style={{ ...textStyle, margin: '0' }}>
            <strong>Sljedeće naplaćivanje:</strong> {nextBillingDate}
          </Text>
        )}
      </Section>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={invoiceUrl} style={buttonStyle}>
          Pregledaj račun
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Račun možete preuzeti u PDF formatu iz postavki računa. Za dodatna
        pitanja o naplati, kontaktirajte nas na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>
    </BaseLayout>
  );
}

export default PaymentReceiptEmail;
