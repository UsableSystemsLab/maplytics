import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.jsx"
import { useTranslations } from 'next-intl';

export default function FeatureOverview() {
  const t = useTranslations('landing.features');
  const title = t('title');
  const cards = t.raw('cards');

  return (
    <section className="ml-96 mr-56 mb-32 mt-80 border-t-2 pt-16 border-gray-200">
      <h2 className="text-5xl font-bold mb-12 text-[#333334]">{title}</h2>
      <div className="cards flex flex-wrap gap-8">
        {cards.map((card, index) => (
          <Card key={index} className="min-h-96 max-w-96 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="text-4xl flex justify-center mt-4 text-center">
              <CardTitle className="font-bold">
                {t.rich(`cards.${index}.title`, {
                  highlight: (chunks) => <span className="text-[#A7B34F]">{chunks}</span>,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-[#5C5C5C] text-2xl text-center">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
