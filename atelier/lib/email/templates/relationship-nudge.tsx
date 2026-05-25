type Props = {
  recipientName: string;
  relationship: string | null;
  kind: 'birthday' | 'anniversary';
  upcomingDate: string;
  hadPriorPeek: boolean;
  curatorDisplayName: string | null;
};

const containerStyle: Record<string, string> = {
  backgroundColor: '#0b0a14',
  color: '#fbf7ee',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 24px',
  maxWidth: '560px',
  margin: '0 auto',
};

const cardStyle: Record<string, string> = {
  background: '#15131f',
  borderRadius: '16px',
  padding: '32px',
  border: '1px solid #2a2438',
};

const headingStyle: Record<string, string> = {
  fontSize: '24px',
  lineHeight: '1.2',
  letterSpacing: '-0.01em',
  margin: '0 0 16px',
  fontWeight: '700',
};

const paragraphStyle: Record<string, string> = {
  fontSize: '16px',
  lineHeight: '1.55',
  margin: '0 0 18px',
  color: '#d8d2c4',
};

const buttonStyle: Record<string, string> = {
  display: 'inline-block',
  padding: '14px 22px',
  borderRadius: '999px',
  background: '#ff7a59',
  color: '#0b0a14',
  fontWeight: '600',
  textDecoration: 'none',
  fontSize: '15px',
};

const footerStyle: Record<string, string> = {
  fontSize: '12px',
  color: '#7c7589',
  marginTop: '24px',
  textAlign: 'center',
};

export function RelationshipNudgeEmail({
  recipientName,
  relationship,
  kind,
  upcomingDate,
  hadPriorPeek,
  curatorDisplayName,
}: Props) {
  const greeting = curatorDisplayName?.split(' ')[0] ?? 'there';
  const firstName = recipientName.split(' ')[0] ?? recipientName;
  const relationLabel = relationship ? ` (${relationship})` : '';
  const opener =
    kind === 'birthday'
      ? `${firstName}'s birthday${relationLabel} is in 2 weeks — ${formatDate(upcomingDate)}.`
      : `${firstName}'s anniversary${relationLabel} is in 2 weeks — ${formatDate(upcomingDate)}.`;
  const memory = hadPriorPeek
    ? `Last year you built ${firstName} a Peek. Want to start the next one?`
    : `Two weeks is enough lead time to make something they'll actually keep.`;
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>Hey {greeting},</h1>
        <p style={paragraphStyle}>{opener}</p>
        <p style={paragraphStyle}>{memory}</p>
        <p style={{ ...paragraphStyle, marginBottom: '24px' }}>
          <a href="https://peek.gift/build" style={buttonStyle}>
            Start a new Peek
          </a>
        </p>
        <p style={paragraphStyle}>
          We&rsquo;ll send one of these a couple weeks out — never more than twice a year per
          person.
        </p>
      </div>
      <div style={footerStyle}>peek.gift &middot; we remember so you don&rsquo;t have to</div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default RelationshipNudgeEmail;
