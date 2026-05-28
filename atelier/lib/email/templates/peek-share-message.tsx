type Props = {
  fromName: string | null;
  message: string;
  shareUrl: string;
  recipientName: string | null;
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

const quoteStyle: Record<string, string> = {
  fontSize: '16px',
  lineHeight: '1.55',
  margin: '0 0 24px',
  color: '#fbf7ee',
  borderLeft: '3px solid #ff7a59',
  paddingLeft: '16px',
  whiteSpace: 'pre-wrap',
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

export function PeekShareMessageEmail({
  fromName,
  message,
  shareUrl,
  recipientName,
}: Props) {
  const sender = fromName?.trim() || 'A friend';
  const greeting = recipientName?.trim()
    ? `Hi ${recipientName.split(' ')[0]},`
    : 'Hi,';
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>{sender} sent you a Peek.</h1>
        <p style={paragraphStyle}>{greeting}</p>
        {message ? <p style={quoteStyle}>{message}</p> : null}
        <p style={{ ...paragraphStyle, marginBottom: '24px' }}>
          <a href={shareUrl} style={buttonStyle}>
            Open your Peek
          </a>
        </p>
        <p style={paragraphStyle}>
          A Peek is a small, hand-curated gift page. Take a look when you have a minute.
        </p>
      </div>
      <div style={footerStyle}>peek.gift</div>
    </div>
  );
}

export default PeekShareMessageEmail;
