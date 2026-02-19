import { fadeIn, drawLine, fadePin, spinAnimation, typingAnimation } from '@/lib/animationStyles';
import { useTranslations } from 'next-intl';

export default function AuthLeftPanel() {
  const t = useTranslations()
  return ( 
    <div className="hidden lg:flex lg:w-[40%] border-r border-gray-200 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12]">
        <svg width="100%" height="100%">
          <line x1="0" y1="10%" x2="100%" y2="10%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#2C3580" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#A7B34F" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#134565" strokeWidth="1.5" strokeDasharray="10,6" />
          <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#A7B34F" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#2C3580" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="0" y1="90%" x2="100%" y2="90%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />

          <line x1="10%" y1="0" x2="10%" y2="100%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#2C3580" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#A7B34F" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#134565" strokeWidth="1.5" strokeDasharray="10,6" />
          <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#A7B34F" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#2C3580" strokeWidth="1" strokeDasharray="8,6" />
          <line x1="90%" y1="0" x2="90%" y2="100%" stroke="#134565" strokeWidth="1" strokeDasharray="8,6" />
        </svg>
      </div>


      <div className="relative z-10 flex flex-col w-full h-full">
        <div className="text-center pt-12 pb-8">
          <div className="inline-block overflow-hidden">
            <h1 className="text-7xl font-bold tracking-tight mb-2 overflow-hidden whitespace-nowrap border-r-4 border-ocean-blue pr-1" style={typingAnimation}>
              <span
                className="text-heading">
                {t('shared.maplytics')}
              </span>
            </h1>
          </div>
          <p className="text-body-text text-xl font-medium pt-6 mb-8" style={fadeIn('2.5s')}>
            {t('auth.leftPanel.subtitle')}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center pb-16" style={fadeIn('3s')}>
          <div className="relative w-[60%] max-w-[550px]">
            {/* Animated pin lines — scales with the Earth */}
            <div className="absolute -inset-[30%] pointer-events-none z-0">
              <svg width="100%" height="100%" viewBox="0 0 650 650">
                <defs>
                  <style>{`
                    @keyframes drawLine {
                      0% { stroke-dashoffset: 400; opacity: 0; }
                      5% { opacity: 0.8; }
                      20%, 95% { stroke-dashoffset: 0; opacity: 0.8; }
                      100% { stroke-dashoffset: 0; opacity: 0; }
                    }
                    @keyframes fadePin {
                      0%, 15% { opacity: 0; }
                      20% { opacity: 1; }
                      95% { opacity: 1; }
                      100% { opacity: 0; }
                    }
                  `}</style>

                  <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#134565" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#134565" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#134565" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2C3580" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#2C3580" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#2C3580" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A7B34F" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#A7B34F" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#A7B34F" stopOpacity="0.4" />
                  </linearGradient>

                  <g id="pinNavy">
                    <circle cx="0" cy="0" r="12" fill="#134565" opacity="0.25">
                      <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <path d="M0,-22 C-6,-22 -11,-17 -11,-11 C-11,-4 0,6 0,6 C0,6 11,-4 11,-11 C11,-17 6,-22 0,-22 Z" fill="#134565" stroke="#0E3147" strokeWidth="2" />
                    <circle cx="0" cy="-11" r="4.5" fill="white" />
                  </g>
                  <g id="pinPurple">
                    <circle cx="0" cy="0" r="12" fill="#2C3580" opacity="0.25">
                      <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <path d="M0,-22 C-6,-22 -11,-17 -11,-11 C-11,-4 0,6 0,6 C0,6 11,-4 11,-11 C11,-17 6,-22 0,-22 Z" fill="#2C3580" stroke="#1F2760" strokeWidth="2" />
                    <circle cx="0" cy="-11" r="4.5" fill="white" />
                  </g>
                  <g id="pinGreen">
                    <circle cx="0" cy="0" r="12" fill="#A7B34F" opacity="0.25">
                      <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <path d="M0,-22 C-6,-22 -11,-17 -11,-11 C-11,-4 0,6 0,6 C0,6 11,-4 11,-11 C11,-17 6,-22 0,-22 Z" fill="#A7B34F" stroke="#8A9440" strokeWidth="2" />
                    <circle cx="0" cy="-11" r="4.5" fill="white" />
                  </g>
                </defs>

                <line x1="325" y1="45" x2="591" y2="213" stroke="url(#navyGrad)" strokeWidth="4" strokeDasharray="400" strokeLinecap="round" style={drawLine('0s')} />
                <g transform="translate(325, 45)" style={fadePin('0s')}><use href="#pinNavy" /></g>

                <line x1="591" y1="213" x2="490" y2="558" stroke="url(#purpleGrad)" strokeWidth="4" strokeDasharray="400" strokeLinecap="round" style={drawLine('2.4s')} />
                <g transform="translate(591, 213)" style={fadePin('2.4s')}><use href="#pinPurple" /></g>

                <line x1="490" y1="558" x2="160" y2="558" stroke="url(#greenGrad)" strokeWidth="4" strokeDasharray="400" strokeLinecap="round" style={drawLine('4.8s')} />
                <g transform="translate(490, 558)" style={fadePin('4.8s')}><use href="#pinGreen" /></g>

                <line x1="160" y1="558" x2="59" y2="213" stroke="url(#navyGrad)" strokeWidth="4" strokeDasharray="400" strokeLinecap="round" style={drawLine('7.2s')} />
                <g transform="translate(160, 558)" style={fadePin('7.2s')}><use href="#pinNavy" /></g>

                <line x1="59" y1="213" x2="325" y2="45" stroke="url(#purpleGrad)" strokeWidth="4" strokeDasharray="400" strokeLinecap="round" style={drawLine('9.6s')} />
                <g transform="translate(59, 213)" style={fadePin('9.6s')}><use href="#pinPurple" /></g>
              </svg>
            </div>

            {/* Earth image */}
            <img
              src="/Earth.png"
              alt="Earth"
              className="relative z-10 w-full aspect-square object-contain"
              style={spinAnimation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
