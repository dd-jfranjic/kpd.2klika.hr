import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface SubscriptionCancelledEmailProps {
  name: string;
  planName: string;
  endDate: string;
  reactivateUrl?: string;
}

export function SubscriptionCancelledEmail({
  name = 'Korisniče',
  planName = 'Pro',
  endDate = '31. prosinca 2025.',
  reactivateUrl = 'https://kpd.2klika.hr/pricing',
}: SubscriptionCancelledEmailProps) {
  return (
    <BaseLayout preview="Potvrda otkazivanja pretplate">
      <Text style={headingStyle}>Pretplata je otkazana</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        Vaša {planName} pretplata je uspješno otkazana. Žao nam je što odlazite!
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section
        style={{
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text style={{ ...textStyle, margin: '0', color: '#92400E' }}>
          <strong>Važno:</strong> Zadržat ćete pristup svim {planName}{' '}
          značajkama do <strong>{endDate}</strong>.
        </Text>
      </Section>

      <Text style={textStyle}>Nakon tog datuma:</Text>

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Vaš račun će se prebaciti na besplatni plan
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Limit upita će se smanjiti na 3 dnevno
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Povijest upita će ostati sačuvana
        </Text>
        <Text style={{ ...textStyle, margin: '0', paddingLeft: '16px' }}>
          • Možete ponovo aktivirati pretplatu bilo kada
        </Text>
      </Section>

      <Text style={textStyle}>
        Predomislili ste se? Možete ponovo aktivirati pretplatu u bilo kojem
        trenutku:
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={reactivateUrl} style={buttonStyle}>
          Ponovo aktiviraj pretplatu
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Ako imate bilo kakve povratne informacije o tome kako možemo poboljšati
        uslugu, rado bismo ih čuli! Pišite nam na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>

      <Text style={{ ...mutedTextStyle, marginTop: '16px' }}>
        Hvala što ste bili naš korisnik.
        <br />
        Tim AI KPD Klasifikatora
      </Text>
    </BaseLayout>
  );
}

export default SubscriptionCancelledEmail;
