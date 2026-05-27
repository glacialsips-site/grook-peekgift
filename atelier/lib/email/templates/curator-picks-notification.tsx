type PickItem = {
  cardTitle: string;
  cardDescription?: string | null;
  cardImageUrl?: string | null;
  sourceUrl?: string | null;
  recipientNote?: string | null;
  begMessage?: string | null;
};

type Props = {
  curatorName: string | null;
  recipientName: string | null;
  peekUrl: string;
  picks: PickItem[];
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

const pickWrapperStyle: Record<string, string> = {
  border: '1px solid #2a2438',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  background: '#100e1a',
};

const pickTitleStyle: Record<string, string> = {
  fontSize: '18px',
  lineHeight: '1.25',
  margin: '0 0 8px',
  fontWeight: '600',
  color: '#fbf7ee',
};

const pickDescriptionStyle: Record<string, string> = {
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 14px',
  color: '#a59eb3',
};

const pickImageStyle: Record<string, string> = {
  display: 'block',
  width: '100%',
  maxWidth: '480px',
  borderRadius: '10px',
  marginBottom: '14px',
  border: '1px solid #2a2438',
};

const quoteStyle: Record<string, string> = {
  fontSize: '14px',
  lineHeight: '1.55',
  margin: '0 0 14px',
  color: '#fbf7ee',
  borderLeft: '3px solid #ff7a59',
  paddingLeft: '14px',
  whiteSpace: 'pre-wrap',
};

const quoteLabelStyle: Record<string, string> = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#7c7589',
  marginBottom: '4px',
  fontWeight: '600',
};

const orderButtonStyle: Record<string, string> = {
  display: 'inline-block',
  padding: '10px 18px',
  borderRadius: '999px',
  background: '#ff7a59',
  color: '#0b0a14',
  fontWeight: '600',
  textDecoration: 'none',
  fontSize: '14px',
};

const openPeekLinkStyle: Record<string, string> = {
  display: 'inline-block',
  padding: '14px 22px',
  borderRadius: '999px',
  background: 'transparent',
  color: '#ff7a59',
  fontWeight: '600',
  textDecoration: 'none',
  fontSize: '15px',
  border: '1px solid #ff7a59',
};

const footerStyle: Record<string, string> = {
  fontSize: '12px',
  color: '#7c7589',
  marginTop: '24px',
  textAlign: 'center',
};

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function CuratorPicksNotificationEmail({
  curatorName,
  recipientName,
  peekUrl,
  picks,
}: Props) {
  const greetingName = curatorName?.trim().split(' ')[0] ?? 'there';
  const recipient = recipientName?.trim() || 'Your recipient';
  const recipientFirst = recipient.split(' ')[0] || recipient;
  const pickedWord = picks.length === 1 ? 'a pick' : `${picks.length} picks`;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>
          {recipient} made {pickedWord} on your Peek.
        </h1>
        <p style={paragraphStyle}>Hi {greetingName},</p>
        <p style={paragraphStyle}>
          {recipientFirst} just picked from the Peek you put together. Here&rsquo;s what they want
          &mdash; tap &ldquo;Order&rdquo; on any of them to go straight to the source.
        </p>

        {picks.map((pick, idx) => {
          const domain = pick.sourceUrl ? extractDomain(pick.sourceUrl) : null;
          const orderLabel = domain ? `Order on ${domain}` : 'Order this';
          return (
            <div key={idx} style={pickWrapperStyle}>
              {pick.cardImageUrl ? (
                <img
                  src={pick.cardImageUrl}
                  alt={pick.cardTitle}
                  style={pickImageStyle}
                />
              ) : null}
              <h2 style={pickTitleStyle}>{pick.cardTitle}</h2>
              {pick.cardDescription ? (
                <p style={pickDescriptionStyle}>{pick.cardDescription}</p>
              ) : null}
              {pick.recipientNote ? (
                <div style={{ marginBottom: '14px' }}>
                  <span style={quoteLabelStyle}>{recipientFirst} said</span>
                  <p style={quoteStyle}>{pick.recipientNote}</p>
                </div>
              ) : null}
              {pick.begMessage ? (
                <div style={{ marginBottom: '14px' }}>
                  <span style={quoteLabelStyle}>Beg note</span>
                  <p style={quoteStyle}>{pick.begMessage}</p>
                </div>
              ) : null}
              {pick.sourceUrl ? (
                <a href={pick.sourceUrl} style={orderButtonStyle}>
                  {orderLabel}
                </a>
              ) : null}
            </div>
          );
        })}

        <p style={{ ...paragraphStyle, marginTop: '24px' }}>
          <a href={peekUrl} style={openPeekLinkStyle}>
            Open the Peek
          </a>
        </p>
      </div>
      <div style={footerStyle}>peek.gift &middot; we&rsquo;ll keep you posted</div>
    </div>
  );
}

export default CuratorPicksNotificationEmail;
