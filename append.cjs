
const fs = require('fs');
const content = \

function ValuePropositionStrip({ language }: { language: PricingLanguage }) {
  const ar = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);

  const valueProps = [
    {
      icon: '??',
      ar: '????? ????????',
      en: 'Cinematic Gear',
      value: ar ? '?????? ??????' : 'Included',
      descAr: '?????? ???? ??????? ???? ?????? ???????? ????? ???? ????? ?????.',
      descEn: 'We use the latest Sony cameras and professional lighting.'
    },
    {
      icon: '??',
      ar: '??? ???? (Storytelling)',
      en: 'Storytelling',
      value: ar ? '????? ??????' : 'Creative',
      descAr: '??? ?? ???? ?? ???????? ???? ?? ???? ??? ???? ????? ????? ???????.',
      descEn: 'We don\\'t just shoot, we craft stories that sell.'
    },
    {
      icon: '??',
      ar: '?????? ??????',
      en: 'Transportation',
      value: ar ? '????? (???? ?????)' : 'Covered (Amman)',
      descAr: '?? ???? ???? ?? ???? ????? ?????? ?????????? ???? ???????.',
      descEn: 'No need to worry about hidden transport fees inside the capital.'
    }
  ];

  return (
    <div 
      style={{ display: 'block', marginTop: 16, padding: isOpen ? 24 : 16, background: 'rgba(244,153,33,0.03)', borderRadius: 12, border: '1px dashed rgba(244,153,33,0.2)', cursor: 'pointer', transition: 'all 0.3s ease' }} 
      onClick={() => setIsOpen(!isOpen)}
    >
      {!isOpen ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f49921', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>?</span> 
            <strong style={{ fontWeight: 800 }}>{ar ? '????? ???? ????? ???? ??????' : 'Why us & What\\'s included?'}</strong> 
            <span style={{ opacity: 0.8, color: '#f0ece4' }}>
              {ar ? '????? ???????? · ???? ????? · ???? ?????' : 'Cinematic gear · Free transport · High quality'}
            </span>
          </div>
          <span style={{ fontSize: 13, whiteSpace: 'nowrap', marginLeft: 16, fontWeight: 600 }}>{ar ? '??? ???????? ?' : 'View details ?'}</span>
        </div>
      ) : (
        <div style={{ opacity: 1, transition: 'opacity 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: '#f49921', fontWeight: 800 }}>{ar ? '????? ???? ????? ???? ??????' : 'Why us & What\\'s included?'}</h2>
            <span style={{ color: '#000', fontSize: 13, padding: '4px 8px', background: '#f49921', borderRadius: 4, fontWeight: 'bold' }}>{ar ? '????? ?' : 'Hide ?'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {valueProps.map((prop) => (
              <article key={prop.en} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(244,153,33,0.1)' }}>
                <span style={{ display: 'block', fontSize: 24, marginBottom: 8 }}>{prop.icon}</span>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 15, color: '#f0ece4', fontWeight: 700 }}>{ar ? prop.ar : prop.en}</h3>
                <strong style={{ display: 'block', color: '#f49921', marginBottom: 4 }}>{prop.value}</strong>
                <p style={{ margin: 0, fontSize: 13, color: '#9b948a', lineHeight: 1.5 }}>{ar ? prop.descAr : prop.descEn}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
\;
fs.appendFileSync('src/components/RateCardExperience.tsx', content, 'utf8');
\
