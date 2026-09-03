import sys

file_path = r'C:\Users\ahmad\.gemini\antigravity\scratch\haddad-rate-card\src\components\RateCardExperience.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Helper components
content = content.replace(
    'function StaggerItem({ children, delayIndex = 0 }: { children: React.ReactNode, delayIndex?: number }) {',
    '''function ScrambleText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const chars = "!<>-_\\\\/[]{}—=+*^?#________";
  
  useEffect(() => {
    let frame: number;
    let iteration = 0;
    
    const tick = () => {
      setDisplayText(text.split("").map((letter, index) => {
        if (index < iteration) {
          return text[index];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      
      if (iteration >= text.length) {
        cancelAnimationFrame(frame);
      } else {
        iteration += 1 / 3;
        frame = requestAnimationFrame(tick);
      }
    };
    
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  
  return <span>{displayText}</span>;
}

function MagneticButton({ children, onClick, className }: { children: React.ReactNode, onClick: () => void, className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (e.clientX - (left + width / 2)) * 0.2;
    const y = (e.clientY - (top + height / 2)) * 0.2;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  
  const handleMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = '';
    }
  };
  
  return (
    <button ref={ref} onClick={onClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className} style={{ transition: "transform 0.1s ease-out" }}>
      {children}
    </button>
  );
}

function StaggerItem({ children, delayIndex = 0 }: { children: React.ReactNode, delayIndex?: number }) {'''
)

# 2. State and handlers
content = content.replace(
    '  const [currency, setCurrency] = useState<"JOD" | "USD">("JOD");\n  const [isSticky, setIsSticky] = useState(false);',
    '  const [currency, setCurrency] = useState<"JOD" | "USD">("JOD");\n  const [isSticky, setIsSticky] = useState(false);\n  const [showFab, setShowFab] = useState(false);'
)

# 2b. scroll handler and mouse move
old_scroll = '''  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);'''
new_scroll = '''  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 150);
      setShowFab(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleServicesMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cards = document.querySelectorAll('.spotlight-card');
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    }
  };'''
content = content.replace(old_scroll, new_scroll)

# 3. Ambient glow
old_div = '''  return (
    <div 
      className={`ratecard ${compact ? "ratecard--compact" : ""}`} 
      dir={rtl ? "rtl" : "ltr"}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >'''
new_div = '''  return (
    <div 
      className={`ratecard ${compact ? "ratecard--compact" : ""}`} 
      dir={rtl ? "rtl" : "ltr"}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ "--accent-rgb": hexToRgb(currentAccent) } as React.CSSProperties}
    >
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1,
        background: 'radial-gradient(circle at 50% 50%, rgba(var(--accent-rgb), 0.15), transparent 60%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        transition: 'background 1s ease',
        animation: 'moveGlow 10s ease-in-out infinite'
      }} />'''
content = content.replace(old_div, new_div)


# 4. Scramble text
content = content.replace(
    '<h1>{text("قائمة ", "Rate ")}<span>{text("التسعيرات", "Card")}</span></h1>',
    '<h1>{text("قائمة ", "Rate ")}<span><ScrambleText text={text("التسعيرات", "Card")} /></span></h1>'
)

# 5. CSS
old_css = '''        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ratecard__stage-enter {
            animation: fadeSlideIn 0.4s ease-out forwards;
          }
        `}</style>'''
new_css = '''        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ratecard__stage-enter {
            animation: fadeSlideIn 0.4s ease-out forwards;
          }
          @keyframes moveGlow {
            0% { transform: translate(-5%, -5%) scale(1); }
            50% { transform: translate(5%, 5%) scale(1.1); }
            100% { transform: translate(-5%, -5%) scale(1); }
          }
          button:active, .ratecard__region-pill:active, .spotlight-card:active {
            transform: scale(0.95);
            transition: transform 0.1s;
          }
          .spotlight-card::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: inherit;
            background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent 40%);
            opacity: 0;
            transition: opacity 500ms;
            pointer-events: none;
            z-index: 1;
          }
          .ratecard__services:hover .spotlight-card::before {
            opacity: 1;
          }
        `}</style>'''
content = content.replace(old_css, new_css)


# 6. Magnetic buttons
old_regions = '''            <div className="ratecard__regions">
              <button onClick={() => chooseRegion("irbid")}><MapPin /><strong>{text("إربد", "Irbid")}</strong><span>{text("شمال الأردن", "Northern Jordan")}</span></button>
              <button onClick={() => chooseRegion("amman")}><span className="ratecard__city-icon">🏙️</span><strong>{text("عمّان", "Amman")}</strong><span>{text("العاصمة", "The capital")}</span></button>
            </div>'''
new_regions = '''            <div className="ratecard__regions">
              <MagneticButton onClick={() => chooseRegion("irbid")}><MapPin /><strong>{text("إربد", "Irbid")}</strong><span>{text("شمال الأردن", "Northern Jordan")}</span></MagneticButton>
              <MagneticButton onClick={() => chooseRegion("amman")}><span className="ratecard__city-icon">🏙️</span><strong>{text("عمّان", "Amman")}</strong><span>{text("العاصمة", "The capital")}</span></MagneticButton>
            </div>'''
content = content.replace(old_regions, new_regions)


# 7. Spotlight handler on grid
content = content.replace(
    '            <div className="ratecard__services" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>',
    '            <div className="ratecard__services" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} onMouseMove={handleServicesMouseMove}>'
)


# 8. Spotlight card class
content = content.replace(
    'className="hover:-translate-y-1 group"',
    'className="hover:-translate-y-1 group spotlight-card"'
)


# 9. FAB
old_bottom = '''        )}
        </div>
      </main>

    </div>
  );'''
new_bottom = '''        )}
        </div>
      </main>

      {showFab && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: 24, right: rtl ? 'auto' : 24, left: rtl ? 24 : 'auto', zIndex: 100,
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%',
            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
          className="hover:bg-[rgba(255,255,255,0.2)] hover:scale-110"
        >
          ↑
        </button>
      )}
    </div>
  );'''
content = content.replace(old_bottom, new_bottom)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated successfully')
