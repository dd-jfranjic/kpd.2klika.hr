import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const theme = {
  primaryColor: '#6B9B76',
  textColor: '#111827',
  mutedColor: '#6B7280',
  backgroundColor: '#F9FAFB',
  borderColor: '#E5E7EB',
};

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: theme.backgroundColor,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 20px',
          }}
        >
          {/* Header */}
          <Section
            style={{
              textAlign: 'center' as const,
              marginBottom: '32px',
            }}
          >
            <Text
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: theme.primaryColor,
                margin: 0,
              }}
            >
              AI KPD Klasifikator
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: `1px solid ${theme.borderColor}`,
              padding: '32px',
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section
            style={{
              textAlign: 'center' as const,
              marginTop: '32px',
            }}
          >
            <Hr style={{ borderColor: theme.borderColor, margin: '24px 0' }} />
            <Text
              style={{
                fontSize: '12px',
                color: theme.mutedColor,
                margin: 0,
              }}
            >
              2 KLIKA obrt | Zagreb, Hrvatska
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: theme.mutedColor,
                margin: '8px 0 0',
              }}
            >
              <Link
                href="https://kpd.2klika.hr"
                style={{ color: theme.primaryColor }}
              >
                kpd.2klika.hr
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle = {
  backgroundColor: theme.primaryColor,
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
  fontWeight: '500' as const,
  fontSize: '14px',
};

export const headingStyle = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: theme.textColor,
  margin: '0 0 16px',
};

export const textStyle = {
  fontSize: '14px',
  color: theme.textColor,
  lineHeight: '24px',
  margin: '0 0 16px',
};

export const mutedTextStyle = {
  fontSize: '12px',
  color: theme.mutedColor,
  lineHeight: '20px',
  margin: '0',
};
