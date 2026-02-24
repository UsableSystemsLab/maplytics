import { forwardRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.jsx"
import { useTranslations } from 'next-intl';

const FeatureOverview = forwardRef((props, ref) => {
  const t = useTranslations('landing.features');
  const title = t('title');
  const subtitle = t('subtitle');
  const cards = t.raw('cards');

  return (
    <section ref={ref} className="min-h-screen border-t-2 p-2 border-gray-200 container mx-auto flex flex-col items-center justify-center gap-10">
      <div className="text-center">
        <h2
          className="font-bold p-5 pb-10 text-black"
          style={{
            fontSize: 'calc(100vw / 6)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Maplytics
        </h2>
        <p className="text-xs md:text-base lg:text-2xl">{subtitle}</p>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h2 id="more" className="text-5xl font-bold mb-12 text-[#333334]">{title}</h2>
        <div className="cards flex flex-wrap gap-8">
          {cards.map((card, index) => (
            <Card key={index} className="min-h-96 max-w-96 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader className="text-4xl flex justify-center mt-4 text-center">
                <CardTitle className="font-bold">
                  {t.rich(`cards.${index}.title`, {
                    highlight1: (chunks) => <span className="text-ocean-blue">{chunks}</span>,
                    highlight2: (chunks) => <span className="text-earthy-green">{chunks}</span>,
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-body-text text-2xl text-center">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
});


export default FeatureOverview;
