type Props = {
  recipientName: string | null;
  occasion: string | null;
  shareUrl: string;
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
  fontSize: '28px',
  lineHeight: '1.15',
  letterSpacing: '-0.02em',
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

export function PeekPublishedEmail({ recipientName, occasion, shareUrl }: Props) {
  const recipient = recipientName?.trim() || 'them';
  const occasionLine = occasion ? ` for ${occasion}` : '';
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>
          {recipient}&rsquo;s Peek is live{occasionLine}.
        </h1>
        <p style={paragraphStyle}>
          You did the hard part. Now send it. The link below opens the Peek you made &mdash; share it
          however {recipient.split(' ')[0] || 'they'} will actually open it.
        </p>
        <p style={{ ...paragraphStyle, marginBottom: '24px' }}>
          <a href={shareUrl} style={buttonStyle}>
            Open the Peek
          </a>
        </p>
        <p style={paragraphStyle}>
          A few moves that tend to land:
        </p>
        <ul style={{ ...paragraphStyle, paddingLeft: '20px', marginBottom: '8px' }}>
          <li style={{ marginBottom: '8px' }}>
            Drop it in your text thread with no context. The mystery does the work.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Send it the morning of, not the night before.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Resist the urge to explain. Let the page do the explaining.
          </li>
        </ul>
        <p style={{ ...paragraphStyle, marginTop: '24px' }}>
          We&rsquo;ll let you know when {recipient.split(' ')[0] || 'they'} opens it and picks.
        </p>
      </div>
      <div style={footerStyle}>
        peek.gift &middot; gifts that feel like you actually thought about it
      </div>
    </div>
  );
}

export default PeekPublishedEmail;
