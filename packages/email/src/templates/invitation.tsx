import { Button, Section, Text } from '@react-email/components';
import * as React from 'react';
import {
  BaseLayout,
  buttonStyle,
  headingStyle,
  textStyle,
  mutedTextStyle,
} from './base-layout';

interface InvitationEmailProps {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  expiresIn?: string;
}

export function InvitationEmail({
  inviterName = 'Kolega',
  workspaceName = 'Moja Tvrtka',
  inviteUrl = 'https://kpd.2klika.hr/invite/accept?token=xxx',
  expiresIn = '7 dana',
}: InvitationEmailProps) {
  return (
    <BaseLayout preview={`${inviterName} vas poziva u ${workspaceName}`}>
      <Text style={headingStyle}>Pozivnica za tim</Text>

      <Text style={textStyle}>Pozdrav,</Text>

      <Text style={textStyle}>
        <strong>{inviterName}</strong> vas poziva da se pridružite timu{' '}
        <strong>{workspaceName}</strong> na AI KPD Klasifikatoru.
      </Text>

      <Text style={textStyle}>
        Kao član tima moći ćete:
      </Text>

      <Section style={{ marginBottom: '24px' }}>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Koristiti zajedničke AI upite
        </Text>
        <Text style={{ ...textStyle, margin: '0 0 8px', paddingLeft: '16px' }}>
          • Dijeliti KPD klasifikacije s timom
        </Text>
        <Text style={{ ...textStyle, margin: '0', paddingLeft: '16px' }}>
          • Pristupiti povijesti upita tima
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Button href={inviteUrl} style={buttonStyle}>
          Prihvati pozivnicu
        </Button>
      </Section>

      <Text style={mutedTextStyle}>
        Ova pozivnica vrijedi {expiresIn}. Nakon toga ćete morati zatražiti novu
        pozivnicu.
      </Text>

      <Text style={{ ...mutedTextStyle, marginTop: '16px' }}>
        Ako ne poznajete osobu {inviterName} ili niste očekivali ovu pozivnicu,
        možete sigurno ignorirati ovaj email.
      </Text>
    </BaseLayout>
  );
}

export default InvitationEmail;
