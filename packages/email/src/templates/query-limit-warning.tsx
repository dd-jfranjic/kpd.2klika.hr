import { Button, Section, Text, Hr } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface QueryLimitWarningEmailProps {
  name: string;
  usedQueries: number;
  totalQueries: number;
  percentUsed: number;
  resetDate: string;
  upgradeUrl?: string;
}

export function QueryLimitWarningEmail({
  name = 'Korisniče',
  usedQueries = 225,
  totalQueries = 250,
  percentUsed = 90,
  resetDate = 'sutra u ponoć',
  upgradeUrl = 'https://kpd.2klika.hr/pricing',
}: QueryLimitWarningEmailProps) {
  const isAlmostOut = percentUsed >= 90;
  const backgroundColor = isAlmostOut ? '#FEF2F2' : '#FEF3C7';
  const textColor = isAlmostOut ? '#DC2626' : '#92400E';

  return (
    <BaseLayout
      preview={`${percentUsed}% dnevnog limita iskorišteno`}
    >
      <Text style={headingStyle}>Upozorenje o limitu upita</Text>

      <Text style={textStyle}>Pozdrav {name},</Text>

      <Text style={textStyle}>
        {isAlmostOut
          ? 'Gotovo ste iskoristili dnevni limit AI upita!'
          : 'Približavate se dnevnom limitu AI upita.'}
      </Text>

      <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0' }} />

      <Section
        style={{
          backgroundColor,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: textColor,
            textAlign: 'center' as const,
            margin: '0 0 8px',
          }}
        >
          {usedQueries} / {totalQueries}
        </Text>
        <Text
          style={{
            fontSize: '14px',
            color: textColor,
            textAlign: 'center' as const,
            margin: '0',
          }}
        >
          upita iskorišteno ({percentUsed}%)
        </Text>
      </Section>

      <Text style={textStyle}>
        Vaš limit će se resetirati <strong>{resetDate}</strong>.
      </Text>

      <Text style={textStyle}>
        Ako vam treba više upita, razmislite o nadogradnji plana:
      </Text>

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • <strong>Pro plan</strong> - 250 upita dnevno
        </Text>
        <Text style={{ ...textStyle, margin: '0', paddingLeft: '16px' }}>
          • <strong>Enterprise plan</strong> - Neograničeni upiti
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={upgradeUrl} style={buttonStyle}>
          Nadogradi plan
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Ako imate pitanja o limitima ili planovima, kontaktirajte nas na{' '}
        <a href="mailto:podrska@kpd.2klika.hr" style={{ color: '#6B9B76' }}>
          podrska@kpd.2klika.hr
        </a>
        .
      </Text>
    </BaseLayout>
  );
}

export default QueryLimitWarningEmail;
